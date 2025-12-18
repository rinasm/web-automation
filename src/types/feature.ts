import { Step } from '../store/stepStore'

/**
 * Platform type for multi-platform support
 */
export type PlatformType = 'web' | 'mobile' | 'desktop'

/**
 * Feature status lifecycle
 */
export type FeatureStatus = 'draft' | 'generated' | 'needs_selectors' | 'completed'

/**
 * Feature - Core abstraction for test automation
 *
 * A single feature can have different implementations per platform.
 * For example, "User Login" might have:
 * - Web: Navigate → Fill form → Click button
 * - Mobile: Tap login → Fill username → Fill password → Tap sign in
 * - Desktop: Launch app → Click login button → Type credentials → Click sign in
 */
export interface Feature {
  id: string
  projectId: string
  name: string
  descriptionWeb?: string
  descriptionMobile?: string
  descriptionDesktop?: string
  stepsWeb: Step[]
  stepsMobile: Step[]
  stepsDesktop: Step[]
  status: FeatureStatus
  createdAt: number
  lastEdited: number
}

/**
 * Mobile app configuration for iOS
 */
export interface IOSAppConfig {
  bundleId: string
  appName: string
}

/**
 * Mobile app configuration for Android
 */
export interface AndroidAppConfig {
  packageName: string
  appName: string
}

/**
 * Mobile apps configuration (per-project)
 */
export interface MobileAppsConfig {
  ios?: IOSAppConfig
  android?: AndroidAppConfig
}
