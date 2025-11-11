# iOS Prerequisites Installation Status

**Date**: November 6, 2025
**System**: macOS (Darwin 25.0.0)
**User**: rinasmusthafa

---

## Prerequisites Check Summary

| Prerequisite | Status | Location | Notes |
|--------------|--------|----------|-------|
| **Xcode Command Line Tools** | ✅ Installed | `/Library/Developer/CommandLineTools` | Ready to use |
| **Homebrew** | ❌ Not Installed | N/A | Requires manual installation |
| **libimobiledevice** | ❌ Not Installed | N/A | Requires Homebrew |
| **ios-webkit-debug-proxy** | ❌ Not Installed | N/A | Requires Homebrew |

---

## Detailed Status

### ✅ Xcode Command Line Tools - INSTALLED

**Status**: Fully installed and ready to use

**Verification Command**:
```bash
xcode-select -p
```

**Output**:
```
/Library/Developer/CommandLineTools
```

**What This Provides**:
- Git
- Make
- GCC compiler
- Development headers
- iOS device communication tools

**No action needed** - this is already set up correctly.

---

### ❌ Homebrew - NOT INSTALLED

**Status**: Not installed (requires manual installation with sudo access)

**Why It's Needed**:
Homebrew is the package manager for macOS that makes it easy to install libimobiledevice and ios-webkit-debug-proxy.

**Installation Failed Because**:
The automatic installation requires:
- Sudo/administrator access
- Interactive terminal (for password input)
- User confirmation

**Manual Installation Required**:

#### Step 1: Open Terminal

Press `Cmd + Space`, type "Terminal", and press Enter.

#### Step 2: Run Homebrew Installation Command

Copy and paste this command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Step 3: Follow On-Screen Instructions

