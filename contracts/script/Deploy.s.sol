// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ArcSwapFactory} from "../src/ArcSwapFactory.sol";
import {ArcSwapRouter} from "../src/ArcSwapRouter.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        ArcSwapFactory factory = new ArcSwapFactory();
        ArcSwapRouter router = new ArcSwapRouter(address(factory));

        MockERC20 tokenA = new MockERC20("Token A", "TKNA", 18);
        MockERC20 tokenB = new MockERC20("Token B", "TKNB", 18);

        console.log("Factory:  ", address(factory));
        console.log("Router:   ", address(router));
        console.log("TokenA:   ", address(tokenA));
        console.log("TokenB:   ", address(tokenB));

        vm.stopBroadcast();
    }
}
