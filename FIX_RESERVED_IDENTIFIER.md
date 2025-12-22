# Fix: Reserved Identifier Warnings in Xcode

## The Error

You're seeing errors like:
- `Identifier '_XCTSetApplicationStateTimeout' is reserved...`
- `Identifier '_XCTestCaseImplementation' is reserved...`

This happens with Xcode 15+ because WebDriverAgent uses private Apple APIs.

## Quick Fix (30 seconds in Xcode)

### Option 1: Disable the Warning for Both Targets

1. **In Xcode, select the WebDriverAgent project** (very top of the left sidebar, blue icon)

2. **Select WebDriverAgentLib target**

3. **Go to "Build Settings" tab** (not "Signing & Capabilities")

4. **Search for: "Other Warning Flags"** (use the search box at top right)

5. **Double-click the value column next to "Other Warning Flags"**

6. **Click the "+" button and add:**
   ```
   -Wno-reserved-identifier
   ```

7. **Repeat for WebDriverAgentRunner target:**
   - Click on "WebDriverAgentRunner" target
   - Build Settings tab
   - Search for "Other Warning Flags"
   - Add: `-Wno-reserved-identifier`

8. **Clean and Build:**
   - Press **Shift + Cmd + K** (Clean)
   - Press **Cmd + B** (Build)

### Option 2: Disable All Warnings (Fastest)

If you just want it to work quickly:

1. **Select WebDriverAgentLib target**
2. **Build Settings tab**
3. **Search for: "Treat Warnings as Errors"**
4. **Set to: NO** for both Debug and Release
5. **Repeat for WebDriverAgentRunner target**
6. **Clean and Build**

## After This Fix

The build should succeed! Then:
1. ✅ Build will complete successfully
2. ✅ WebDriverAgent will install on your iPhone
3. ✅ Continue with the signing steps (trust developer on device)

## Visual Guide

```
Xcode Sidebar:
  📁 WebDriverAgent (← Click the project, not folders)
    TARGETS
      📱 WebDriverAgentLib (← Select this first)
      📱 WebDriverAgentRunner (← Then this)
```

Then for each target:
```
Top tabs: General | Signing & Capabilities | Build Settings | ...
                                              ↑ Click this!

Search: "Other Warning Flags"  🔍

Other Warning Flags
  Debug         -Wno-reserved-identifier     (← Add this)
  Release       -Wno-reserved-identifier     (← Add this)
```

## Why This Happens

WebDriverAgent uses private Apple APIs (identifiers starting with `_` + capital letter). Apple reserves these for internal use, but WebDriverAgent needs them to control iOS. The warning is harmless for our use case.
