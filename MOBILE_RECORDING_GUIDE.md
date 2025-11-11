# Mobile Flow Recording Feature - Complete Guide

## Overview

The Mobile Flow Recording feature allows you to automatically record user interactions on physical iOS and Android devices and convert them into automated test scripts. Simply interact with your device naturally, and the system captures every tap, swipe, type, and gesture.

## Features

✅ **Real-time Recording**: Capture every interaction as it happens
✅ **Gesture Detection**: Automatically detect taps, swipes, long-presses, scrolls, and more
✅ **Smart Element Identification**: Capture XPath, accessibility IDs, and fallback coordinates
✅ **Live Preview**: See captured events in real-time during recording
✅ **Flow Playback**: Replay recorded flows instantly on the same or different devices
✅ **Code Export**: Generate Appium test scripts from recorded flows
✅ **Flow Optimization**: Automatically remove redundant actions and merge similar steps

## Architecture

### Core Components

1. **Recording Store** (`src/store/recordingStore.ts`)
   - Manages recording state (idle/recording/paused)
   - Stores captured events and recorded flows
   - Handles flow persistence

2. **Event Listener Service** (`src/services/mobileEventListener.ts`)
   - Captures touch events from device in real-time
   - Polls device every 50ms for new events
   - Extracts element information at touch points

3. **Gesture Analyzer** (`src/utils/gestureAnalyzer.ts`)
   - Analyzes touch sequences to detect gesture types
   - Distinguishes between tap, swipe, long-press, scroll, etc.
   - Calculates velocity, distance, and direction

4. **Recording Converter** (`src/utils/recordingConverter.ts`)
   - Converts recorded events to test steps
   - Optimizes flows (removes duplicates, merges actions)
   - Exports as Appium code

5. **UI Components**
   - **RecordingControls**: Start/Stop/Pause recording buttons
   - **RecordedEventsList**: Real-time event feed with details
   - **MobileRecordingPanel**: Complete recording interface

## How to Use

### Step 1: Connect Your Device

1. Connect your iOS or Android device via USB
2. Open the app and switch to Mobile mode
3. Select your device from the device selector
4. Wait for connection to establish

### Step 2: Start Recording

1. Navigate to the Mobile Recording panel
2. Click **"Start Recording"** button
3. The button will turn red and show recording status

```
🔴 Recording...  ⏱️ 00:05  📊 3 events
```

### Step 3: Interact with Your Device

Now interact with your physical device naturally:

- **Tap** buttons, links, or any UI element
- **Type** text in input fields
- **Swipe** to navigate or scroll
- **Long-press** for context menus
- **Double-tap** to zoom or select

Each interaction is captured automatically!

### Step 4: Monitor Captured Events

Watch the event list as you interact:

```
Recorded Events (5 events)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 👆 Tap on "Login Button"
   (185, 450) • 120ms

2. ⌨️ Type "john@example.com" in Email
   xpath: //input[@id='email']

3. 👆 Tap on "Password Field"
   (185, 520) • 95ms

4. ⌨️ Type "password123"
   xpath: //input[@type='password']

5. 👆 Tap on "Sign In"
   (185, 650) • 110ms
```

### Step 5: Stop and Save

1. Click **"Stop & Save"** when done
2. Enter a flow name: e.g., "Login Flow"
3. Optionally add description
4. Click **"Save Flow"**

Your flow is now saved and ready to use!

## Advanced Features

### Pause and Resume

Click **"Pause"** to temporarily stop recording without losing captured events.

- Recording timer pauses
- Events remain in memory
- Click **"Resume"** to continue

### Play Recorded Flow

Test your recorded flow immediately:

1. Click **"Play Flow"** after recording
2. The system executes each step on the device
3. Watch the playback in real-time
4. See success/failure status for each action

### Export as Code

Generate Appium test code from your recording:

