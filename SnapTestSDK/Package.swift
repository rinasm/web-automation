// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SnapTestSDK",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "SnapTestSDK",
            targets: ["SnapTestSDK"]),
    ],
    dependencies: [
        // Starscream WebSocket library
        .package(url: "https://github.com/daltoniam/Starscream.git", from: "4.0.0")
    ],
    targets: [
        .target(
            name: "SnapTestSDK",
            dependencies: ["Starscream"]),
    ]
)
