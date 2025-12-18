# Desktop Recording Setup Guide

## macOS Permissions Required

To enable real-time desktop recording (capturing mouse clicks and keyboard events), this application requires **Accessibility permissions** on macOS.

### Why These Permissions Are Needed

- **Accessibility API**: Required to capture global mouse and keyboard events across all applications
- **System Events**: Required to list running applications and manage windows

### How to Enable Permissions

#### 1. Enable Accessibility Permissions

1. **Open System Settings**
   - Click the Apple menu  → **System Settings**
   - Or search for "System Settings" in Spotlight (⌘ + Space)

2. **Navigate to Privacy & Security**
   - Click **Privacy & Security** in the sidebar
   - Scroll down and click **Accessibility**

3. **Grant Permission to Electron**
   - Click the **+** button or toggle switch
   - Find and select **Electron** (or the name of this app)
   - Enable the permission

4. **Restart the Application**
   - Completely quit the app (⌘ + Q)
   - Start it again with `npm run dev`

#### 2. Enable Automation Permissions (if prompted)

If you see a dialog asking for "System Events" access:
1. Click **OK** or **Allow**
2. The app will be added to **System Settings > Privacy & Security > Automation**

### What Gets Captured

Once permissions are enabled, the app will capture:
- ✅ **Mouse clicks** with exact screen coordinates
- ✅ **Keyboard events** including:
  - Individual key presses
  - Key combinations (Cmd, Shift, Alt, Ctrl)
  - Special keys (Enter, Escape, arrows, etc.)
- ✅ **Timestamps** for each action

### Troubleshooting

#### App Crashes When Starting Recording

**Error**: `Accessibility API is disabled!`

**Solution**:
1. Check that Accessibility permissions are enabled (see steps above)
2. Make sure you've restarted the app after granting permissions
3. Try removing and re-adding the app in Accessibility settings

#### Can't See Running Applications

**Error**: `System Events got an error: Can't get every process`

**Solution**:
1. Grant Accessibility permissions (this enables System Events access)
2. If prompted, also grant Automation permissions
3. Restart the app

#### Recording Not Capturing Events

**Checklist**:
- [ ] Accessibility permissions are enabled
- [ ] App has been restarted after enabling permissions
- [ ] You clicked "Start Recording" button
- [ ] A desktop application is selected
- [ ] The Electron app is in focus when clicking/typing

### Security Note

This app runs locally on your machine. All captured events stay on your device and are only used to generate test automation scripts. No data is sent to external servers.

### Alternative: Manual Recording Mode

If you prefer not to grant system-level permissions, you can still use the app in manual mode:
1. Disable real-time recording
2. Manually add actions with coordinates
3. Use screenshot tools to find element positions

---

## For Developers

### Building for Distribution

When packaging the app with `electron-builder`:
1. Update `Info.plist` to request permissions:
   ```xml
   <key>NSAppleEventsUsageDescription</key>
   <string>This app needs to control System Events to list running applications.</string>
   <key>NSSystemAdministrationUsageDescription</key>
   <string>This app needs to monitor system events for test automation.</string>
   ```

2. Code-sign the app properly for macOS Gatekeeper

### Testing Permissions

To test if permissions are granted:
```bash
# Check Accessibility permissions
osascript -e 'tell application "System Events" to get name of every process'
```

If this command works without errors, Accessibility permissions are granted.