1. Click **"Export Code"** button
2. Choose export format (JavaScript, Python, etc.)
3. Download generated test script
4. Run in your test automation framework

Example generated code:

```javascript
// Generated Appium test for Login Flow
const { remote } = require('webdriverio');

async function loginFlowTest() {
  const driver = await remote({
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest'
    }
  });

  try {
    // Step 1: Tap on Login Button
    const element0 = await driver.$('//button[@text="Login"]');
    await element0.click();

    // Step 2: Type "john@example.com" in Email
    const element1 = await driver.$('//input[@id="email"]');
    await element1.setValue('john@example.com');

    // Step 3: Tap on Password Field
    const element2 = await driver.$('//input[@type="password"]');
    await element2.click();

    // Step 4: Type "password123"
    await element2.setValue('password123');

    // Step 5: Tap on Sign In
    const element4 = await driver.$('//button[@text="Sign In"]');
    await element4.click();

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await driver.deleteSession();
  }
}
```

### Flow Optimization

The system automatically optimizes recorded flows:

**Before Optimization (10 events):**
```
1. Tap email field
2. Type "j"
3. Type "jo"
4. Type "joh"
5. Type "john@example.com"
6. Scroll down
7. Scroll down
8. Scroll down
9. Tap submit
10. Tap submit
```

**After Optimization (4 events):**
```
1. Tap email field
2. Type "john@example.com"
3. Scroll down
4. Tap submit
```

## Gesture Detection

### Supported Gestures

| Gesture | Detection Criteria | Example Use Case |
|---------|-------------------|------------------|
| **Tap** | Touch < 200ms, Movement < 10px | Click button, select item |
| **Long Press** | Hold > 500ms, Movement < 15px | Context menu, drag start |
| **Double Tap** | Two taps < 300ms apart | Zoom, text selection |
| **Swipe** | Movement > 50px, Velocity > 0.3px/ms | Navigate, dismiss |
| **Scroll** | Vertical movement > 30px | Browse content |
| **Pinch** | 2+ fingers | Zoom in/out |

### Element Identification Strategy

For each interaction, the system captures multiple selectors:

```typescript
{
  xpath: "//button[@text='Login']",          // Most reliable
  accessibilityId: "login_button",           // iOS native
  resourceId: "com.app:id/login_btn",        // Android native
  className: "android.widget.Button",         // Fallback
  text: "Login",                              // Fallback
  coordinates: { x: 180, y: 450 }            // Last resort
}
```

The playback engine tries selectors in order of reliability, falling back to coordinates if all else fails.

## Configuration

### Event Listener Settings

Customize recording behavior in `mobileEventListener.ts`:

```typescript
const listener = mobileEventListenerManager.createListener(
  device,
  callback,
  {
    captureScreenshots: false,      // Enable to capture screenshots per event
    throttleDelay: 200,              // Minimum ms between captured events
    includeSystemEvents: false,      // Capture OS-level events
    minimumGestureDuration: 50       // Min ms to count as valid gesture
  }
)
```

### Gesture Thresholds

Adjust gesture detection in `gestureAnalyzer.ts`:

```typescript
const THRESHOLDS = {
  TAP_MAX_DURATION: 200,             // Max ms for tap
  TAP_MAX_MOVEMENT: 10,              // Max px movement for tap
  LONG_PRESS_MIN_DURATION: 500,      // Min ms for long press
  SWIPE_MIN_DISTANCE: 50,            // Min px for swipe
  SWIPE_MIN_VELOCITY: 0.3,           // Min velocity for swipe
  SCROLL_MIN_DISTANCE: 30,           // Min px for scroll
  DOUBLE_TAP_MAX_INTERVAL: 300       // Max ms between taps
}
```

## Performance

### Recording Performance

- **Polling Rate**: 50ms (20 events/second max)
- **Event Capture**: < 5ms per event
- **Gesture Analysis**: < 10ms per gesture
- **Memory Usage**: ~1KB per recorded event

