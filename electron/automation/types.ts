/**
 * Desktop Automation Types
 * Core type definitions for cross-platform desktop automation
 */

export interface DesktopApplication {
  /** Application process ID */
  pid: number;
  /** Application name */
  name: string;
  /** Application bundle identifier (macOS) or executable path (Windows) */
  identifier: string;
  /** Icon data URL (optional) */
  icon?: string;
  /** Whether app is currently focused */
  isFocused: boolean;
  /** Windows belonging to this application */
  windows: DesktopWindow[];
}

export interface DesktopWindow {
  /** Window ID */
  id: number;
  /** Window title */
  title: string;
  /** Bounding rectangle */
  bounds: WindowBounds;
  /** Whether window is visible */
  isVisible: boolean;
  /** Whether window is minimized */
  isMinimized: boolean;
  /** Whether window is maximized */
  isMaximized: boolean;
  /** Parent application PID */
  ownerPid: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIElement {
  /** Unique identifier for element */
  id: string;
  /** Element role/type (button, textfield, menu, etc.) */
  role: string;
  /** Element name/label */
  name?: string;
  /** Element value (for input fields) */
  value?: string;
  /** Element description */
  description?: string;
  /** Bounding rectangle */
  bounds: WindowBounds;
  /** Whether element is enabled */
  isEnabled: boolean;
  /** Whether element is focused */
  isFocused: boolean;
  /** Child elements */
  children: UIElement[];
  /** Platform-specific attributes */
  attributes: Record<string, any>;
  /** Path to element (for selection) */
  path: string;
}

export interface DesktopAction {
  id: string;
  type: DesktopActionType;
  target?: string; // Element path or identifier
  value?: any;
  coordinates?: { x: number; y: number }; // Window-relative coordinates (preferred) or absolute screen coordinates (legacy)
  windowBounds?: WindowBounds; // Window bounds when action was recorded (for coordinate conversion)
  modifiers?: KeyModifier[];
  description?: string;
  timestamp: number;
}

export type DesktopActionType =
  | 'app_launch'
  | 'app_focus'
  | 'app_quit'
  | 'window_focus'
  | 'window_minimize'
  | 'window_maximize'
  | 'window_restore'
  | 'window_close'
  | 'window_resize'
  | 'window_move'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'type'
  | 'press_key'
  | 'keyboard_shortcut'
  | 'mouse_move'
  | 'scroll'
  | 'drag_drop'
  | 'menu_select'
  | 'wait'
  | 'wait_for_element'
  | 'screenshot';

export type KeyModifier = 'command' | 'control' | 'alt' | 'shift' | 'meta';

export interface ActionExecutionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Platform-specific automation interface
 * Each platform (macOS, Windows) implements this interface
 */
export interface IPlatformAutomation {
  /** Get list of running applications */
  getRunningApplications(): Promise<DesktopApplication[]>;

  /** Get focused application */
  getFocusedApplication(): Promise<DesktopApplication | null>;

  /** Launch application by path or identifier */
  launchApplication(identifier: string): Promise<ActionExecutionResult>;

  /** Focus/activate application */
  focusApplication(pid: number): Promise<ActionExecutionResult>;

  /** Quit application */
  quitApplication(pid: number): Promise<ActionExecutionResult>;

  /** Get windows for an application */
  getApplicationWindows(pid: number): Promise<DesktopWindow[]>;

  /** Get UI element tree for a window */
  getElementTree(windowId: number): Promise<UIElement | null>;

  /** Find element by path */
  findElement(path: string): Promise<UIElement | null>;

  /** Execute desktop action */
  executeAction(action: DesktopAction): Promise<ActionExecutionResult>;

  /** Get element at screen coordinates */
  getElementAtPoint(x: number, y: number): Promise<UIElement | null>;

  /** Set recording callback for real-time events */
  setRecordingCallback(callback: (action: DesktopAction) => void): void;

  /** Start recording user actions */
  startRecording(): Promise<void>;

  /** Stop recording user actions */
  stopRecording(): Promise<DesktopAction[]>;

  /** Take screenshot */
  takeScreenshot(windowId?: number): Promise<string>; // Returns base64 image
}
