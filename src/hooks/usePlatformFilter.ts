/**
 * Platform Filter Hook
 *
 * Provides filtering utilities for platform-specific data
 * Enforces strict platform visibility rules
 */

import { useMemo } from 'react'
import { PlatformType, Feature } from '../types/feature'
import { Step } from '../store/stepStore'
import { useProjectStore } from '../store/projectStore'
import { useMobileDeviceStore } from '../store/mobileDeviceStore'

/**
 * Hook for filtering features and steps based on current platform
 * Uses the global mode toggle to determine which platform to show
 */
export function usePlatformFilter(projectId: string | null) {
  const { projects } = useProjectStore()
  const { currentMode } = useMobileDeviceStore()

  // Get current platform from global mode toggle
  const currentPlatform: PlatformType | null = useMemo(() => {
    if (!projectId) return null
    // Use global currentMode (web/mobile) as the platform
    return currentMode as PlatformType
  }, [projectId, currentMode])

  /**
   * Filter steps from a feature based on current platform
   */
  const filterSteps = useMemo(() => {
    return (feature: Feature): Step[] => {
      if (!currentPlatform) return []

      if (currentPlatform === 'web') {
        return feature.stepsWeb
      } else {
        return feature.stepsMobile
      }
    }
  }, [currentPlatform])

  /**
   * Get description for a feature based on current platform
   */
  const getFeatureDescription = useMemo(() => {
    return (feature: Feature): string | undefined => {
      if (!currentPlatform) return undefined

      if (currentPlatform === 'web') {
        return feature.descriptionWeb
      } else {
        return feature.descriptionMobile
      }
    }
  }, [currentPlatform])

  /**
   * Check if a feature has steps for current platform
   */
  const hasStepsForPlatform = useMemo(() => {
    return (feature: Feature): boolean => {
      if (!currentPlatform) return false

      if (currentPlatform === 'web') {
        return feature.stepsWeb.length > 0
      } else {
        return feature.stepsMobile.length > 0
      }
    }
  }, [currentPlatform])

  /**
   * Get step count for current platform
   */
  const getStepCount = useMemo(() => {
    return (feature: Feature): number => {
      if (!currentPlatform) return 0

      if (currentPlatform === 'web') {
        return feature.stepsWeb.length
      } else {
        return feature.stepsMobile.length
      }
    }
  }, [currentPlatform])

  /**
   * Check if project is configured for current platform
   */
  const isPlatformConfigured = useMemo(() => {
    if (!projectId || !currentPlatform) return false

    const project = projects.find((p: any) => p.id === projectId)
    if (!project) return false

    if (currentPlatform === 'web') {
      // Web requires webUrl
      return !!project.webUrl
    } else {
      // Mobile requires mobileApps config
      return !!(project.mobileApps?.ios || project.mobileApps?.android)
    }
  }, [projectId, currentPlatform, projects])

  /**
   * Get platform-specific configuration warning
   */
  const getPlatformWarning = useMemo(() => {
    if (!projectId || !currentPlatform) return null

    const project = projects.find((p: any) => p.id === projectId)
    if (!project) return null

    if (currentPlatform === 'web' && !project.webUrl) {
      return 'Please configure a Web URL for this project in Settings'
    }

    if (currentPlatform === 'mobile' && !project.mobileApps?.ios && !project.mobileApps?.android) {
      return 'Please configure iOS or Android app for this project in Settings'
    }

    return null
  }, [projectId, currentPlatform, projects])

  return {
    currentPlatform,
    filterSteps,
    getFeatureDescription,
    hasStepsForPlatform,
    getStepCount,
    isPlatformConfigured,
    getPlatformWarning,
  }
}

/**
 * Hook for checking if current view should show platform-specific content
 */
export function useIsPlatformActive(platform: PlatformType, projectId: string | null): boolean {
  const { currentPlatform } = usePlatformFilter(projectId)
  return currentPlatform === platform
}

/**
 * Hook for getting platform-specific CSS class
 */
export function usePlatformClass(projectId: string | null): string {
  const { currentPlatform } = usePlatformFilter(projectId)
  return `platform-${currentPlatform || 'none'}`
}
