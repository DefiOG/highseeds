// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IPlotOccupancy {
    function isPlotOccupied(uint256 plotId) external view returns (bool);
}

/// @title Loud Ledger Plot
/// @notice Capacity-bearing plot collectible. Transfers are blocked while the plot hosts a position.
contract LoudPlot is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    enum Tier {
        Pot,
        Room,
        House,
        Farm
    }

    error InvalidAddress();
    error PositionManagerAlreadySet();
    error PlotOccupied(uint256 plotId);

    event PlotMinted(uint256 indexed tokenId, address indexed owner, Tier tier, uint8 capacity);
    event PositionManagerSet(address indexed positionManager);
    event BaseURIChanged(string newBaseURI);

    uint256 public nextTokenId = 1;
    address public positionManager;
    mapping(uint256 tokenId => Tier tier) public plotTier;

    string private _baseTokenURI;

    constructor(address admin, string memory baseURI_) ERC721("Loud Ledger Plot", "LOUDPLOT") {
        if (admin == address(0)) revert InvalidAddress();
        _baseTokenURI = baseURI_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, Tier tier) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidAddress();
        tokenId = nextTokenId++;
        plotTier[tokenId] = tier;
        _safeMint(to, tokenId);
        emit PlotMinted(tokenId, to, tier, capacityForTier(tier));
    }

    function capacityOf(uint256 tokenId) external view returns (uint8) {
        _requireOwned(tokenId);
        return capacityForTier(plotTier[tokenId]);
    }

    function capacityForTier(Tier tier) public pure returns (uint8) {
        if (tier == Tier.Pot) return 1;
        if (tier == Tier.Room) return 4;
        if (tier == Tier.House) return 8;
        return 36;
    }

    /// @dev One-time binding prevents a later admin change from silently bypassing occupied-plot transfer locks.
    function setPositionManager(address manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (manager == address(0) || manager.code.length == 0) revert InvalidAddress();
        if (positionManager != address(0)) revert PositionManagerAlreadySet();
        positionManager = manager;
        emit PositionManagerSet(manager);
    }

    function setBaseURI(string calldata newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (
            from != address(0) && to != address(0) && positionManager != address(0)
                && IPlotOccupancy(positionManager).isPlotOccupied(tokenId)
        ) revert PlotOccupied(tokenId);
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