### Recommended Practices

✅ Keep recordings under 100 events
✅ Pause recording during long waits
✅ Use optimization after recording
✅ Test flows frequently during recording

## Troubleshooting

### Recording Not Starting

**Issue**: Click "Start Recording" but nothing happens

**Solutions**:
1. Check device connection status
2. Ensure Appium server is running
3. Verify device appears in device list
4. Check console for connection errors

### Events Not Being Captured

**Issue**: Interactions not showing in event list

**Solutions**:
1. Ensure recording is active (red indicator)
2. Check device screen is active (not locked)
3. Verify app is in foreground
4. Try pausing and resuming recording

### Playback Fails

**Issue**: Recorded flow doesn't replay correctly

**Solutions**:
1. Check element selectors are still valid
2. Verify app is in same state as recording
3. Add wait steps between actions
4. Use coordinate-based fallbacks for dynamic elements

### Missing Element Selectors

**Issue**: Events recorded with only coordinates

**Solutions**:
1. Ensure WebDriverAgent is running (iOS)
2. Check app accessibility labels are set
3. Use native element IDs where possible
4. Manually add selectors after recording

## Integration with Existing Flows

### Adding Recorded Steps to Manual Flows

```typescript
import { convertRecordedFlowToFlow } from './utils/recordingConverter'
import { useStepStore } from './store/stepStore'

// Convert recorded flow to steps
const convertedFlow = convertRecordedFlowToFlow(recordedFlow)

// Add to existing flow
convertedFlow.steps.forEach(step => {
  addStep(step)
})
```

### Combining Multiple Recordings

```typescript
// Merge multiple recordings into one flow
const mergedEvents = [
  ...loginRecording.events,
  ...searchRecording.events,
  ...checkoutRecording.events
]

const combinedFlow = saveRecordedFlow(
  { events: mergedEvents, ... },
  "Complete User Journey"
)
```

## API Reference

### Recording Store

```typescript
// Start recording
startRecording(deviceId: string, deviceName: string, platform: 'ios' | 'android')

// Pause/Resume
pauseRecording()
resumeRecording()

// Stop and get session
const session = stopRecording()

// Save flow
const flow = saveRecordedFlow(session, name, description)

// Get recorded flows
const flows = recordedFlows
const currentFlow = getCurrentFlow()
```

### Event Listener

```typescript
// Create listener
const listener = mobileEventListenerManager.createListener(device, callback, config)

// Start listening
await listener.start(eventCallback)

// Stop listening
await listener.stop()

// Check status
const isActive = listener.isActive()
```

### Gesture Analyzer

```typescript
// Analyze gesture from touch events
const gesture = gestureAnalyzer.analyzeGesture(touchEvents)

// Get gesture type
gesture.type // 'tap' | 'swipe' | 'longPress' | etc.

// Get gesture details
gesture.distance
gesture.velocity
gesture.direction
```

## Known Limitations

### iOS
- Requires WebDriverAgent to be installed
- Native app elements need accessibility IDs
- System gestures (Control Center, etc.) not captured

### Android
- Chrome DevTools Protocol required for web views
- Native elements need resource IDs
- Some system apps may be restricted

### General
- Cannot record biometric authentication
- Hardware button presses not captured
- App crashes during recording lose events
- Background app interactions not supported

## Future Enhancements

🚧 **Planned Features**:
- Visual assertion recording (screenshot comparison)
- Variable extraction from captured data
- Conditional logic insertion
- Loop detection and generation
- Multi-device recording (parallel flows)
- Smart wait generation based on timing
- AI-powered flow summarization

## Support

For issues, questions, or contributions:

- GitHub Issues: [Report a bug](https://github.com/your-repo/issues)
- Documentation: [Full docs](https://docs.your-project.com)
- Examples: See `examples/` directory

## License

MIT License - see LICENSE file for details

---

**Happy Recording! 🎬📱**
