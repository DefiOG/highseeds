// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface ILoudAccess is IERC721 {
    function isActivated(uint256 tokenId) external view returns (bool);
    function addXp(uint256 tokenId, uint64 amount) external returns (uint64);
    function accessData(uint256 tokenId) external view returns (uint64 xp, uint8 rarity, bool activated);
    function setActivated(uint256 tokenId, bool activated) external;
}

interface ILoudPlot is IERC721 {
    function capacityOf(uint256 tokenId) external view returns (uint8);
}

/// @title Loud Ledger Positions
/// @notice Escrows farmer NFTs and time-locks non-transferable maturity rewards.
/// @dev Settlement is O(1): elapsed checkpoints are calculated arithmetically and never iterated.
contract LoudPositions is AccessControl, Pausable, ReentrancyGuard, IERC721Receiver {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    uint256 public constant PROTOCOL_FEE = 0.000001 ether;
    uint64 public constant CHECKPOINT_SECONDS = 6 hours;
    uint32 public constant CONFIG_VERSION = 3;
    uint64 public constant XP_PER_CHECKPOINT = 50;
    uint256 public constant HC_PER_CHECKPOINT = 25;
    uint256 public constant ACTIVATION_HC = 4_200;
    uint256 public constant GENESIS_SIZE = 420;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant WORKER_SHARE_BPS = 6_500;
    uint16 public constant OWNER_SHARE_BPS = 3_500;

    struct Position {
        address player;
        address plotOwner;
        uint256 accessId;
        uint256 plotId;
        bytes32 strainId;
        uint64 startedAt;
        uint64 closedAt;
        uint8 durationSteps;
        uint8 settledSteps;
        uint16 playerShareBps;
        uint16 plotOwnerShareBps;
        bool worker;
        bool closed;
    }

    error InvalidAddress();
    error InvalidProtocolFee(uint256 expected, uint256 received);
    error InvalidDuration(uint8 durationSteps);
    error InvalidStrain();
    error InvalidMode();
    error AccessNotActivated(uint256 accessId);
    error AccessAlreadyInUse(uint256 accessId);
    error PlotAtCapacity(uint256 plotId);
    error WorkerAccessClosed(uint256 plotId);
    error NotPositionPlayer(uint256 positionId);
    error PositionAlreadyClosed(uint256 positionId);
    error PositionNotMature(uint256 positionId);
    error UnexpectedAccessTransfer();
    error AccessIsActive(uint256 accessId);
    error NothingToWithdraw();
    error FeeTransferFailed();
    error InsufficientGameCredits();
    error AlreadyActivated();

    event WorkerAccessChanged(uint256 indexed plotId, address indexed plotOwner, address indexed worker, bool enabled);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed player,
        address indexed plotOwner,
        uint256 accessId,
        uint256 plotId,
        bytes32 strainId,
        uint8 durationSteps,
        uint16 playerShareBps,
        uint16 plotOwnerShareBps,
        bool worker,
        uint64 startedAt,
        uint32 configVersion
    );
    event PositionClosed(
        uint256 indexed positionId,
        address indexed player,
        uint8 completedSteps,
        bool mature,
        bool emergency,
        uint64 closedAt
    );
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event UntrackedAccessRecovered(uint256 indexed accessId, address indexed recipient);
    event FarmerSpecialtyCommitted(uint256 indexed accessId, bytes32 specialty);
    event HarvestRewarded(uint256 indexed positionId, address indexed player, uint256 indexed accessId, uint64 xpAwarded, uint256 hcAwarded);
    event FarmerActivatedWithCredits(address indexed player, uint256 indexed accessId, uint256 spentHC);

    ILoudAccess public immutable accessToken;
    ILoudPlot public immutable plotToken;

    uint256 public nextPositionId = 1;
    uint256 public accruedFees;
    mapping(uint256 positionId => Position position) public positions;
    mapping(uint256 accessId => uint256 positionId) public activePositionForAccess;
    mapping(uint256 plotId => uint256 count) public activePositionCountByPlot;
    mapping(uint256 plotId => mapping(address worker => address approvingOwner)) private _workerApprovalOwner;
    mapping(uint256 accessId => bytes32 strainId) public farmerSpecialty;
    // Non-transferable, non-redeemable gameplay accounting. Deliberately not ERC-20.
    mapping(address player => uint256 balance) public gameCredits;
    bytes32 public immutable catalogHash;
    address private _expectedAccessFrom;
    uint256 private _expectedAccessId;

    constructor(address admin, address accessAddress, address plotAddress, bytes32[] memory initialStrains) {
        if (admin == address(0) || accessAddress == address(0) || plotAddress == address(0)) revert InvalidAddress();
        if (initialStrains.length != GENESIS_SIZE) revert InvalidStrain();
        catalogHash = keccak256(abi.encode(initialStrains));
        accessToken = ILoudAccess(accessAddress);
        plotToken = ILoudPlot(plotAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        for (uint256 i = 0; i < initialStrains.length; i++) {
            if (initialStrains[i] == bytes32(0)) revert InvalidStrain();
            farmerSpecialty[i + 1] = initialStrains[i];
            emit FarmerSpecialtyCommitted(i + 1, initialStrains[i]);
        }
    }

    function setWorkerAccess(uint256 plotId, address worker, bool enabled) external whenNotPaused {
        if (plotToken.ownerOf(plotId) != msg.sender) revert InvalidMode();
        if (worker == address(0) || worker == msg.sender) revert InvalidAddress();
        _workerApprovalOwner[plotId][worker] = enabled ? msg.sender : address(0);
        emit WorkerAccessChanged(plotId, msg.sender, worker, enabled);
    }

    function workerAccessOpen(uint256 plotId, address worker) public view returns (bool) {
        return _workerApprovalOwner[plotId][worker] != address(0)
            && plotToken.ownerOf(plotId) == _workerApprovalOwner[plotId][worker];
    }

    function activateWithCredits(uint256 accessId) external whenNotPaused nonReentrant {
        if (accessToken.ownerOf(accessId) != msg.sender) revert InvalidMode();
        if (accessToken.isActivated(accessId)) revert AlreadyActivated();
        if (gameCredits[msg.sender] < ACTIVATION_HC) revert InsufficientGameCredits();
        gameCredits[msg.sender] -= ACTIVATION_HC;
        accessToken.setActivated(accessId, true);
        emit FarmerActivatedWithCredits(msg.sender, accessId, ACTIVATION_HC);
    }

    function openPosition(
        uint256 accessId,
        uint256 plotId,
        bytes32 strainId,
        uint8 durationSteps,
        bool worker
    ) external payable whenNotPaused nonReentrant returns (uint256 positionId) {
        _requireProtocolFee();
        if (!_validDuration(durationSteps)) revert InvalidDuration(durationSteps);
        if (strainId == bytes32(0) || farmerSpecialty[accessId] != strainId) revert InvalidStrain();
        if (accessToken.ownerOf(accessId) != msg.sender) revert InvalidMode();
        if (!accessToken.isActivated(accessId)) revert AccessNotActivated(accessId);
        if (activePositionForAccess[accessId] != 0) revert AccessAlreadyInUse(accessId);

        address plotOwner = plotToken.ownerOf(plotId);
        if (worker) {
            if (plotOwner == msg.sender || !workerAccessOpen(plotId, msg.sender)) revert WorkerAccessClosed(plotId);
        } else if (plotOwner != msg.sender) {
            revert InvalidMode();
        }

        if (activePositionCountByPlot[plotId] >= plotToken.capacityOf(plotId)) revert PlotAtCapacity(plotId);

        positionId = nextPositionId++;
        positions[positionId] = Position({
            player: msg.sender,
            plotOwner: plotOwner,
            accessId: accessId,
            plotId: plotId,
            strainId: strainId,
            startedAt: uint64(block.timestamp),
            closedAt: 0,
            durationSteps: durationSteps,
            settledSteps: 0,
            playerShareBps: worker ? WORKER_SHARE_BPS : BPS_DENOMINATOR,
            plotOwnerShareBps: worker ? OWNER_SHARE_BPS : 0,
            worker: worker,
            closed: false
        });
        activePositionForAccess[accessId] = positionId;
        activePositionCountByPlot[plotId] += 1;
        accruedFees += msg.value;

        _expectedAccessFrom = msg.sender;
        _expectedAccessId = accessId;
        accessToken.safeTransferFrom(msg.sender, address(this), accessId);
        _expectedAccessFrom = address(0);
        _expectedAccessId = 0;
        emit PositionOpened(
            positionId,
            msg.sender,
            plotOwner,
            accessId,
            plotId,
            strainId,
            durationSteps,
            worker ? WORKER_SHARE_BPS : BPS_DENOMINATOR,
            worker ? OWNER_SHARE_BPS : 0,
            worker,
            uint64(block.timestamp),
            CONFIG_VERSION
        );
    }

    function closePosition(uint256 positionId) external payable whenNotPaused nonReentrant {
        _requireProtocolFee();
        Position storage position = positions[positionId];
        if (position.player != msg.sender) revert NotPositionPlayer(positionId);
        if (position.closed) revert PositionAlreadyClosed(positionId);
        accruedFees += msg.value;
        _release(positionId, position, false);
    }

    /// @notice Releases a mature position if its player is unavailable, preventing permanent plot lockup.
    /// @dev The escrowed Access NFT is always returned to the player; this function never charges a fee.
    function settleMaturePosition(uint256 positionId) external whenNotPaused nonReentrant {
        Position storage position = positions[positionId];
        if (position.player == address(0) || position.closed) revert PositionAlreadyClosed(positionId);
        if (completedSteps(positionId) != position.durationSteps) revert PositionNotMature(positionId);
        _release(positionId, position, false);
    }

    /// @notice Fee-free NFT recovery while the protocol is paused.
    function emergencyWithdraw(uint256 positionId) external whenPaused nonReentrant {
        Position storage position = positions[positionId];
        if (position.player != msg.sender) revert NotPositionPlayer(positionId);
        if (position.closed) revert PositionAlreadyClosed(positionId);
        _release(positionId, position, true);
    }

    function completedSteps(uint256 positionId) public view returns (uint8) {
        Position storage position = positions[positionId];
        if (position.player == address(0)) return 0;
        if (position.closed) return position.settledSteps;
        uint256 elapsed = (block.timestamp - position.startedAt) / CHECKPOINT_SECONDS;
        if (elapsed >= position.durationSteps) return position.durationSteps;
        return uint8(elapsed);
    }

    function isPlotOccupied(uint256 plotId) external view returns (bool) {
        return activePositionCountByPlot[plotId] != 0;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdrawFees(address payable recipient, uint256 amount) external onlyRole(TREASURER_ROLE) nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0 || amount > accruedFees) revert NothingToWithdraw();
        accruedFees -= amount;
        (bool sent,) = recipient.call{value: amount}("");
        if (!sent) revert FeeTransferFailed();
        emit FeesWithdrawn(recipient, amount);
    }

    /// @notice Recovers an Access NFT sent with raw transferFrom rather than openPosition.
    /// @dev Safe transfers that are not initiated by openPosition are rejected in onERC721Received.
    function recoverUntrackedAccess(uint256 accessId, address recipient)
        external
        whenPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (recipient == address(0)) revert InvalidAddress();
        if (activePositionForAccess[accessId] != 0) revert AccessIsActive(accessId);
        accessToken.safeTransferFrom(address(this), recipient, accessId);
        emit UntrackedAccessRecovered(accessId, recipient);
    }

    function onERC721Received(address, address from, uint256 tokenId, bytes calldata)
        external
        view
        returns (bytes4)
    {
        if (msg.sender != address(accessToken) || from != _expectedAccessFrom || tokenId != _expectedAccessId) {
            revert UnexpectedAccessTransfer();
        }
        return IERC721Receiver.onERC721Received.selector;
    }

    function _release(uint256 positionId, Position storage position, bool emergency) private {
        uint8 steps = completedSteps(positionId);
        bool mature = steps == position.durationSteps;

        position.closed = true;
        position.closedAt = uint64(block.timestamp);
        position.settledSteps = steps;
        activePositionForAccess[position.accessId] = 0;
        activePositionCountByPlot[position.plotId] -= 1;
        if (mature && !emergency) {
            (uint64 previousXp,,) = accessToken.accessData(position.accessId);
            uint64 newXp = accessToken.addXp(position.accessId, uint64(steps) * XP_PER_CHECKPOINT);
            uint256 credits = uint256(steps) * HC_PER_CHECKPOINT;
            gameCredits[position.player] += credits;
            emit HarvestRewarded(positionId, position.player, position.accessId, newXp - previousXp, credits);
        }
        accessToken.safeTransferFrom(address(this), position.player, position.accessId);

        emit PositionClosed(positionId, position.player, steps, mature, emergency, uint64(block.timestamp));
    }

    function _requireProtocolFee() private view {
        if (msg.value != PROTOCOL_FEE) revert InvalidProtocolFee(PROTOCOL_FEE, msg.value);
    }

    function _validDuration(uint8 steps) private pure returns (bool) {
        return steps == 1 || steps == 2 || steps == 4 || steps == 12 || steps == 28;
    }
}
