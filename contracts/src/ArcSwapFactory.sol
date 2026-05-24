// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ArcSwapPool} from "./ArcSwapPool.sol";

/// @notice Deploys and tracks all ArcSwap pools.
contract ArcSwapFactory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 poolCount);

    error IdenticalAddresses();
    error ZeroAddress();
    error PoolExists();

    /// @notice Create a pool for any two ERC-20 tokens.
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPool[token0][token1] != address(0)) revert PoolExists();

        pool = address(new ArcSwapPool{salt: keccak256(abi.encodePacked(token0, token1))}(token0, token1));
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
}
