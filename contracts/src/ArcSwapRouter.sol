// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {ArcSwapFactory} from "./ArcSwapFactory.sol";
import {ArcSwapPool} from "./ArcSwapPool.sol";

/// @notice Router for swaps and liquidity on ArcSwap.
///         Handles multi-hop swaps through a path of pools.
contract ArcSwapRouter {
    ArcSwapFactory public immutable factory;

    error Expired();
    error InsufficientOutputAmount();
    error ExcessiveInputAmount();
    error InsufficientAAmount();
    error InsufficientBAmount();
    error InvalidPath();
    error PoolDoesNotExist();

    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert Expired();
        _;
    }

    constructor(address _factory) {
        factory = ArcSwapFactory(_factory);
    }

    // ─── View helpers ────────────────────────────────────────────────────────

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountIn)
    {
        amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997) + 1;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            address pool = factory.getPool(path[i], path[i + 1]);
            if (pool == address(0)) revert PoolDoesNotExist();
            (uint112 r0, uint112 r1,) = ArcSwapPool(pool).getReserves();
            (uint256 rIn, uint256 rOut) = path[i] < path[i + 1] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i + 1] = getAmountOut(amounts[i], rIn, rOut);
        }
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            address pool = factory.getPool(path[i - 1], path[i]);
            if (pool == address(0)) revert PoolDoesNotExist();
            (uint112 r0, uint112 r1,) = ArcSwapPool(pool).getReserves();
            (uint256 rIn, uint256 rOut) = path[i - 1] < path[i] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i - 1] = getAmountIn(amounts[i], rIn, rOut);
        }
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _swap(uint256[] memory amounts, address[] calldata path, address to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            address pool = factory.getPool(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input < output ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address recipient = i < path.length - 2 ? factory.getPool(output, path[i + 2]) : to;
            ArcSwapPool(pool).swap(amount0Out, amount1Out, recipient);
        }
    }

    // ─── Swap exact tokens for tokens ────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            address pool = factory.getPool(path[i], path[i + 1]);
            if (pool == address(0)) revert PoolDoesNotExist();
            (uint112 r0, uint112 r1,) = ArcSwapPool(pool).getReserves();
            (uint256 rIn, uint256 rOut) = path[i] < path[i + 1] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i + 1] = getAmountOut(amounts[i], rIn, rOut);
        }
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();

        IERC20(path[0]).transferFrom(msg.sender, factory.getPool(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            address pool = factory.getPool(path[i - 1], path[i]);
            if (pool == address(0)) revert PoolDoesNotExist();
            (uint112 r0, uint112 r1,) = ArcSwapPool(pool).getReserves();
            (uint256 rIn, uint256 rOut) = path[i - 1] < path[i] ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            amounts[i - 1] = getAmountIn(amounts[i], rIn, rOut);
        }
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();

        IERC20(path[0]).transferFrom(msg.sender, factory.getPool(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    // ─── Liquidity ───────────────────────────────────────────────────────────

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pool = factory.getPool(tokenA, tokenB);
        if (pool == address(0)) {
            pool = factory.createPool(tokenA, tokenB);
        }

        (uint112 r0, uint112 r1,) = ArcSwapPool(pool).getReserves();
        (uint256 rA, uint256 rB) = tokenA < tokenB ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));

        if (rA == 0 && rB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * rB) / rA;
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientBAmount();
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * rA) / rB;
                if (amountAOptimal < amountAMin) revert InsufficientAAmount();
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }

        IERC20(tokenA).transferFrom(msg.sender, pool, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pool, amountB);
        liquidity = ArcSwapPool(pool).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pool = factory.getPool(tokenA, tokenB);
        if (pool == address(0)) revert PoolDoesNotExist();

        ArcSwapPool(pool).transferFrom(msg.sender, pool, liquidity);
        (uint256 amount0, uint256 amount1) = ArcSwapPool(pool).burn(to);
        (amountA, amountB) = tokenA < tokenB ? (amount0, amount1) : (amount1, amount0);

        if (amountA < amountAMin) revert InsufficientAAmount();
        if (amountB < amountBMin) revert InsufficientBAmount();
    }
}
