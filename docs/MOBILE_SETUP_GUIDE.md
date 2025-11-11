# Mobile Device Setup Guide

Complete guide for setting up mobile device testing with Android and iOS devices.

---

## Table of Contents

1. [Android Setup](#android-setup)
2. [iOS Setup](#ios-setup)
3. [Network Configuration](#network-configuration)
4. [Troubleshooting](#troubleshooting)
5. [FAQ](#faq)

---

## Android Setup

### Requirements
- Android 11 or higher (API level 30+)
- Chrome browser installed on device
- Same WiFi network as your computer
- USB cable (for initial setup, optional for wireless)

### Step-by-Step Setup

#### Step 1: Enable Developer Options

1. Open **Settings** on your Android device
2. Scroll to **About Phone** or **About Device**
3. Find **Build Number**
4. Tap **Build Number** **7 times**
5. You'll see a message: "You are now a developer!"

#### Step 2: Enable USB Debugging

1. Go back to **Settings**
2. Find and open **Developer Options** (usually under System → Advanced)
3. Enable **USB Debugging**
4. Enable **USB Debugging (Security Settings)** if available

#### Step 3: Enable Wireless Debugging

**For Android 11+:**

1. In **Developer Options**, find **Wireless Debugging**
2. Enable **Wireless Debugging**
3. Tap **Wireless Debugging** to see options
4. Note your device's IP address and port

**Two Connection Methods:**

##### Method A: Pair with Pairing Code (Recommended)
1. Tap **Pair device with pairing code**
2. Note the **IP address**, **Port**, and **Pairing Code**
3. Keep this screen open
4. In the app, click **Connect Device** → **Android** → **Manual**
5. Enter the IP, Port, and Pairing Code
6. Click **Connect**

##### Method B: Auto-connect via same network
1. Ensure wireless debugging is enabled
2. Note the IP address shown
3. In the app, click **Connect Device** → **Android** → **Auto Scan**
4. Your device should appear in the list

#### Step 4: Verify Connection

1. Once connected, you'll see a green indicator in the app
2. The device name and status will appear
3. Try navigating to a test URL

### Android Troubleshooting

**Issue: Device not found during scan**
- Ensure wireless debugging is enabled
- Check both devices are on same WiFi network
- Disable VPN on both devices
- Try restarting wireless debugging
- Try USB connection first, then wireless

**Issue: Connection drops frequently**
- WiFi signal may be weak - move closer to router
- Disable battery optimization for Chrome
- Keep screen on during testing
- Check firewall settings on computer

**Issue: Cannot enable wireless debugging**
- Ensure Android version is 11 or higher
- Check if Developer Options are enabled
- Try USB debugging first
- Restart device

---

## iOS Setup

### ⚠️ Important Note
iOS support is **limited** due to Apple's restrictions. USB connection and additional software are required.

### Requirements
- iOS device with Safari
- macOS computer (recommended)
- USB Lightning/USB-C cable
- Xcode Command Line Tools installed
- ios-webkit-debug-proxy installed

### Step-by-Step Setup

#### Step 1: Enable Web Inspector

1. Open **Settings** on your iOS device
2. Tap **Safari**
3. Tap **Advanced**
4. Enable **Web Inspector**

#### Step 2: Trust Computer

1. Connect device to Mac via USB cable
2. Unlock your device
3. When prompted, tap **Trust** on device
4. Enter device passcode

#### Step 3: Install Required Software (macOS)

##### Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

##### Install ios-webkit-debug-proxy
```bash
brew install ios-webkit-debug-proxy
```

##### Install libimobiledevice
```bash
brew install libimobiledevice
```

#### Step 4: Get Device UDID

```bash
idevice_id -l
```

Copy the UDID shown (a long hexadecimal string)

#### Step 5: Start WebKit Proxy

```bash
ios_webkit_debug_proxy -c <your-udid>:9221
```

Replace `<your-udid>` with the UDID from Step 4.

Keep this terminal window open while testing.

#### Step 6: Connect in App

1. In the app, click **Connect Device**
2. Select **iOS**
3. Follow the on-screen instructions
4. The app will attempt to connect via port 9221

### iOS Troubleshooting

**Issue: ios-webkit-debug-proxy not found**
```bash
# Check if installed
which ios_webkit_debug_proxy

# If not found, reinstall
brew reinstall ios-webkit-debug-proxy
```

**Issue: Cannot get UDID**
```bash
# Check if device is detected
idevice_id -l

# If not detected, check USB connection and trust status
```

**Issue: Proxy connection fails**
- Ensure proxy is running in terminal
- Check device is unlocked
- Verify Web Inspector is enabled
- Try disconnecting and reconnecting USB

**Issue: Features not working**
- iOS has limited automation capabilities
- Many features require Safari-specific protocols
- Touch events may not work as expected
- Screenshots may be limited

### iOS Limitations

iOS testing has several limitations:
- ⚠️ Requires USB connection (wireless very limited)
- ⚠️ Only Safari web views supported
- ⚠️ Touch event simulation limited
- ⚠️ No native app automation
- ⚠️ Requires additional software (ios-webkit-debug-proxy)
- ⚠️ May not work on all iOS versions

**Recommendation**: Focus on Android testing for full feature support. Use iOS only for Safari-specific web testing.

---

## Network Configuration

### WiFi Requirements

Both your computer and mobile device must be on the **same WiFi network**.

#### Check Network on Android
1. Settings → WiFi
2. Tap connected network
3. Note IP address (e.g., 192.168.1.100)

#### Check Network on Computer

**macOS:**
```bash
ifconfig | grep "inet "
```

**Windows:**
```cmd
ipconfig
```

**Linux:**
```bash
ip addr show
```

Ensure both devices have IP addresses in the same subnet (e.g., 192.168.1.x).

### Firewall Configuration

If connection fails, check firewall settings:

**macOS:**
1. System Settings → Network → Firewall
2. Allow incoming connections for:
   - ADB (port 5555)
   - Chrome DevTools (port 9222)
   - ios-webkit-debug-proxy (port 9221)

**Windows:**
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Allow ports: 5555, 9222, 9221

**Linux:**
```bash
# Allow ADB
sudo ufw allow 5555/tcp

# Allow CDP
sudo ufw allow 9222/tcp

# Allow iOS proxy
sudo ufw allow 9221/tcp
```

### Router Configuration

Some routers isolate devices on WiFi (AP Isolation):

1. Access router admin panel (usually 192.168.1.1 or 192.168.0.1)
2. Look for **AP Isolation**, **Client Isolation**, or **Guest Network**
3. **Disable** isolation features
4. Save and restart router

---

## Troubleshooting

### General Issues

#### "No devices found"
**Possible Causes:**
- Devices not on same network
- WiFi isolation enabled on router
- Firewall blocking connections
- Wireless debugging not enabled (Android)
- Web Inspector not enabled (iOS)

**Solutions:**
1. Verify network connectivity
2. Check firewall rules
3. Restart wireless debugging/proxy
4. Try USB connection first

#### "Connection timeout"
**Possible Causes:**
- Network latency too high
- Device locked/screen off
- WiFi signal weak
- Firewall blocking

**Solutions:**
1. Move closer to WiFi router
2. Keep device screen on
3. Disable battery optimization
4. Check firewall settings

#### "Device disconnects randomly"
**Possible Causes:**
- WiFi instability
- Battery optimization killing processes
- Device goes to sleep

**Solutions:**
1. Disable battery optimization for Chrome/Safari
2. Keep device plugged in
3. Enable "Stay awake" in Developer Options (Android)
4. Use stronger WiFi signal

### Android-Specific Issues

#### "ADB connection refused"
```bash
# Check ADB server
adb kill-server
adb start-server

# List devices
adb devices

# Reconnect
adb connect <device-ip>:5555
```

#### "Chrome DevTools port not accessible"
```bash
# Forward port manually
adb -s <device-id> forward tcp:9222 localabstract:chrome_devtools_remote

# Verify
curl http://localhost:9222/json
```

### iOS-Specific Issues

#### "ios-webkit-debug-proxy crashes"
```bash
# Kill existing processes
killall ios_webkit_debug_proxy

# Restart proxy
ios_webkit_debug_proxy -c <udid>:9221

# Check logs
ios_webkit_debug_proxy -d
```

#### "Device not responding"
1. Unlock device
2. Keep screen on
3. Ensure Safari is open
4. Try restarting proxy

---

## FAQ

### Q: Can I test on emulators/simulators?
**A:** Yes, Android emulators work the same way as physical devices. iOS simulators are not currently supported but planned for future release.

### Q: Do I need to keep the device connected via USB?
**A (Android):** No, wireless connection works fully once set up.
**A (iOS):** Yes, USB connection is required for iOS testing.

### Q: Can I test on multiple devices simultaneously?
**A:** Not in the current version. This feature is planned for Phase 2.

### Q: Why is iOS support so limited?
**A:** Apple's iOS has strict security restrictions that limit remote debugging capabilities. Android provides full CDP access, while iOS only offers limited WebKit protocol access.

### Q: What network ports are used?
**A:**
- **5555**: ADB wireless debugging (Android)
- **9222**: Chrome DevTools Protocol (Android)
- **9221**: ios-webkit-debug-proxy (iOS)

### Q: Can I use mobile data instead of WiFi?
**A:** No, both devices must be on the same WiFi network. Mobile data won't work.

### Q: Is VPN supported?
**A:** VPN may cause connection issues. Disable VPN on both devices for best results.

### Q: Can I test on 5G/LTE speeds?
**A:** Network throttling features are planned for future release. Currently, testing uses actual WiFi speed.

### Q: What happens if device goes to sleep?
**A:** Connection will be maintained but may become unresponsive. Re-establish connection or keep screen awake.

### Q: Can I rotate the device?
**A:** Device rotation support is planned for Sprint 3.

### Q: Are touch gestures supported?
**A:** Yes for Android (tap, swipe). iOS has limited touch support.

---

## Quick Reference

### Android Quick Setup
```
1. Settings → About → Tap "Build Number" 7x
2. Developer Options → Enable "USB Debugging"
3. Developer Options → Enable "Wireless Debugging"
4. Note IP and pair with code
5. Connect in app
```

### iOS Quick Setup
```
1. Settings → Safari → Advanced → Enable "Web Inspector"
2. Connect via USB and trust computer
3. brew install ios-webkit-debug-proxy libimobiledevice
4. idevice_id -l (get UDID)
5. ios_webkit_debug_proxy -c <udid>:9221
6. Connect in app
```

### Useful Commands

#### Android (ADB)
```bash
# List devices
adb devices

# Connect wireless
adb connect <ip>:5555

# Disconnect
adb disconnect <ip>:5555

# Forward CDP port
adb forward tcp:9222 localabstract:chrome_devtools_remote

# Check connection
curl http://localhost:9222/json
```

#### iOS
```bash
# List devices
idevice_id -l

# Get device info
ideviceinfo -u <udid>

# Start proxy
ios_webkit_debug_proxy -c <udid>:9221

# Check proxy
curl http://localhost:9221/json
```

---

## Support

For additional help:
- Check the troubleshooting section above
- Review [MOBILE_TROUBLESHOOTING.md](./MOBILE_TROUBLESHOOTING.md)
- Check application logs for error details
- Report issues on GitHub

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0 (Sprint 2)
