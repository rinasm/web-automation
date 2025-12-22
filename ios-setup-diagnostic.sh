#!/bin/bash

# iOS Device Connection Diagnostic Script
# This script helps diagnose and fix WebDriverAgent setup issues

echo "🔍 =========================================="
echo "🔍 iOS Device Setup Diagnostic Tool"
echo "🔍 =========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Xcode installation
echo "📱 Step 1: Checking Xcode installation..."
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -n 1)
    echo -e "${GREEN}✓${NC} Xcode is installed: $XCODE_VERSION"
else
    echo -e "${RED}✗${NC} Xcode is not installed or not in PATH"
    exit 1
fi
echo ""

# Check 2: Command Line Tools
echo "📱 Step 2: Checking Xcode Command Line Tools..."
if xcode-select -p &> /dev/null; then
    XCODE_PATH=$(xcode-select -p)
    echo -e "${GREEN}✓${NC} Command Line Tools path: $XCODE_PATH"
else
    echo -e "${RED}✗${NC} Command Line Tools not configured"
    echo "Run: sudo xcode-select --install"
    exit 1
fi
echo ""

# Check 3: Connected iOS devices
echo "📱 Step 3: Checking for connected iOS devices..."
DEVICES=$(xcrun xctrace list devices 2>&1 | grep -E "iPhone|iPad" | grep -v "Simulator")
if [ -z "$DEVICES" ]; then
    echo -e "${RED}✗${NC} No iOS devices found"
    echo "Please connect your iOS device via USB"
    exit 1
else
    echo -e "${GREEN}✓${NC} Found iOS devices:"
    echo "$DEVICES"
fi
echo ""

# Check 4: Get UDID
echo "📱 Step 4: Getting device UDID..."
UDID=$(xcrun xctrace list devices 2>&1 | grep -E "iPhone|iPad" | grep -v "Simulator" | head -n 1 | grep -oE "[0-9A-F-]{36,40}")
if [ -z "$UDID" ]; then
    echo -e "${RED}✗${NC} Could not extract device UDID"
    exit 1
else
    echo -e "${GREEN}✓${NC} Device UDID: $UDID"
fi
echo ""

# Check 5: Development Team
echo "📱 Step 5: Checking Apple Developer Team..."
TEAM_ID="7MFG6W6M8G"
echo "Current Team ID in config: $TEAM_ID"
echo ""
echo "To verify your Team ID:"
echo "1. Open Xcode"
echo "2. Go to Xcode > Settings > Accounts"
echo "3. Select your Apple ID"
echo "4. View your Team ID"
echo ""
read -p "Is your Team ID correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠${NC} Please update your Team ID in the mobile device connection settings"
fi
echo ""

# Check 6: WebDriverAgent location
echo "📱 Step 6: Locating WebDriverAgent..."
WDA_PATH="./node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent"
if [ -d "$WDA_PATH" ]; then
    echo -e "${GREEN}✓${NC} WebDriverAgent found at: $WDA_PATH"
else
    echo -e "${RED}✗${NC} WebDriverAgent not found"
    echo "Run: npm install"
    exit 1
fi
echo ""

# Check 7: Try to build WebDriverAgent manually
echo "📱 Step 7: Building WebDriverAgent (this may take a few minutes)..."
echo ""
echo "This will:"
echo "  1. Clean the WebDriverAgent project"
echo "  2. Build for your device"
echo "  3. Show any code signing errors"
echo ""
read -p "Proceed with build? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$WDA_PATH" || exit

    echo "🧹 Cleaning project..."
    xcodebuild clean -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination id="$UDID" 2>&1 | tail -n 20

    echo ""
    echo "🔨 Building WebDriverAgent..."
    echo "Note: This may prompt you to allow codesigning..."
    echo ""

    BUILD_OUTPUT=$(xcodebuild build-for-testing \
        -project WebDriverAgent.xcodeproj \
        -scheme WebDriverAgentRunner \
        -destination id="$UDID" \
        DEVELOPMENT_TEAM="$TEAM_ID" \
        CODE_SIGN_IDENTITY="iPhone Developer" \
        2>&1)

    BUILD_RESULT=$?

    if [ $BUILD_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓${NC} WebDriverAgent built successfully!"
        echo ""
        echo "📱 IMPORTANT: Trust the developer on your device"
        echo "  1. On your iPhone, go to: Settings > General > VPN & Device Management"
        echo "  2. Find your developer account"
        echo "  3. Tap 'Trust'"
        echo ""
    else
        echo -e "${RED}✗${NC} Build failed. Error details:"
        echo ""
        echo "$BUILD_OUTPUT" | grep -A 5 "error:"
        echo ""

        # Common error detection
        if echo "$BUILD_OUTPUT" | grep -q "Signing for.*requires a development team"; then
            echo -e "${YELLOW}⚠${NC} Code Signing Error: Development team not set"
            echo "Fix: Update your Team ID in the app settings"
        fi

        if echo "$BUILD_OUTPUT" | grep -q "No profiles for.*were found"; then
            echo -e "${YELLOW}⚠${NC} Code Signing Error: No provisioning profile"
            echo "Fix:"
            echo "  1. Open WebDriverAgent.xcodeproj in Xcode"
            echo "  2. Select WebDriverAgentLib target"
            echo "  3. Go to Signing & Capabilities"
            echo "  4. Select your Team"
            echo "  5. Repeat for WebDriverAgentRunner target"
        fi

        if echo "$BUILD_OUTPUT" | grep -q "device locked"; then
            echo -e "${YELLOW}⚠${NC} Device is locked"
            echo "Fix: Unlock your iPhone and try again"
        fi
    fi
else
    echo "Skipping build step"
fi

cd - > /dev/null || exit

echo ""
echo "🔍 =========================================="
echo "🔍 Diagnostic Complete"
echo "🔍 =========================================="
echo ""
echo "Next steps:"
echo "1. ✓ Ensure your device is trusted on this Mac"
echo "2. ✓ Ensure developer is trusted on the device"
echo "3. ✓ Try connecting again in the app"
echo ""
