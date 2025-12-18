/**
 * macOS Desktop Automation
 * Uses macOS Accessibility APIs and AppleScript for native app automation
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as robot from 'robotjs';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import {
  IPlatformAutomation,
  DesktopApplication,
  DesktopWindow,
  UIElement,
  DesktopAction,
  ActionExecutionResult,
} from './types';

const execAsync = promisify(exec);

export class MacAutomation implements IPlatformAutomation {
  private recordedActions: DesktopAction[] = [];
  private isRecordingActive: boolean = false;
  private recordingCallback: ((action: DesktopAction) => void) | null = null;
  private lastKeyPressed: { keycode: number; timestamp: number } | null = null;
  private keyDebounceTime: number = 100; // ms
  private recordingWindowBounds: { x: number; y: number; width: number; height: number } | null = null;
  private recordingApplicationPid: number | null = null;
  private playbackApplicationPid: number | null = null;

  async getRunningApplications(): Promise<DesktopApplication[]> {
    try {
      // Use AppleScript to get running applications
      const script = `tell application "System Events"
set appList to {}
repeat with proc in (every process whose background only is false)
set appInfo to {name of proc, unix id of proc, frontmost of proc}
set end of appList to appInfo
end repeat
return appList
end tell`;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/\n/g, '\n')}'`);
      const apps = this.parseAppleScriptList(stdout);

      const applications: DesktopApplication[] = [];
      for (let i = 0; i < apps.length; i += 3) {
        const name = apps[i];
        const pid = parseInt(apps[i + 1]);
        const isFocused = apps[i + 2] === 'true';

        // Create a simple window structure without recursive call
        const windows: DesktopWindow[] = [{
          id: pid, // Use PID as window ID for simplicity
          title: name,
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          ownerPid: pid,
        }];

        applications.push({
          pid,
          name,
          identifier: name, // Use name as identifier for now
          isFocused,
          windows,
        });
      }

      return applications;
    } catch (error) {
      console.error('Failed to get running applications:', error);
      return [];
    }
  }

  async getFocusedApplication(): Promise<DesktopApplication | null> {
    try {
      const script = `tell application "System Events"
set frontApp to first process whose frontmost is true
return {name of frontApp, unix id of frontApp}
end tell`;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/\n/g, '\n')}'`);
      const parts = this.parseAppleScriptList(stdout);

      if (parts.length >= 2) {
        const name = parts[0];
        const pid = parseInt(parts[1]);

        // Create a simple window structure without recursive call
        const windows: DesktopWindow[] = [{
          id: pid,
          title: name,
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          isVisible: true,
          isMinimized: false,
          isMaximized: false,
          ownerPid: pid,
        }];

        return {
          pid,
          name,
          identifier: name,
          isFocused: true,
          windows,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get focused application:', error);
      return null;
    }
  }

  async launchApplication(identifier: string): Promise<ActionExecutionResult> {
    try {
      const script = `tell application "${identifier}" to activate`;
      await execAsync(`osascript -e '${script}'`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to launch ${identifier}: ${(error as Error).message}`,
      };
    }
  }

  async focusApplication(pid: number): Promise<ActionExecutionResult> {
    try {
      // Get app name from PID using AppleScript
      const script = `tell application "System Events"
set targetProc to first process whose unix id is ${pid}
set appName to name of targetProc
tell application appName to activate
return appName
end tell`;

      await execAsync(`osascript -e '${script.replace(/\n/g, '\n')}'`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to focus application: ${(error as Error).message}`,
      };
    }
  }

  async quitApplication(pid: number): Promise<ActionExecutionResult> {
    try {
      // Get app name from PID using AppleScript
      const script = `tell application "System Events"
set targetProc to first process whose unix id is ${pid}
set appName to name of targetProc
tell application appName to quit
return appName
end tell`;

      await execAsync(`osascript -e '${script.replace(/\n/g, '\n')}'`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to quit application: ${(error as Error).message}`,
      };
    }
  }

  async getApplicationWindows(pid: number): Promise<DesktopWindow[]> {
    try {
      // Use AppleScript to get actual window bounds for the frontmost window of the application
      const script = `tell application "System Events"
set targetProc to first process whose unix id is ${pid}
set appName to name of targetProc

if (count of windows of targetProc) > 0 then
  set frontWindow to window 1 of targetProc
  set windowTitle to name of frontWindow
  set windowPosition to position of frontWindow
  set windowSize to size of frontWindow
  set windowX to item 1 of windowPosition
  set windowY to item 2 of windowPosition
  set windowWidth to item 1 of windowSize
  set windowHeight to item 2 of windowSize
  set windowVisible to visible of frontWindow
  set windowMinimized to (value of attribute "AXMinimized" of frontWindow) as boolean

  return {windowTitle, windowX, windowY, windowWidth, windowHeight, windowVisible, windowMinimized}
else
  return {"", 0, 0, 800, 600, true, false}
end if
end tell`;

      const { stdout } = await execAsync(`osascript <<'EOF'
${script}
EOF
`);
      const parts = this.parseAppleScriptList(stdout);

      if (parts.length >= 7) {
        const title = parts[0];
        const x = parseInt(parts[1]) || 0;
        const y = parseInt(parts[2]) || 0;
        const width = parseInt(parts[3]) || 800;
        const height = parseInt(parts[4]) || 600;
        const isVisible = parts[5] === 'true';
        const isMinimized = parts[6] === 'true';

        const windows: DesktopWindow[] = [{
          id: pid, // Use PID as window ID
          title,
          bounds: { x, y, width, height },
          isVisible,
          isMinimized,
          isMaximized: false, // macOS doesn't have a clear "maximized" state
          ownerPid: pid,
        }];

        return windows;
      }

      // Fallback if parsing failed
      return [{
        id: pid,
        title: `Window for PID ${pid}`,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        ownerPid: pid,
      }];
    } catch (error) {
      console.error('Failed to get application windows:', error);
      // Return fallback window structure
      return [{
        id: pid,
        title: `Window for PID ${pid}`,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isVisible: true,
        isMinimized: false,
        isMaximized: false,
        ownerPid: pid,
      }];
    }
  }

  async getElementTree(_windowId: number): Promise<UIElement | null> {
    // This would require macOS Accessibility API via native module
    // For now, return a placeholder structure
    return {
      id: 'root',
      role: 'window',
      name: 'Application Window',
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      isEnabled: true,
      isFocused: false,
      children: [],
      attributes: {},
      path: '/root',
    };
  }

  async findElement(_path: string): Promise<UIElement | null> {
    // Placeholder implementation
    return null;
  }

  async executeAction(action: DesktopAction): Promise<ActionExecutionResult> {
    try {
      // Helper function to convert window-relative coordinates to absolute screen coordinates
      const getAbsoluteCoordinates = async (coords: { x: number; y: number }, windowBounds?: { x: number; y: number; width: number; height: number }) => {
        // If action has windowBounds, it uses relative coordinates
        if (windowBounds && this.playbackApplicationPid) {
          try {
            // Get current window bounds for the playback application
            const windows = await this.getApplicationWindows(this.playbackApplicationPid);
            if (windows.length > 0 && windows[0].bounds) {
              const currentBounds = windows[0].bounds;
              const absoluteX = coords.x + currentBounds.x;
              const absoluteY = coords.y + currentBounds.y;
              console.log(`📍 Converting relative (${coords.x}, ${coords.y}) to absolute (${absoluteX}, ${absoluteY}) using window at (${currentBounds.x}, ${currentBounds.y})`);
              return { x: absoluteX, y: absoluteY };
            } else {
              console.warn(`⚠️ Could not get current window bounds, using stored window position`);
              return { x: coords.x + windowBounds.x, y: coords.y + windowBounds.y };
            }
          } catch (error) {
            console.error('❌ Error getting window bounds, using stored window position:', error);
            return { x: coords.x + windowBounds.x, y: coords.y + windowBounds.y };
          }
        }
        // No windowBounds means absolute coordinates (legacy or no window tracking)
        return coords;
      };

      switch (action.type) {
        case 'click':
          if (action.coordinates) {
            const coords = await getAbsoluteCoordinates(action.coordinates, action.windowBounds);
            robot.moveMouse(coords.x, coords.y);
            robot.mouseClick();
          }
          break;

        case 'double_click':
          if (action.coordinates) {
            const coords = await getAbsoluteCoordinates(action.coordinates, action.windowBounds);
            robot.moveMouse(coords.x, coords.y);
            robot.mouseClick('left', true);
          }
          break;

        case 'right_click':
          if (action.coordinates) {
            const coords = await getAbsoluteCoordinates(action.coordinates, action.windowBounds);
            robot.moveMouse(coords.x, coords.y);
            robot.mouseClick('right');
          }
          break;

        case 'type':
          if (action.value) {
            robot.typeString(action.value);
          }
          break;

        case 'press_key':
          if (action.value) {
            robot.keyTap(action.value, action.modifiers || []);
          }
          break;

        case 'keyboard_shortcut':
          if (action.value && action.modifiers) {
            robot.keyTap(action.value, action.modifiers);
          }
          break;

        case 'mouse_move':
          if (action.coordinates) {
            const coords = await getAbsoluteCoordinates(action.coordinates, action.windowBounds);
            robot.moveMouse(coords.x, coords.y);
          }
          break;

        case 'wait':
          if (action.value) {
            await new Promise((resolve) => setTimeout(resolve, action.value));
          }
          break;

        default:
          return { success: false, error: `Unsupported action type: ${action.type}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute action: ${(error as Error).message}`,
      };
    }
  }

  async getElementAtPoint(x: number, y: number): Promise<UIElement | null> {
    // This would require macOS Accessibility API to get element at point
    // For now, return a placeholder
    return {
      id: `element_${x}_${y}`,
      role: 'button',
      name: 'Unknown Element',
      bounds: { x, y, width: 100, height: 30 },
      isEnabled: true,
      isFocused: false,
      children: [],
      attributes: {},
      path: `/element_${x}_${y}`,
    };
  }

  setRecordingCallback(callback: (action: DesktopAction) => void) {
    this.recordingCallback = callback;
  }

  /**
   * Set the application to record actions from
   * Must be called before startRecording() to enable window-relative coordinates
   */
  setRecordingApplication(pid: number) {
    this.recordingApplicationPid = pid;
  }

  /**
   * Set the application for playback
   * Used to convert window-relative coordinates back to absolute during playback
   */
  setPlaybackApplication(pid: number) {
    this.playbackApplicationPid = pid;
  }

  async startRecording(): Promise<void> {
    this.recordedActions = [];
    this.isRecordingActive = true;
    this.lastKeyPressed = null; // Reset debounce tracking
    console.log('🔴 Recording started (macOS) - capturing real-time events');

    // Get window bounds for the recording application if available
    if (this.recordingApplicationPid) {
      try {
        const windows = await this.getApplicationWindows(this.recordingApplicationPid);
        if (windows.length > 0 && windows[0].bounds) {
          this.recordingWindowBounds = windows[0].bounds;
          console.log(`📐 Recording window bounds: (${this.recordingWindowBounds.x}, ${this.recordingWindowBounds.y}) ${this.recordingWindowBounds.width}x${this.recordingWindowBounds.height}`);
        } else {
          console.warn('⚠️ Could not get window bounds, will record absolute coordinates');
          this.recordingWindowBounds = null;
        }
      } catch (error) {
        console.error('❌ Failed to get window bounds:', error);
        this.recordingWindowBounds = null;
      }
    } else {
      console.warn('⚠️ No recording application PID set, will record absolute coordinates');
      this.recordingWindowBounds = null;
    }

    try {
      // Remove any existing listeners to prevent duplicates
      uIOhook.removeAllListeners();

      // Start listening to mouse events
      uIOhook.on('click', (event) => {
        if (!this.isRecordingActive) return;

        // Calculate relative coordinates if window bounds are available
        let relativeX = event.x;
        let relativeY = event.y;
        let description = `Click at screen (${event.x}, ${event.y})`;

        if (this.recordingWindowBounds) {
          relativeX = event.x - this.recordingWindowBounds.x;
          relativeY = event.y - this.recordingWindowBounds.y;
          description = `Click at window-relative (${relativeX}, ${relativeY}) [screen: (${event.x}, ${event.y})]`;
        }

        const action: DesktopAction = {
          id: `action_${Date.now()}_${Math.random()}`,
          type: 'click',
          coordinates: { x: relativeX, y: relativeY }, // Store as relative coordinates
          windowBounds: this.recordingWindowBounds ? { ...this.recordingWindowBounds } : undefined,
          description,
          timestamp: Date.now(),
        };

        this.recordedActions.push(action);

        // Notify callback if set
        if (this.recordingCallback) {
          this.recordingCallback(action);
        }

        console.log(`🖱️ ${description}`);
      });

      // Listen to keypress events
      uIOhook.on('keydown', (event) => {
        if (!this.isRecordingActive) return;

        const now = Date.now();

        // Debounce: Skip if same key was pressed within debounce time
        if (this.lastKeyPressed &&
            this.lastKeyPressed.keycode === event.keycode &&
            (now - this.lastKeyPressed.timestamp) < this.keyDebounceTime) {
          return; // Skip duplicate
        }

        // Update last key pressed
        this.lastKeyPressed = { keycode: event.keycode, timestamp: now };

        // Get the key name
        const keyName = this.getKeyName(event.keycode);

        const action: DesktopAction = {
          id: `action_${Date.now()}_${Math.random()}`,
          type: 'press_key',
          value: keyName,
          modifiers: this.getModifiers(event),
          description: `Press key: ${keyName}`,
          timestamp: now,
        };

        this.recordedActions.push(action);

        // Notify callback if set
        if (this.recordingCallback) {
          this.recordingCallback(action);
        }

        console.log(`⌨️ Captured keypress: ${keyName}`);
      });

      // Start the hook (this will crash the process if accessibility permissions are not granted)
      // We wrap this in a try-catch, but the library may crash before the catch executes
      uIOhook.start();

      console.log('✅ uIOhook started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.isRecordingActive = false;

      if (this.recordingCallback) {
        const errorAction: DesktopAction = {
          id: `error_${Date.now()}`,
          type: 'wait',
          description: 'ERROR: Failed to start recording. Accessibility permissions may be required.',
          timestamp: Date.now(),
        };
        this.recordingCallback(errorAction);
      }

      throw new Error('Recording failed: Accessibility permissions required. Please go to System Settings > Privacy & Security > Accessibility and enable permissions for this app.');
    }
  }

  async stopRecording(): Promise<DesktopAction[]> {
    this.isRecordingActive = false;
    this.lastKeyPressed = null; // Reset debounce tracking
    this.recordingWindowBounds = null; // Clear window bounds
    this.recordingApplicationPid = null; // Clear recording app PID
    console.log('⏹️ Recording stopped (macOS)');

    // Stop the hook
    uIOhook.stop();

    // Remove all event listeners to prevent duplicates on next recording
    uIOhook.removeAllListeners();

    return this.recordedActions;
  }

  private getKeyName(keycode: number): string {
    // Map common keycodes to names
    const keyMap: { [key: number]: string } = {
      [UiohookKey.A]: 'a', [UiohookKey.B]: 'b', [UiohookKey.C]: 'c',
      [UiohookKey.D]: 'd', [UiohookKey.E]: 'e', [UiohookKey.F]: 'f',
      [UiohookKey.G]: 'g', [UiohookKey.H]: 'h', [UiohookKey.I]: 'i',
      [UiohookKey.J]: 'j', [UiohookKey.K]: 'k', [UiohookKey.L]: 'l',
      [UiohookKey.M]: 'm', [UiohookKey.N]: 'n', [UiohookKey.O]: 'o',
      [UiohookKey.P]: 'p', [UiohookKey.Q]: 'q', [UiohookKey.R]: 'r',
      [UiohookKey.S]: 's', [UiohookKey.T]: 't', [UiohookKey.U]: 'u',
      [UiohookKey.V]: 'v', [UiohookKey.W]: 'w', [UiohookKey.X]: 'x',
      [UiohookKey.Y]: 'y', [UiohookKey.Z]: 'z',
      [UiohookKey.Space]: 'space',
      [UiohookKey.Enter]: 'enter',
      [UiohookKey.Backspace]: 'backspace',
      [UiohookKey.Tab]: 'tab',
      [UiohookKey.Escape]: 'escape',
      [UiohookKey.ArrowUp]: 'up',
      [UiohookKey.ArrowDown]: 'down',
      [UiohookKey.ArrowLeft]: 'left',
      [UiohookKey.ArrowRight]: 'right',
    };

    return keyMap[keycode] || `key_${keycode}`;
  }

  private getModifiers(event: any): ('command' | 'control' | 'alt' | 'shift')[] {
    const modifiers: ('command' | 'control' | 'alt' | 'shift')[] = [];

    if (event.shiftKey) modifiers.push('shift');
    if (event.ctrlKey) modifiers.push('control');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('command');

    return modifiers;
  }

  async takeScreenshot(_windowId?: number): Promise<string> {
    try {
      // Use macOS screencapture command
      const timestamp = Date.now();
      const path = `/tmp/screenshot_${timestamp}.png`;

      if (_windowId) {
        execSync(`screencapture -l ${_windowId} ${path}`);
      } else {
        execSync(`screencapture ${path}`);
      }

      // Read file as base64
      const fs = require('fs');
      const buffer = fs.readFileSync(path);
      const base64 = buffer.toString('base64');

      // Clean up temp file
      fs.unlinkSync(path);

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return '';
    }
  }

  /**
   * Parse AppleScript list output
   * AppleScript returns comma-separated values
   */
  private parseAppleScriptList(output: string): string[] {
    return output
      .trim()
      .split(',')
      .map((s) => s.trim());
  }
}
