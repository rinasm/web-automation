#!/bin/bash

# ========================================
# Rebuild and Install MyTodoApp with Updated SnapTestSDK
# ========================================
#
# This script rebuilds your iOS app with the latest SnapTestSDK
# (including the screenshot functionality added in Phase 2)
# and installs it on your iPhone.
#
# Prerequisites:
# - iPhone connected via USB (UDID: 00008110-001E38A834C3801E)
# - Device unlocked
# - Developer Mode enabled
#
# Usage:
#   chmod +x rebuild-ios-app.sh
#   ./rebuild-ios-app.sh
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IOS_APP_DIR="/Users/rinasmusthafa/works/IOS/MyTodoApp"
DEVICE_UDID="00008110-001E38A834C3801E"  # For xcodebuild
DEVICE_ID="BC19E354-3EA1-54BC-B198-B52D2D6016EE"  # For xcrun devicectl
BUNDLE_ID="com.rinasmusthafa.MyTodoApp"
SCHEME="MyTodoApp"
DEV_TEAM="7MFG6W6M8G"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rebuilding MyTodoApp with Updated SDK${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Verify iOS app directory exists
echo -e "${YELLOW}[1/7]${NC} Verifying iOS app directory..."
if [ ! -d "$IOS_APP_DIR" ]; then
    echo -e "${RED}ERROR: iOS app directory not found: $IOS_APP_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} iOS app directory found"
echo ""

# Step 2: Verify device is connected
echo -e "${YELLOW}[2/7]${NC} Checking if device is connected..."
if ! xcrun devicectl list devices | grep -q "$DEVICE_ID"; then
    echo -e "${RED}ERROR: Device $DEVICE_ID not found${NC}"
    echo "Please ensure your iPhone is connected via USB"
    exit 1
fi
echo -e "${GREEN}✓${NC} Device connected"
echo ""

# Step 3: Clean build folder
echo -e "${YELLOW}[3/7]${NC} Cleaning build folder..."
cd "$IOS_APP_DIR"
xcodebuild clean \
    -scheme "$SCHEME" \
    -configuration Debug 2>&1 | grep -E "^(Clean|warning|error|note)" || true
echo -e "${GREEN}✓${NC} Build folder cleaned"
echo ""

# Step 4: Build the app
echo -e "${YELLOW}[4/7]${NC} Building app with updated SDK..."
echo "This may take 1-2 minutes..."
xcodebuild build \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "platform=iOS,id=$DEVICE_UDID" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$DEV_TEAM" \
    CODE_SIGN_STYLE=Automatic \
    2>&1 | grep -E "^(Build|warning|error|note|\*\*)" || true

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}ERROR: Build failed${NC}"
    echo "Try opening the project in Xcode to see detailed errors:"
    echo "  open $IOS_APP_DIR/$SCHEME.xcodeproj"
    exit 1
fi
echo -e "${GREEN}✓${NC} Build successful"
echo ""

# Step 5: Find the built app
echo -e "${YELLOW}[5/7]${NC} Locating built app..."
BUILD_DIR=$(find ~/Library/Developer/Xcode/DerivedData -name "$SCHEME-*" -type d 2>/dev/null | head -1)
APP_PATH="$BUILD_DIR/Build/Products/Debug-iphoneos/$SCHEME.app"

if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}ERROR: Built app not found at: $APP_PATH${NC}"
    echo "Build may have failed silently. Check Xcode for details."
    exit 1
fi
echo -e "${GREEN}✓${NC} Found app at: $APP_PATH"
echo ""

# Step 6: Install app on device
echo -e "${YELLOW}[6/7]${NC} Installing app on device..."
xcrun devicectl device install app \
    --device "$DEVICE_ID" \
    "$APP_PATH" 2>&1 | grep -v "^$" || true

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}ERROR: Installation failed${NC}"
    echo "Possible issues:"
    echo "- Device not trusted"
    echo "- Developer certificate not trusted on device"
    echo "- App signing issue"
    exit 1
fi
echo -e "${GREEN}✓${NC} App installed successfully"
echo ""

# Step 7: Launch the app
echo -e "${YELLOW}[7/7]${NC} Launching app on device..."
xcrun devicectl device process launch \
    --device "$DEVICE_ID" \
    "$BUNDLE_ID" 2>&1 | grep -v "^$" || true

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${YELLOW}Note: Launch command failed, but app is installed${NC}"
    echo "You can launch it manually from your device"
else
    echo -e "${GREEN}✓${NC} App launched"
fi
echo ""

# Success message
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Rebuild Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "The app now includes:"
echo "  • Updated SnapTestSDK with screenshot support"
echo "  • All Phase 2 changes (ScreenshotCapture.swift)"
echo "  • WebSocket event handlers for screenshots"
echo ""
echo "Next steps:"
echo "  1. Ensure the desktop app is running (npm run dev)"
echo "  2. Check the app connects via SDK (look for SDK Connected badge)"
echo "  3. Test screenshot functionality - should work without timeouts!"
echo ""
echo "To check SDK connection, look for this in device logs:"
echo -e "  ${GREEN}🟢 [SnapTest SDK] Connected to desktop app${NC}"
echo ""
