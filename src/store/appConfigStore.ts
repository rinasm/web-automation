import { create } from 'zustand'

export interface AppConfig {
  targetAppBundleId: string | null  // null = use browser, string = launch native app
  targetAppName: string | null
}

interface AppConfigState extends AppConfig {
  setTargetApp: (bundleId: string | null, appName: string | null) => void
  clearTargetApp: () => void
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  // Default: Auto-launch MyTodoApp (set to null for Safari browser mode)
  targetAppBundleId: 'com.rinasmusthafa.MyTodoApp',
  targetAppName: 'My Todos',

  setTargetApp: (bundleId, appName) => set({
    targetAppBundleId: bundleId,
    targetAppName: appName
  }),

  clearTargetApp: () => set({
    targetAppBundleId: null,
    targetAppName: null
  })
}))
