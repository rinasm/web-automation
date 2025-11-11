#!/bin/bash

# Setup WebDriverAgent for WiFi Automation
# This script helps configure WDA to accept network connections

echo "🔧 WebDriverAgent WiFi Setup"
echo "=============================="
echo ""

# Get iPhone IP address
echo "📱 Enter your iPhone's IP address from the list below:"
echo ""
arp -a | grep -i "iphone"
echo ""
read -p "iPhone IP: " IPHONE_IP

if [ -z "$IPHONE_IP" ]; then
    echo "❌ No IP address provided"
    exit 1
fi

echo ""
echo "📱 iPhone IP: $IPHONE_IP"
echo ""

# Get device UDID (if connected via USB for initial setup)
echo "🔌 Checking for USB-connected devices..."
UDID=$(/opt/homebrew/bin/idevice_id -l | head -1)

if [ -z "$UDID" ]; then
    echo "⚠️  No USB device found. You'll need to connect via USB for initial WDA installation."
    echo ""
    read -p "Do you have your iPhone UDID? (y/n): " HAS_UDID

    if [ "$HAS_UDID" = "y" ]; then
        read -p "Enter UDID: " UDID
    else
        echo ""
        echo "To get your iPhone UDID:"
        echo "1. Connect iPhone via USB"
        echo "2. Run: /opt/homebrew/bin/idevice_id -l"
        exit 1
    fi
fi

echo "📱 Using UDID: $UDID"
echo ""

# Navigate to WDA directory
WDA_PATH="$HOME/works/ui-test-automation/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent"

if [ ! -d "$WDA_PATH" ]; then
    echo "❌ WebDriverAgent not found at: $WDA_PATH"
    echo "Please install appium-xcuitest-driver first:"
    echo "  npm install appium-xcuitest-driver"
    exit 1
fi

cd "$WDA_PATH"

echo "✅ Found WebDriverAgent at: $WDA_PATH"
echo ""

# Build and install WDA on device
echo "🔨 Building and installing WebDriverAgent on your iPhone..."
echo "This will:"
echo "  1. Build WebDriverAgent"
echo "  2. Install it on your iPhone"
echo "  3. Keep it running to accept network connections"
echo ""
read -p "Continue? (y/n): " CONTINUE

if [ "$CONTINUE" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo "🔨 Building WDA..."
echo ""

# Build and test
xcodebuild \
  -project WebDriverAgent.xcodeproj \
  -scheme WebDriverAgentRunner \
  -destination "id=$UDID" \
  DEVELOPMENT_TEAM="7MFG6W6M8G" \
  CODE_SIGN_STYLE=Automatic \
  test-without-building

echo ""
echo "✅ WebDriverAgent Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. WDA should now be running on your iPhone"
echo "2. WDA is listening on port 8100"
echo "3. Access it from your Mac at: http://$IPHONE_IP:8100"
echo ""
echo "4. Test the connection:"
echo "   curl http://$IPHONE_IP:8100/status"
echo ""
echo "5. In the app:"
echo "   - Switch to Mobile mode"
echo "   - Click 'Scan for Devices'"
echo "   - Your iPhone should appear as: $IPHONE_IP (WiFi)"
echo "   - Select it and start automating!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep WDA running on your iPhone (don't close the white screen)"
echo "   - If you lock your iPhone, WDA will stop - you need to keep it unlocked"
echo "   - To restart WDA, run this script again"
echo ""
