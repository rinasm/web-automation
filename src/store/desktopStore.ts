/**
 * Desktop Automation Store
 * Manages state for desktop automation features
 */

import { create } from 'zustand';

export interface DesktopApplication {
  pid: number;
  name: string;
  identifier: string;
  icon?: string;
  isFocused: boolean;
  windows: DesktopWindow[];
}

export interface DesktopWindow {
  id: number;
  title: string;
  bounds: WindowBounds;
  isVisible: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  ownerPid: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIElement {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  bounds: WindowBounds;
  isEnabled: boolean;
  isFocused: boolean;
  children: UIElement[];
  attributes: Record<string, any>;
  path: string;
}

export interface DesktopAction {
  id: string;
  type: DesktopActionType;
  target?: string;
  value?: any;
  coordinates?: { x: number; y: number };
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

export interface DesktopSequence {
  id: string;
  name: string;
  applicationPid: number;
  applicationName: string;
  actions: DesktopAction[];
  createdAt: number;
}

interface DesktopStore {
  // Applications
  runningApplications: DesktopApplication[];
  selectedApplication: DesktopApplication | null;
  focusedApplication: DesktopApplication | null;

  // Windows and Elements
  selectedWindow: DesktopWindow | null;
  elementTree: UIElement | null;
  selectedElement: UIElement | null;
  hoveredElement: UIElement | null;

  // Recording
  isRecording: boolean;
  recordedActions: DesktopAction[];
  recordingApplicationPid: number | null;
  recordingApplicationName: string | null;

  // Sequences
  savedSequences: DesktopSequence[];
  currentSequence: DesktopSequence | null;

  // Playback
  isPlaying: boolean;
  currentPlaybackIndex: number;

  // Inspector
  isInspecting: boolean;
  inspectorCursorPosition: { x: number; y: number } | null;

  // Platform
  platform: string | null;

  // Actions
  setRunningApplications: (apps: DesktopApplication[]) => void;
  setSelectedApplication: (app: DesktopApplication | null) => void;
  setFocusedApplication: (app: DesktopApplication | null) => void;
  setSelectedWindow: (window: DesktopWindow | null) => void;
  setElementTree: (tree: UIElement | null) => void;
  setSelectedElement: (element: UIElement | null) => void;
  setHoveredElement: (element: UIElement | null) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addRecordedAction: (action: DesktopAction) => void;
  clearRecordedActions: () => void;
  removeRecordedAction: (id: string) => void;
  saveSequence: (name: string) => void;
  loadSequence: (sequenceId: string) => void;
  deleteSequence: (sequenceId: string) => void;
  playSequence: (sequenceId: string) => Promise<void>;
  playRecordedActions: () => Promise<void>;
  stopPlayback: () => void;
  startInspecting: () => void;
  stopInspecting: () => void;
  setInspectorCursorPosition: (pos: { x: number; y: number } | null) => void;
  setPlatform: (platform: string) => void;
  refreshApplications: () => Promise<void>;
  launchApplication: (identifier: string) => Promise<boolean>;
  focusApplication: (pid: number) => Promise<boolean>;
  quitApplication: (pid: number) => Promise<boolean>;
  executeAction: (action: Omit<DesktopAction, 'id' | 'timestamp'>) => Promise<boolean>;
  executeFlow: (actions: DesktopAction[]) => Promise<boolean>;
  takeScreenshot: (windowId?: number) => Promise<string>;
}

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  // Initial state
  runningApplications: [],
  selectedApplication: null,
  focusedApplication: null,
  selectedWindow: null,
  elementTree: null,
  selectedElement: null,
  hoveredElement: null,
  isRecording: false,
  recordedActions: [],
  recordingApplicationPid: null,
  recordingApplicationName: null,
  savedSequences: [],
  currentSequence: null,
  isPlaying: false,
  currentPlaybackIndex: -1,
  isInspecting: false,
  inspectorCursorPosition: null,
  platform: null,

  // Actions
  setRunningApplications: (apps) => set({ runningApplications: apps }),

  setSelectedApplication: (app) => {
    set({ selectedApplication: app });
    if (app && app.windows.length > 0) {
      set({ selectedWindow: app.windows[0] });
    }
  },

  setFocusedApplication: (app) => set({ focusedApplication: app }),

  setSelectedWindow: (window) => set({ selectedWindow: window }),

