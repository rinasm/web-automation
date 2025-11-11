#!/bin/bash

# iOS Prerequisites Verification Script
# This script checks all required tools for iOS device testing

echo "🔍 Checking iOS Development Prerequisites..."
echo ""
echo "=========================================="
echo ""

# Set up Homebrew path
if [ -f "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# Check Xcode Command Line Tools
echo "1. Xcode Command Line Tools:"
if xcode-select -p &> /dev/null; then
    XCODE_PATH=$(xcode-select -p)
    echo "   ✅ INSTALLED at $XCODE_PATH"
else
    echo "   ❌ NOT INSTALLED"
    echo "   Install with: xcode-select --install"
fi
echo ""

# Check Homebrew
echo "2. Homebrew:"
if command -v brew &> /dev/null; then
    BREW_VERSION=$(brew --version | head -1)
    BREW_PATH=$(which brew)
    echo "   ✅ INSTALLED - $BREW_VERSION"
    echo "   Location: $BREW_PATH"
else
    echo "   ❌ NOT INSTALLED"
    echo "   Install from: https://brew.sh"
fi
echo ""

# Check libimobiledevice
echo "3. libimobiledevice:"
if command -v idevice_id &> /dev/null; then
    IDEVICE_VERSION=$(idevice_id --version 2>&1)
    IDEVICE_PATH=$(which idevice_id)
    echo "   ✅ INSTALLED - $IDEVICE_VERSION"
    echo "   Location: $IDEVICE_PATH"
else
    echo "   ❌ NOT INSTALLED"
    echo "   Install with: brew install libimobiledevice"
fi
echo ""

# Check ios-webkit-debug-proxy
echo "4. ios-webkit-debug-proxy:"
if command -v ios_webkit_debug_proxy &> /dev/null; then
    PROXY_PATH=$(which ios_webkit_debug_proxy)
    echo "   ✅ INSTALLED"
    echo "   Location: $PROXY_PATH"
elif [ -f "/opt/homebrew/bin/ios_webkit_debug_proxy" ]; then
    echo "   ✅ INSTALLED"
    echo "   Location: /opt/homebrew/bin/ios_webkit_debug_proxy"
    echo "   ⚠️  Not in PATH - add Homebrew to your shell profile"
elif [ -f "/usr/local/bin/ios_webkit_debug_proxy" ]; then
    echo "   ✅ INSTALLED"
    echo "   Location: /usr/local/bin/ios_webkit_debug_proxy"
    echo "   ⚠️  Not in PATH - add Homebrew to your shell profile"
else
    echo "   ❌ NOT INSTALLED"
    echo "   Install with: brew install ios-webkit-debug-proxy"
fi
echo ""

echo "=========================================="
echo ""

# Summary
XCODE_OK=false
BREW_OK=false
IDEVICE_OK=false
PROXY_OK=false

xcode-select -p &> /dev/null && XCODE_OK=true
command -v brew &> /dev/null && BREW_OK=true
command -v idevice_id &> /dev/null && IDEVICE_OK=true
command -v ios_webkit_debug_proxy &> /dev/null || [ -f "/opt/homebrew/bin/ios_webkit_debug_proxy" ] || [ -f "/usr/local/bin/ios_webkit_debug_proxy" ] && PROXY_OK=true

if $XCODE_OK && $BREW_OK && $IDEVICE_OK && $PROXY_OK; then
    echo "✅ ALL PREREQUISITES INSTALLED!"
    echo ""
    echo "Next steps:"
    echo "1. Connect your iOS device via USB"
    echo "2. Enable Web Inspector on the device"
    echo "3. Run: idevice_id -l  (to list connected devices)"
    echo "4. See IOS_USB_CONNECTION_GUIDE.md for detailed instructions"
else
    echo "❌ SOME PREREQUISITES ARE MISSING"
    echo ""
    echo "Install missing prerequisites and run this script again."
    echo ""

    if ! $BREW_OK; then
        echo "📦 To install Homebrew:"
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo ""
    fi

    if $BREW_OK && ! $IDEVICE_OK; then
        echo "📱 To install libimobiledevice:"
        echo "brew install libimobiledevice"
        echo ""
    fi

    if $BREW_OK && ! $PROXY_OK; then
        echo "🌐 To install ios-webkit-debug-proxy:"
        echo "brew install ios-webkit-debug-proxy"
        echo ""
    fi
fi

echo "=========================================="
