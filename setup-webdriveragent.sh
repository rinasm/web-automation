#!/bin/bash

# WebDriverAgent Setup Script
# This script automates the setup of WebDriverAgent for iOS real device testing

set -e

echo "🔧 WebDriverAgent Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Xcode is installed
echo "📱 Step 1: Checking Xcode installation..."
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode is not installed. Please install Xcode from the App Store.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Xcode is installed${NC}"
XCODE_PATH=$(xcode-select -p)
echo "   Xcode path: $XCODE_PATH"
echo ""

# Check if appium-xcuitest-driver is installed
echo "📱 Step 2: Locating WebDriverAgent..."
WDA_PATH="$PWD/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent"

if [ ! -d "$WDA_PATH" ]; then
    echo -e "${RED}❌ WebDriverAgent not found at: $WDA_PATH${NC}"
    echo "   Please run: npm install appium-xcuitest-driver"
    exit 1
fi
echo -e "${GREEN}✅ WebDriverAgent found at: $WDA_PATH${NC}"
echo ""

# Check for connected iOS devices
echo "📱 Step 3: Checking for connected iOS devices..."
DEVICE_UDID=""

if command -v idevice_id &> /dev/null; then
    DEVICE_UDID=$(idevice_id -l | head -n 1)
elif command -v /opt/homebrew/bin/idevice_id &> /dev/null; then
    DEVICE_UDID=$(/opt/homebrew/bin/idevice_id -l | head -n 1)
else
    echo -e "${YELLOW}⚠️  libimobiledevice not found. Installing...${NC}"
    brew install libimobiledevice
    DEVICE_UDID=$(/opt/homebrew/bin/idevice_id -l | head -n 1)
fi

if [ -z "$DEVICE_UDID" ]; then
    echo -e "${RED}❌ No iOS devices connected via USB${NC}"
    echo "   Please connect your iPhone/iPad and trust this computer"
    exit 1
fi

echo -e "${GREEN}✅ iOS device connected: $DEVICE_UDID${NC}"

# Get device name if possible
if command -v ideviceinfo &> /dev/null; then
    DEVICE_NAME=$(ideviceinfo -u "$DEVICE_UDID" -k DeviceName 2>/dev/null || echo "Unknown")
elif [ -f /opt/homebrew/bin/ideviceinfo ]; then
    DEVICE_NAME=$(/opt/homebrew/bin/ideviceinfo -u "$DEVICE_UDID" -k DeviceName 2>/dev/null || echo "Unknown")
else
    DEVICE_NAME="Unknown"
fi
echo "   Device: $DEVICE_NAME"
echo ""

# Prompt for Apple Developer Team ID
echo "📱 Step 4: Apple Developer Team Configuration"
echo "   You need an Apple Developer account to sign WebDriverAgent."
echo "   Find your Team ID at: https://developer.apple.com/account/#/membership"
echo ""
read -p "   Enter your Apple Developer Team ID: " TEAM_ID

if [ -z "$TEAM_ID" ]; then
    echo -e "${RED}❌ Team ID is required${NC}"
    exit 1
fi
echo ""

# Prompt for Bundle ID
echo "📱 Step 5: Bundle ID Configuration"
echo "   Default: com.facebook.WebDriverAgentRunner"
read -p "   Enter custom Bundle ID (or press Enter for default): " BUNDLE_ID

if [ -z "$BUNDLE_ID" ]; then
    BUNDLE_ID="com.facebook.WebDriverAgentRunner"
fi
echo "   Using Bundle ID: $BUNDLE_ID"
echo ""

# Open WebDriverAgent in Xcode
echo "📱 Step 6: Opening WebDriverAgent in Xcode..."
echo "   Path: $WDA_PATH/WebDriverAgent.xcodeproj"
open "$WDA_PATH/WebDriverAgent.xcodeproj"
echo -e "${GREEN}✅ Xcode opened${NC}"
echo ""

# Provide manual instructions
echo "📱 Step 7: Manual Configuration Required"
echo "================================"
echo ""
echo "Please complete the following steps in Xcode:"
echo ""
echo "1. Select 'WebDriverAgentLib' target"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Check 'Automatically manage signing'"
echo "   - Select Team: $TEAM_ID"
echo ""
echo "2. Select 'WebDriverAgentRunner' target"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Check 'Automatically manage signing'"
echo "   - Select Team: $TEAM_ID"
echo "   - Change Bundle Identifier to: $BUNDLE_ID"
echo ""
echo "3. Select 'IntegrationApp' target"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Check 'Automatically manage signing'"
echo "   - Select Team: $TEAM_ID"
echo ""
echo "4. Build the project (⌘ + B)"
echo ""
echo "5. If you see code signing errors:"
echo "   - Go to Keychain Access"
echo "   - Ensure your Apple Developer certificate is installed"
echo "   - You may need to create a certificate at developer.apple.com"
echo ""
echo "================================"
echo ""
read -p "Press Enter once you've completed the Xcode configuration..."
echo ""

# Try to build WebDriverAgent
echo "📱 Step 8: Building WebDriverAgent..."
cd "$WDA_PATH"

echo "   Running xcodebuild..."
xcodebuild -project WebDriverAgent.xcodeproj \
    -scheme WebDriverAgentRunner \
    -destination "id=$DEVICE_UDID" \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    build-for-testing || {
    echo ""
    echo -e "${RED}❌ Build failed${NC}"
    echo ""
    echo "Common issues:"
    echo "1. Code signing: Ensure your team and certificates are configured"
    echo "2. Provisioning: Create a development provisioning profile at developer.apple.com"
    echo "3. Device registration: Register your device UDID at developer.apple.com"
    echo ""
    echo "For detailed logs, check the Xcode console."
    exit 1
}

echo ""
echo -e "${GREEN}✅ WebDriverAgent built successfully!${NC}"
echo ""

# Provide next steps
echo "📱 Next Steps"
echo "================================"
echo ""
echo "1. Enable UI Automation on your device:"
echo "   Settings → Developer → Enable UI Automation"
echo ""
echo "2. If 'Developer' menu is not visible:"
echo "   - Connect device to Mac"
echo "   - Open Xcode → Window → Devices and Simulators"
echo "   - Select your device → Use for Development"
echo ""
echo "3. Restart the application:"
echo "   npm run dev"
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
