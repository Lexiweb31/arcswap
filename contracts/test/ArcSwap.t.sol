// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ArcSwapFactory} from "../src/ArcSwapFactory.sol";
import {ArcSwapRouter} from "../src/ArcSwapRouter.sol";
import {ArcSwapPool} from "../src/ArcSwapPool.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract ArcSwapTest is Test {
    ArcSwapFactory factory;
    ArcSwapRouter router;
    MockERC20 tokenA;
    MockERC20 tokenB;
    address alice = makeAddr("alice");

    function setUp() public {
        factory = new ArcSwapFactory();
        router = new ArcSwapRouter(address(factory));
        tokenA = new MockERC20("Token A", "TKNA", 18);
        tokenB = new MockERC20("Token B", "TKNB", 18);

        tokenA.mint(alice, 1_000_000e18);
        tokenB.mint(alice, 1_000_000e18);

        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function test_CreatePool() public {
        address pool = factory.createPool(address(tokenA), address(tokenB));
        assertNotEq(pool, address(0));
        assertEq(factory.getPool(address(tokenA), address(tokenB)), pool);
        assertEq(factory.allPoolsLength(), 1);
    }

    function test_AddLiquidity() public {
        vm.prank(alice);
        (uint256 amtA, uint256 amtB, uint256 liq) = router.addLiquidity(
            address(tokenA), address(tokenB),
            100_000e18, 100_000e18,
            0, 0,
            alice,
            block.timestamp + 60
        );

        assertGt(liq, 0);
        assertEq(amtA, 100_000e18);
        assertEq(amtB, 100_000e18);

        address pool = factory.getPool(address(tokenA), address(tokenB));
        assertGt(ArcSwapPool(pool).balanceOf(alice), 0);
    }

    function test_Swap() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            100_000e18, 100_000e18,
            0, 0,
            alice,
            block.timestamp + 60
        );

        uint256 balBefore = tokenB.balanceOf(alice);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        router.swapExactTokensForTokens(1_000e18, 0, path, alice, block.timestamp + 60);
        vm.stopPrank();

        uint256 balAfter = tokenB.balanceOf(alice);
        assertGt(balAfter, balBefore);
        console.log("Token B received:", balAfter - balBefore);
    }

    function test_MultiHopSwap() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKNC", 18);
        tokenC.mint(alice, 1_000_000e18);

        vm.startPrank(alice);
        tokenC.approve(address(router), type(uint256).max);

        // A-B pool
        router.addLiquidity(address(tokenA), address(tokenB), 100_000e18, 100_000e18, 0, 0, alice, block.timestamp + 60);
        // B-C pool
        router.addLiquidity(address(tokenB), address(tokenC), 100_000e18, 100_000e18, 0, 0, alice, block.timestamp + 60);

        address[] memory path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);

        uint256 balBefore = tokenC.balanceOf(alice);
        router.swapExactTokensForTokens(1_000e18, 0, path, alice, block.timestamp + 60);
        vm.stopPrank();

        assertGt(tokenC.balanceOf(alice), balBefore);
    }

    function test_RemoveLiquidity() public {
        vm.startPrank(alice);
        (,, uint256 liq) = router.addLiquidity(
            address(tokenA), address(tokenB),
            100_000e18, 100_000e18,
            0, 0,
            alice,
            block.timestamp + 60
        );

        address pool = factory.getPool(address(tokenA), address(tokenB));
        ArcSwapPool(pool).approve(address(router), liq);

        (uint256 amtA, uint256 amtB) = router.removeLiquidity(
            address(tokenA), address(tokenB),
            liq, 0, 0,
            alice,
            block.timestamp + 60
        );

        assertGt(amtA, 0);
        assertGt(amtB, 0);
        vm.stopPrank();
    }
}
