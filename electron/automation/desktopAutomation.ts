/**
 * Desktop Automation Service
 * Cross-platform automation service that delegates to platform-specific implementations
 */

import { platform } from 'os';
import { MacAutomation } from './macAutomation';
import { WindowsAutomation } from './windowsAutomation';
import {
  IPlatformAutomation,
  DesktopApplication,
  DesktopWindow,
  UIElement,
  DesktopAction,
  ActionExecutionResult,
} from './types';

class DesktopAutomationService {
  private automation: IPlatformAutomation;

  constructor() {
    // Initialize platform-specific automation
    const currentPlatform = platform();

    if (currentPlatform === 'darwin') {
      this.automation = new MacAutomation();
      console.log('🍎 Desktop Automation initialized for macOS');
    } else if (currentPlatform === 'win32') {
      this.automation = new WindowsAutomation();
      console.log('🪟 Desktop Automation initialized for Windows');
    } else {
      throw new Error(`Unsupported platform: ${currentPlatform}`);
    }
  }

  /**
   * Get list of all running applications
   */
  async getRunningApplications(): Promise<DesktopApplication[]> {
    return this.automation.getRunningApplications();
  }

  /**
   * Get currently focused/active application
   */
  async getFocusedApplication(): Promise<DesktopApplication | null> {
    return this.automation.getFocusedApplication();
  }

  /**
   * Launch an application
   * @param identifier - Application name, bundle ID (macOS), or path (Windows)
   */
  async launchApplication(identifier: string): Promise<ActionExecutionResult> {
    return this.automation.launchApplication(identifier);
  }

  /**
   * Focus/activate an application
   * @param pid - Process ID of the application
   */
  async focusApplication(pid: number): Promise<ActionExecutionResult> {
    return this.automation.focusApplication(pid);
  }

  /**
   * Quit/close an application
   * @param pid - Process ID of the application
   */
  async quitApplication(pid: number): Promise<ActionExecutionResult> {
    return this.automation.quitApplication(pid);
  }

  /**
   * Get all windows for a specific application
   * @param pid - Process ID of the application
   */
  async getApplicationWindows(pid: number): Promise<DesktopWindow[]> {
    return this.automation.getApplicationWindows(pid);
  }

  /**
   * Get UI element tree for a window
   * @param windowId - Window identifier
   */
  async getElementTree(windowId: number): Promise<UIElement | null> {
    return this.automation.getElementTree(windowId);
  }

  /**
   * Find UI element by path
   * @param path - Element path/selector
   */
  async findElement(path: string): Promise<UIElement | null> {
    return this.automation.findElement(path);
  }

  /**
   * Execute a desktop automation action
   * @param action - Action to execute
   */
  async executeAction(action: DesktopAction): Promise<ActionExecutionResult> {
    console.log(`🎯 Executing action: ${action.type}`, action);
    return this.automation.executeAction(action);
  }

  /**
   * Get UI element at specific screen coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  async getElementAtPoint(x: number, y: number): Promise<UIElement | null> {
    return this.automation.getElementAtPoint(x, y);
  }

  /**
   * Set callback for real-time action recording
   * @param callback - Function to call when an action is recorded
   */
  setRecordingCallback(callback: (action: DesktopAction) => void): void {
    return this.automation.setRecordingCallback(callback);
  }

  /**
   * Set the application to record actions from
   * Must be called before startRecording() to enable window-relative coordinates
   * @param pid - Process ID of the application
   */
  setRecordingApplication(pid: number): void {
    if ('setRecordingApplication' in this.automation) {
      (this.automation as any).setRecordingApplication(pid);
    }
  }

  /**
   * Set the application for playback
   * Used to convert window-relative coordinates back to absolute during playback
   * @param pid - Process ID of the application
   */
  setPlaybackApplication(pid: number): void {
    if ('setPlaybackApplication' in this.automation) {
      (this.automation as any).setPlaybackApplication(pid);
    }
  }

  /**
   * Start recording user actions
   */
  async startRecording(): Promise<void> {
    return this.automation.startRecording();
  }

  /**
   * Stop recording and return recorded actions
   */
  async stopRecording(): Promise<DesktopAction[]> {
    return this.automation.stopRecording();
  }

  /**
   * Take screenshot
   * @param windowId - Optional window ID to capture specific window
   */
  async takeScreenshot(windowId?: number): Promise<string> {
    return this.automation.takeScreenshot(windowId);
  }

  /**
   * Execute a sequence of actions (flow)
   * @param actions - Array of actions to execute
   * @returns Results for each action
   */
  async executeFlow(actions: DesktopAction[]): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action);
      results.push(result);

      if (!result.success) {
        console.error(`❌ Action failed: ${action.type}`, result.error);
        // Continue executing remaining actions even if one fails
      }
    }

    return results;
  }

  /**
   * Get current platform
   */
  getPlatform(): string {
    return platform();
  }
}

// Export singleton instance
export const desktopAutomationService = new DesktopAutomationService();
