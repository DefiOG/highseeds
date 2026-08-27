// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Loud Ledger Access
/// @notice Access collectible used to open a single active Loud Ledger position.
/// @dev Rarity and XP are game metadata. This contract does not create token yield or financial rights.
contract LoudAccess is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    uint8 public constant MAX_RARITY = 4;

    struct AccessData {
        uint64 xp;
        uint8 rarity;
        bool activated;
    }

    error InvalidAddress();
    error InvalidRarity(uint8 rarity);

    event AccessMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, bool activated);
    event ActivationChanged(uint256 indexed tokenId, bool activated);
    event XpAdded(uint256 indexed tokenId, uint64 amount, uint64 newTotal);
    event BaseURIChanged(string newBaseURI);

    uint256 public nextTokenId = 1;
    mapping(uint256 tokenId => AccessData data) public accessData;

    string private _baseTokenURI;

    constructor(address admin, string memory baseURI_) ERC721("Loud Ledger Access", "LOUDACCESS") {
        if (admin == address(0)) revert InvalidAddress();
        _baseTokenURI = baseURI_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
    }

    function mint(address to, uint8 rarity, bool activated) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidAddress();
        if (rarity > MAX_RARITY) revert InvalidRarity(rarity);

        tokenId = nextTokenId++;
        accessData[tokenId] = AccessData({xp: 0, rarity: rarity, activated: activated});
        _safeMint(to, tokenId);
        emit AccessMinted(tokenId, to, rarity, activated);
    }

    function setActivated(uint256 tokenId, bool activated) external onlyRole(GAME_ROLE) {
        _requireOwned(tokenId);
        accessData[tokenId].activated = activated;
        emit ActivationChanged(tokenId, activated);
    }

    function addXp(uint256 tokenId, uint64 amount) external onlyRole(GAME_ROLE) returns (uint64 newTotal) {
        _requireOwned(tokenId);
        newTotal = accessData[tokenId].xp + amount;
        accessData[tokenId].xp = newTotal;
        emit XpAdded(tokenId, amount, newTotal);
    }

    function isActivated(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return accessData[tokenId].activated;
    }

    function setBaseURI(string calldata newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