The installer will:
1. Ask for your password (type it and press Enter - you won't see it)
2. Show you what it will install
3. Ask you to press Enter to continue
4. Download and install Homebrew (takes 2-5 minutes)

#### Step 4: Add Homebrew to PATH (if needed)

If you're on Apple Silicon (M1/M2/M3), after installation run:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

If you're on Intel Mac, run:

```bash
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

#### Step 5: Verify Homebrew Installation

```bash
brew --version
```

**Expected output**:
```
Homebrew 4.x.x
```

---

### ❌ libimobiledevice - NOT INSTALLED

**Status**: Not installed (requires Homebrew first)

**Why It's Needed**:
libimobiledevice is a library that allows communication with iOS devices without jailbreaking. It provides:
- Device detection via USB
- Device information retrieval
- iOS filesystem access
- App management
- Backup/restore capabilities

**Installation Instructions**:

#### Prerequisites
- Homebrew must be installed first (see above)

#### Installation Command

```bash
brew install libimobiledevice
```

**Installation time**: 2-3 minutes

#### Verify Installation

```bash
idevice_id --version
```

**Expected output**:
```
idevice_id 1.3.0
```

Or simply:
```bash
which idevice_id
```

**Expected output**:
```
/opt/homebrew/bin/idevice_id  # Apple Silicon
# or
/usr/local/bin/idevice_id      # Intel Mac
```

#### What You'll Get

After installation, you'll have access to these commands:
- `idevice_id` - List connected iOS devices
- `ideviceinfo` - Get device information
- `idevicepair` - Pair/unpair devices
- `ideviceinstaller` - Install/uninstall apps
- `idevicebackup2` - Backup/restore device
- And many more...

---

### ❌ ios-webkit-debug-proxy - NOT INSTALLED

**Status**: Not installed (requires Homebrew first)

**Why It's Needed**:
ios-webkit-debug-proxy is a DevTools proxy for iOS devices. It:
- Enables remote debugging of Safari on iOS
- Provides WebKit Remote Debugging Protocol
- Bridges iOS Safari to desktop browsers
- Required for web inspector functionality

**Installation Instructions**:

#### Prerequisites
- Homebrew must be installed first (see above)
- libimobiledevice should be installed (see above)

#### Installation Command

```bash
brew install ios-webkit-debug-proxy
```

**Installation time**: 1-2 minutes

#### Verify Installation

```bash
ios_webkit_debug_proxy --help
```

**Expected output**:
```
Usage: ios_webkit_debug_proxy [OPTIONS]
Device connection options:
  -u UDID       target specific device by its UDID
  -c CONN       device:port or UDID:port
...
```

Or simply:
```bash
which ios_webkit_debug_proxy
```

**Expected output**:
```
/opt/homebrew/bin/ios_webkit_debug_proxy  # Apple Silicon
# or
/usr/local/bin/ios_webkit_debug_proxy      # Intel Mac
```

---

## Complete Installation Sequence

Follow these steps in order:

### Step 1: Install Homebrew (5 minutes)

```bash
# Open Terminal and run:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Enter your password when prompted
# Press Enter to confirm installation
# Wait for installation to complete

# Add to PATH (Apple Silicon):
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# OR add to PATH (Intel Mac):
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"

# Verify:
brew --version
```

### Step 2: Install libimobiledevice (3 minutes)

```bash
# Install:
brew install libimobiledevice

# Verify:
idevice_id --version
```

### Step 3: Install ios-webkit-debug-proxy (2 minutes)

```bash
# Install:
brew install ios-webkit-debug-proxy

# Verify:
ios_webkit_debug_proxy --help
```

### Step 4: Verify Complete Setup

```bash
# Check all prerequisites:
echo "=== Xcode Command Line Tools ==="
xcode-select -p

echo ""
echo "=== Homebrew ==="
brew --version

echo ""
echo "=== libimobiledevice ==="
idevice_id --version

echo ""
echo "=== ios-webkit-debug-proxy ==="
ios_webkit_debug_proxy --help | head -3
```

**Expected output**: All commands should succeed without errors.

---

## Quick One-Liner Installation (After Homebrew)

Once Homebrew is installed, you can install both packages at once:

```bash
brew install libimobiledevice ios-webkit-debug-proxy && echo "✅ Installation complete!"
```

---

## Troubleshooting

### Issue: "command not found: brew" after installation

**Solution**:
Add Homebrew to your PATH:

```bash
# For Apple Silicon (M1/M2/M3):
eval "$(/opt/homebrew/bin/brew shellenv)"

# For Intel Mac:
eval "$(/usr/local/bin/brew shellenv)"

# Then verify:
brew --version
```

### Issue: "Permission denied" when installing Homebrew

**Solution**:
- Make sure you're running as an administrator user
- You need sudo access to install Homebrew
- Contact your system administrator if you don't have admin rights

### Issue: Homebrew installation hangs

**Solution**:
1. Press `Ctrl+C` to cancel
2. Check your internet connection
3. Try again with:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

### Issue: "idevice_id: command not found" after installation

**Solution**:
1. Verify libimobiledevice is installed:
   ```bash
   brew list | grep libimobiledevice
   ```

2. If not listed, install it:
   ```bash
   brew install libimobiledevice
   ```

3. Reload your shell:
   ```bash
   source ~/.zprofile
   ```

---

## Alternative: Manual Installation from Source

If you prefer not to use Homebrew, you can build from source:

### libimobiledevice from source

```bash
# Install dependencies
sudo port install autoconf automake libtool pkgconfig

# Clone and build
git clone https://github.com/libimobiledevice/libimobiledevice.git
cd libimobiledevice
./autogen.sh
make
sudo make install
```

### ios-webkit-debug-proxy from source

```bash
# Clone and build
git clone https://github.com/google/ios-webkit-debug-proxy.git
cd ios-webkit-debug-proxy
./autogen.sh
make
sudo make install
```

**Note**: Building from source is more complex and not recommended unless you have specific requirements.

---

## Next Steps After Installation

Once all prerequisites are installed:

1. **Connect Your iOS Device**:
   ```bash
   # Check if device is detected:
   idevice_id -l
   ```

2. **Start the WebKit Proxy**:
   ```bash
   # Replace <UDID> with your device UDID from above:
   ios_webkit_debug_proxy -c <UDID>:9221
   ```

3. **Launch the Application**:
   ```bash
   npm run dev
   ```

4. **Follow the iOS USB Connection Guide**:
   - See `IOS_USB_CONNECTION_GUIDE.md` for detailed usage instructions

---

## Verification Script

Save this as `check-ios-prerequisites.sh` and run it:

```bash
#!/bin/bash

echo "🔍 Checking iOS Development Prerequisites..."
echo ""

# Check Xcode Command Line Tools
echo "1. Xcode Command Line Tools:"
if xcode-select -p &> /dev/null; then
    echo "   ✅ Installed at $(xcode-select -p)"
else
    echo "   ❌ Not installed"
fi
echo ""

# Check Homebrew
echo "2. Homebrew:"
if command -v brew &> /dev/null; then
    echo "   ✅ Installed ($(brew --version | head -1))"
else
    echo "   ❌ Not installed"
fi
echo ""

# Check libimobiledevice
echo "3. libimobiledevice:"
if command -v idevice_id &> /dev/null; then
    echo "   ✅ Installed ($(idevice_id --version 2>&1 | head -1))"
else
    echo "   ❌ Not installed"
fi
echo ""

# Check ios-webkit-debug-proxy
echo "4. ios-webkit-debug-proxy:"
if command -v ios_webkit_debug_proxy &> /dev/null; then
    echo "   ✅ Installed ($(which ios_webkit_debug_proxy))"
else
    echo "   ❌ Not installed"
fi
echo ""

echo "=========================================="
echo "Installation Commands:"
echo ""
echo "# Install Homebrew:"
echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
echo ""
echo "# Install iOS tools:"
echo "brew install libimobiledevice ios-webkit-debug-proxy"
echo ""
```

Make it executable and run:
```bash
chmod +x check-ios-prerequisites.sh
./check-ios-prerequisites.sh
```

---

## Summary

**Current Status**:
- ✅ 1 out of 4 prerequisites installed (25%)
- ❌ 3 prerequisites require manual installation

**Required Actions**:
1. **Manual**: Install Homebrew (~5 minutes)
2. **Automatic**: Install libimobiledevice via Homebrew (~3 minutes)
3. **Automatic**: Install ios-webkit-debug-proxy via Homebrew (~2 minutes)

**Total Time**: Approximately 10 minutes of hands-on work

**Next Document**: After installation, see `IOS_USB_CONNECTION_GUIDE.md` for usage instructions

---

**Generated**: November 6, 2025
**System**: macOS Darwin 25.0.0
**User**: rinasmusthafa
