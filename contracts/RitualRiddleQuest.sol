// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Ritual Riddle Quest
/// @notice Onchain registry of riddle submissions for the Ritual ecosystem.
///         One submission per wallet per riddle. XP is awarded by the
///         contract owner (backend) after offchain answer validation.
contract RitualRiddleQuest {
    address public owner;

    // riddleId (keccak256 of UUID) -> wallet -> already submitted?
    mapping(bytes32 => mapping(address => bool)) public hasSubmitted;
    // riddleId -> total submissions
    mapping(bytes32 => uint256) public submissionCount;
    // wallet -> cumulative XP
    mapping(address => uint256) public xpOf;

    event QuestSubmitted(
        address indexed wallet,
        bytes32 indexed riddleId,
        string xUsername,
        string answer,
        uint64 timestamp
    );
    event XpAwarded(address indexed wallet, bytes32 indexed riddleId, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Submit an answer for a riddle. One shot per wallet.
    /// @param riddleId keccak256 hash of the offchain riddle UUID
    /// @param xUsername the submitter's X handle (without @)
    /// @param answer the submitted answer text (stored only in the event log)
    function submit(
        bytes32 riddleId,
        string calldata xUsername,
        string calldata answer
    ) external {
        require(riddleId != bytes32(0), "bad riddle");
        require(bytes(xUsername).length > 0 && bytes(xUsername).length <= 30, "bad handle");
        require(bytes(answer).length > 0 && bytes(answer).length <= 300, "bad answer");
        require(!hasSubmitted[riddleId][msg.sender], "already submitted");

        hasSubmitted[riddleId][msg.sender] = true;
        unchecked { submissionCount[riddleId] += 1; }

        emit QuestSubmitted(msg.sender, riddleId, xUsername, answer, uint64(block.timestamp));
    }

    /// @notice Award XP to a wallet for a specific riddle.
    function awardXp(address wallet, bytes32 riddleId, uint256 amount) external onlyOwner {
        xpOf[wallet] += amount;
        emit XpAwarded(wallet, riddleId, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}