  setElementTree: (tree) => set({ elementTree: tree }),

  setSelectedElement: (element) => set({ selectedElement: element }),

  setHoveredElement: (element) => set({ hoveredElement: element }),

  startRecording: async () => {
    const { selectedApplication } = get();

    if (!selectedApplication) {
      console.error('No application selected');
      return;
    }

    // Capture the application info before starting recording
    const appName = selectedApplication.name;

    console.log(`🎯 Preparing to record: ${appName}`);

    // Check if app is running and launch/focus it
    try {
      console.log(`🔍 Checking if ${appName} is running...`);
      const apps = await window.electronAPI.desktop.getRunningApplications();
      console.log(`📋 Found ${apps.length} running applications:`, apps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

      let matchingApp = apps.find((app: any) => app.name === appName);

      if (matchingApp) {
        // App is running, focus it
        console.log(`✅ Found running app: ${matchingApp.name} (PID: ${matchingApp.pid})`);
        const focusResult = await window.electronAPI.desktop.focusApplication(matchingApp.pid);

        if (focusResult.success) {
          console.log('✅ Application focused successfully');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('❌ Failed to focus running application');
          alert(`Failed to focus "${appName}". Recording cancelled.`);
          return;
        }
      } else {
        // App not running, need to launch it
        console.warn(`⚠️ Application "${appName}" not found in running apps, launching...`);
        console.log(`🚀 Calling launchApplication("${appName}")...`);

        const launchResult = await window.electronAPI.desktop.launchApplication(appName);
        console.log(`📤 Launch result:`, launchResult);

        if (launchResult.success) {
          console.log(`✅ Successfully launched ${appName}`);

          // Wait for app to fully launch
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Try multiple times to find the newly launched app
          let retries = 3;
          let newMatchingApp = null;

          while (retries > 0 && !newMatchingApp) {
            console.log(`🔍 Searching for launched app (attempt ${4 - retries}/3)...`);
            const newApps = await window.electronAPI.desktop.getRunningApplications();
            console.log(`📋 Found ${newApps.length} apps:`, newApps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

            newMatchingApp = newApps.find((app: any) => app.name === appName);

            if (newMatchingApp) {
              console.log(`✅ Found newly launched app: ${newMatchingApp.name} (PID: ${newMatchingApp.pid})`);
            } else {
              console.warn(`⚠️ App not found yet, ${retries - 1} retries remaining`);
              if (retries > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            retries--;
          }

          if (newMatchingApp) {
            matchingApp = newMatchingApp;
            const focusResult = await window.electronAPI.desktop.focusApplication(newMatchingApp.pid);
            if (focusResult.success) {
              console.log('✅ Application focused successfully');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error('❌ Failed to focus newly launched application');
              alert(`Failed to focus "${appName}". Recording cancelled.`);
              return;
            }
          } else {
            console.error(`❌ Failed to find ${appName} after launching`);
            alert(`Failed to launch "${appName}". Please start it manually and try again.`);
            return;
          }
        } else {
          console.error(`❌ Failed to launch ${appName}:`, launchResult.error);
          alert(`Failed to launch "${appName}". Please start it manually and try again.`);
          return;
        }
      }

      // At this point, matchingApp should be the running app with correct PID
      const appPid = matchingApp.pid;

      set({
        isRecording: true,
        recordedActions: [],
        recordingApplicationPid: appPid,
        recordingApplicationName: appName
      });

      // Set the recording application for window-relative coordinates
      if (appPid && window.electronAPI?.desktop?.setRecordingApplication) {
        await window.electronAPI.desktop.setRecordingApplication(appPid);
        console.log(`📌 Set recording application: ${appName} (PID: ${appPid})`);
      }

      // Set up listener for real-time action recording
      if (window.electronAPI?.desktop?.onActionRecorded) {
        const unsubscribe = window.electronAPI.desktop.onActionRecorded((action) => {
          console.log('🎯 Real-time action captured:', action);
          useDesktopStore.getState().addRecordedAction(action);
        });

        // Store unsubscribe function for cleanup
        (window as any)._desktopRecordingUnsubscribe = unsubscribe;
      }

      if (window.electronAPI?.desktop?.startRecording) {
        const result = await window.electronAPI.desktop.startRecording();

        // If recording failed, stop the recording state
        if (!result.success) {
          console.error('Failed to start recording:', result.error);
          set({
            isRecording: false,
            recordingApplicationPid: null,
            recordingApplicationName: null
          });

          // Clean up listener
          if ((window as any)._desktopRecordingUnsubscribe) {
            (window as any)._desktopRecordingUnsubscribe();
            (window as any)._desktopRecordingUnsubscribe = null;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error launching/focusing application:', error);
      alert(`Error launching/focusing application: ${error}`);
    }
  },

  stopRecording: () => {
    set({ isRecording: false });

    // Unsubscribe from real-time events
    if ((window as any)._desktopRecordingUnsubscribe) {
      (window as any)._desktopRecordingUnsubscribe();
      (window as any)._desktopRecordingUnsubscribe = null;
    }

    if (window.electronAPI?.desktop?.stopRecording) {
      window.electronAPI.desktop.stopRecording();
    }
  },

  addRecordedAction: (action) => {
    set((state) => ({
      recordedActions: [...state.recordedActions, action],
    }));
  },

  clearRecordedActions: () => set({ recordedActions: [] }),

  removeRecordedAction: (id) => {
    set((state) => ({
      recordedActions: state.recordedActions.filter((a) => a.id !== id),
    }));
  },

  saveSequence: (name: string) => {
    const { recordedActions, recordingApplicationPid, recordingApplicationName, savedSequences } = get();

    if (recordedActions.length === 0) {
      console.warn('No actions to save');
      return;
    }

    if (!recordingApplicationPid || !recordingApplicationName) {
      console.warn('No application info available');
      return;
    }

    const newSequence: DesktopSequence = {
      id: `sequence_${Date.now()}_${Math.random()}`,
      name,
      applicationPid: recordingApplicationPid,
      applicationName: recordingApplicationName,
      actions: [...recordedActions],
      createdAt: Date.now(),
    };

    const updatedSequences = [...savedSequences, newSequence];
    set({ savedSequences: updatedSequences });

    // Persist to localStorage
    try {
      localStorage.setItem('desktop_sequences', JSON.stringify(updatedSequences));
      console.log(`✅ Sequence "${name}" saved successfully`);
    } catch (error) {
      console.error('Failed to save sequence to localStorage:', error);
    }
  },

  loadSequence: (sequenceId: string) => {
    const { savedSequences } = get();
    const sequence = savedSequences.find(s => s.id === sequenceId);

    if (sequence) {
      set({
        currentSequence: sequence,
        recordedActions: [...sequence.actions],
        recordingApplicationPid: sequence.applicationPid,
        recordingApplicationName: sequence.applicationName,
      });
      console.log(`✅ Sequence "${sequence.name}" loaded`);
    } else {
      console.warn(`Sequence with id ${sequenceId} not found`);
    }
  },

  deleteSequence: (sequenceId: string) => {
    const { savedSequences } = get();
    const updatedSequences = savedSequences.filter(s => s.id !== sequenceId);
    set({ savedSequences: updatedSequences });

    // Update localStorage
    try {
      localStorage.setItem('desktop_sequences', JSON.stringify(updatedSequences));
      console.log(`✅ Sequence deleted successfully`);
    } catch (error) {
      console.error('Failed to update localStorage:', error);
    }
  },

  playSequence: async (sequenceId: string) => {
    const { savedSequences } = get();
    const sequence = savedSequences.find(s => s.id === sequenceId);

    if (!sequence) {
      console.error(`Sequence with id ${sequenceId} not found`);
      return;
    }

    console.log(`🎬 Playing sequence: ${sequence.name}`);
    console.log(`📱 Target application: ${sequence.applicationName} (PID: ${sequence.applicationPid})`);

    // Auto-focus the application before playback
    try {
      console.log(`🎯 Focusing application: ${sequence.applicationName} (Stored PID: ${sequence.applicationPid})`);

      // Always check if app is running first (don't trust stored PID)
      console.log(`🔍 Getting list of all running applications...`);
      const apps = await window.electronAPI.desktop.getRunningApplications();
      console.log(`📋 Found ${apps.length} running applications:`, apps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

      const matchingApp = apps.find((app: any) => app.name === sequence.applicationName);

      if (matchingApp) {
        // App is running, focus it
        console.log(`✅ Found running app: ${matchingApp.name} (PID: ${matchingApp.pid})`);
        const focusResult = await window.electronAPI.desktop.focusApplication(matchingApp.pid);

        if (focusResult.success) {
          console.log('✅ Application focused successfully');
          // Set playback application for window-relative coordinate conversion
          if (window.electronAPI?.desktop?.setPlaybackApplication) {
            await window.electronAPI.desktop.setPlaybackApplication(matchingApp.pid);
            console.log(`📌 Set playback application: ${matchingApp.name} (PID: ${matchingApp.pid})`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('❌ Failed to focus running application');
          alert(`Failed to focus "${sequence.applicationName}". Playback cancelled.`);
          return;
        }
      } else {
        // App not running, need to launch it
        console.warn(`⚠️ Application "${sequence.applicationName}" not found in running apps, launching...`);
        console.log(`🚀 Calling launchApplication("${sequence.applicationName}")...`);

        const launchResult = await window.electronAPI.desktop.launchApplication(sequence.applicationName);
        console.log(`📤 Launch result:`, launchResult);

        if (launchResult.success) {
          console.log(`✅ Successfully launched ${sequence.applicationName}`);

          // Wait for app to fully launch
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Try multiple times to find the newly launched app
          let retries = 3;
          let newMatchingApp = null;

          while (retries > 0 && !newMatchingApp) {
            console.log(`🔍 Searching for launched app (attempt ${4 - retries}/3)...`);
            const newApps = await window.electronAPI.desktop.getRunningApplications();
            console.log(`📋 Found ${newApps.length} apps:`, newApps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

            newMatchingApp = newApps.find((app: any) => app.name === sequence.applicationName);

            if (newMatchingApp) {
              console.log(`✅ Found newly launched app: ${newMatchingApp.name} (PID: ${newMatchingApp.pid})`);
            } else {
              console.warn(`⚠️ App not found yet, ${retries - 1} retries remaining`);
              if (retries > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            retries--;
          }

          if (newMatchingApp) {
            const focusResult = await window.electronAPI.desktop.focusApplication(newMatchingApp.pid);
            if (focusResult.success) {
              console.log('✅ Application focused successfully');
              // Set playback application for window-relative coordinate conversion
              if (window.electronAPI?.desktop?.setPlaybackApplication) {
                await window.electronAPI.desktop.setPlaybackApplication(newMatchingApp.pid);
                console.log(`📌 Set playback application: ${newMatchingApp.name} (PID: ${newMatchingApp.pid})`);
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error('❌ Failed to focus newly launched application');
              alert(`Failed to focus "${sequence.applicationName}". Playback cancelled.`);
              return;
            }
          } else {
            console.error(`❌ Failed to find ${sequence.applicationName} after launching`);
            console.log(`💡 Attempting to play anyway in case the app is running...`);
            // Continue anyway - the app might be running but getRunningApplications failed
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          console.error(`❌ Failed to launch ${sequence.applicationName}:`, launchResult.error);
          alert(`Failed to launch "${sequence.applicationName}". Please start it manually and try again.`);
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error focusing application:', error);
      alert(`Error focusing application: ${error}`);
      return;
    }

    // Now play the sequence actions
    set({
      isPlaying: true,
      currentPlaybackIndex: 0,
      recordedActions: [...sequence.actions],
    });

    try {
      for (let i = 0; i < sequence.actions.length; i++) {
        // Check if playback was stopped
        if (!get().isPlaying) {
          console.log('⏹️ Playback stopped by user');
          break;
        }

        const action = sequence.actions[i];
        set({ currentPlaybackIndex: i });

        console.log(`▶️ Playing action ${i + 1}/${sequence.actions.length}:`, action.description);

        // Calculate delay from previous action - use exact timing, no cap
        if (i > 0) {
          const prevAction = sequence.actions[i - 1];
          const delay = action.timestamp - prevAction.timestamp;

          if (delay > 0) {
            console.log(`⏱️ Waiting ${delay}ms before next action`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Execute the action
        const result = await window.electronAPI.desktop.executeAction(action);

        if (!result.success) {
          console.error(`❌ Action ${i + 1} failed:`, result.error);
          // Continue with next action even if this one failed
        } else {
          console.log(`✅ Action ${i + 1} completed successfully`);
        }

        // Small delay between actions for visibility
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎉 Sequence playback completed');
    } catch (error) {
      console.error('❌ Playback error:', error);
    } finally {
      set({ isPlaying: false, currentPlaybackIndex: -1 });
    }
  },

  playRecordedActions: async () => {
    const { recordedActions, recordingApplicationPid, recordingApplicationName } = get();

    if (recordedActions.length === 0) {
      console.log('No actions to play');
      return;
    }

    console.log(`🎬 Starting playback of ${recordedActions.length} actions`);

    // Auto-focus the application before playback if we have the application info
    if (recordingApplicationPid && recordingApplicationName) {
      try {
        console.log(`🎯 Focusing application: ${recordingApplicationName} (Stored PID: ${recordingApplicationPid})`);

        // Always check if app is running first (don't trust stored PID)
        console.log(`🔍 Getting list of all running applications...`);
        const apps = await window.electronAPI.desktop.getRunningApplications();
        console.log(`📋 Found ${apps.length} running applications:`, apps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

        const matchingApp = apps.find((app: any) => app.name === recordingApplicationName);

        if (matchingApp) {
          // App is running, focus it
          console.log(`✅ Found running app: ${matchingApp.name} (PID: ${matchingApp.pid})`);
          const focusResult = await window.electronAPI.desktop.focusApplication(matchingApp.pid);

          if (focusResult.success) {
            console.log('✅ Application focused successfully');
            // Set playback application for window-relative coordinate conversion
            if (window.electronAPI?.desktop?.setPlaybackApplication) {
              await window.electronAPI.desktop.setPlaybackApplication(matchingApp.pid);
              console.log(`📌 Set playback application: ${matchingApp.name} (PID: ${matchingApp.pid})`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error('❌ Failed to focus running application');
            alert(`Failed to focus "${recordingApplicationName}". Playback cancelled.`);
            return;
          }
        } else {
          // App not running, need to launch it
          console.warn(`⚠️ Application "${recordingApplicationName}" not found in running apps, launching...`);
          console.log(`🚀 Calling launchApplication("${recordingApplicationName}")...`);

          const launchResult = await window.electronAPI.desktop.launchApplication(recordingApplicationName);
          console.log(`📤 Launch result:`, launchResult);

          if (launchResult.success) {
            console.log(`✅ Successfully launched ${recordingApplicationName}`);

            // Wait for app to fully launch
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Try multiple times to find the newly launched app
            let retries = 3;
            let newMatchingApp = null;

            while (retries > 0 && !newMatchingApp) {
              console.log(`🔍 Searching for launched app (attempt ${4 - retries}/3)...`);
              const newApps = await window.electronAPI.desktop.getRunningApplications();
              console.log(`📋 Found ${newApps.length} apps:`, newApps.map((a: any) => `${a.name} (PID: ${a.pid})`).join(', '));

              newMatchingApp = newApps.find((app: any) => app.name === recordingApplicationName);

              if (newMatchingApp) {
                console.log(`✅ Found newly launched app: ${newMatchingApp.name} (PID: ${newMatchingApp.pid})`);
              } else {
                console.warn(`⚠️ App not found yet, ${retries - 1} retries remaining`);
                if (retries > 1) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
              retries--;
            }

            if (newMatchingApp) {
              const focusResult = await window.electronAPI.desktop.focusApplication(newMatchingApp.pid);
              if (focusResult.success) {
                console.log('✅ Application focused successfully');
                // Set playback application for window-relative coordinate conversion
                if (window.electronAPI?.desktop?.setPlaybackApplication) {
                  await window.electronAPI.desktop.setPlaybackApplication(newMatchingApp.pid);
                  console.log(`📌 Set playback application: ${newMatchingApp.name} (PID: ${newMatchingApp.pid})`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                console.error('❌ Failed to focus newly launched application');
                alert(`Failed to focus "${recordingApplicationName}". Playback cancelled.`);
                return;
              }
            } else {
              console.error(`❌ Failed to find ${recordingApplicationName} after launching`);
              console.log(`💡 Attempting to play anyway in case the app is running...`);
              // Continue anyway - the app might be running but getRunningApplications failed
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.error(`❌ Failed to launch ${recordingApplicationName}:`, launchResult.error);
            alert(`Failed to launch "${recordingApplicationName}". Please start it manually and try again.`);
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error focusing application:', error);
        alert(`Error focusing application: ${error}`);
        return;
      }
    }

    set({ isPlaying: true, currentPlaybackIndex: 0 });

    try {
      for (let i = 0; i < recordedActions.length; i++) {
        // Check if playback was stopped
        if (!get().isPlaying) {
          console.log('⏹️ Playback stopped by user');
          break;
        }

        const action = recordedActions[i];
        set({ currentPlaybackIndex: i });

        console.log(`▶️ Playing action ${i + 1}/${recordedActions.length}:`, action.description);

        // Calculate delay from previous action - use exact timing, no cap
        if (i > 0) {
          const prevAction = recordedActions[i - 1];
          const delay = action.timestamp - prevAction.timestamp;

          if (delay > 0) {
            console.log(`⏱️ Waiting ${delay}ms before next action`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Execute the action
        const result = await window.electronAPI.desktop.executeAction(action);

        if (!result.success) {
          console.error(`❌ Action ${i + 1} failed:`, result.error);
          // Continue with next action even if this one failed
        } else {
          console.log(`✅ Action ${i + 1} completed successfully`);
        }

        // Small delay between actions for visibility
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎉 Playback completed');
    } catch (error) {
      console.error('❌ Playback error:', error);
    } finally {
      set({ isPlaying: false, currentPlaybackIndex: -1 });
    }
  },

  stopPlayback: () => {
    console.log('⏹️ Stopping playback');
    set({ isPlaying: false, currentPlaybackIndex: -1 });
  },

  startInspecting: () => set({ isInspecting: true }),

  stopInspecting: () => set({ isInspecting: false, hoveredElement: null }),

  setInspectorCursorPosition: (pos) => set({ inspectorCursorPosition: pos }),

  setPlatform: (platform) => set({ platform }),

  refreshApplications: async () => {
    try {
      const apps = await window.electronAPI.desktop.getRunningApplications();
      set({ runningApplications: apps });

      const focused = await window.electronAPI.desktop.getFocusedApplication();
      set({ focusedApplication: focused });
    } catch (error) {
      console.error('Failed to refresh applications:', error);
    }
  },

  launchApplication: async (identifier) => {
    try {
      const result = await window.electronAPI.desktop.launchApplication(identifier);
      if (result.success) {
        await get().refreshApplications();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to launch application:', error);
      return false;
    }
  },

  focusApplication: async (pid) => {
    try {
      const result = await window.electronAPI.desktop.focusApplication(pid);
      if (result.success) {
        await get().refreshApplications();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to focus application:', error);
      return false;
    }
  },

  quitApplication: async (pid) => {
    try {
      const result = await window.electronAPI.desktop.quitApplication(pid);
      if (result.success) {
        await get().refreshApplications();
        // Clear selection if the quit app was selected
        const state = get();
        if (state.selectedApplication?.pid === pid) {
          set({ selectedApplication: null, selectedWindow: null });
        }
      }
      return result.success;
    } catch (error) {
      console.error('Failed to quit application:', error);
      return false;
    }
  },

  executeAction: async (actionData) => {
    try {
      const action: DesktopAction = {
        ...actionData,
        id: `action_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
      };

      const result = await window.electronAPI.desktop.executeAction(action);

      if (result.success && get().isRecording) {
        get().addRecordedAction(action);
      }

      return result.success;
    } catch (error) {
      console.error('Failed to execute action:', error);
      return false;
    }
  },

  executeFlow: async (actions) => {
    try {
      const result = await window.electronAPI.desktop.executeFlow(actions);
      return result.success;
    } catch (error) {
      console.error('Failed to execute flow:', error);
      return false;
    }
  },

  takeScreenshot: async (windowId) => {
    try {
      return await window.electronAPI.desktop.takeScreenshot(windowId);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return '';
    }
  },
}));

// Initialize platform on load
if (typeof window !== 'undefined' && window.electronAPI?.desktop?.getPlatform) {
  window.electronAPI.desktop.getPlatform().then((platform) => {
    useDesktopStore.getState().setPlatform(platform);
  });
}

// Initialize saved sequences from localStorage
if (typeof window !== 'undefined') {
  try {
    const savedSequencesJson = localStorage.getItem('desktop_sequences');
    if (savedSequencesJson) {
      const savedSequences = JSON.parse(savedSequencesJson);
      useDesktopStore.setState({ savedSequences });
      console.log(`✅ Loaded ${savedSequences.length} saved sequence(s) from storage`);
    }
  } catch (error) {
    console.error('Failed to load saved sequences from localStorage:', error);
  }
}
