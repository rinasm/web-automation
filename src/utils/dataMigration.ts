/**
 * Data Migration Utility
 *
 * Handles migration from V1 (flow-based) to V2 (feature-based) architecture
 * Includes automatic backup, migration, and rollback capabilities
 */

import { Project } from '../store/projectStore'
import { Step } from '../store/stepStore'
import { Feature } from '../types/feature'
import { getDataVersion, setDataVersion, CURRENT_VERSION } from './dataVersion'

// V1 Data Structures (Legacy)
interface V1Project {
  id: string
  title: string
  url: string
  description: string
  createdAt: number
  lastEdited: number
}

interface V1Step {
  id: string
  name: string
  actions: any[]
  createdAt: number
  flowId?: string
}

interface V1Flow {
  id: string
  name: string
  projectId: string
  steps: V1Step[]
  createdAt: number
}

// Migration Result
export interface MigrationResult {
  success: boolean
  version: number
  backupKey: string | null
  errors: string[]
  migratedProjects: number
  migratedFeatures: number
  migratedSteps: number
}

/**
 * Create backup of current localStorage data
 */
export function createBackup(): string {
  const timestamp = Date.now()
  const backupKey = `snaptest-backup-${timestamp}`

  const backup = {
    version: getDataVersion(),
    timestamp,
    data: {
      projects: localStorage.getItem('snaptest-project-storage'),
      steps: localStorage.getItem('snaptest-step-storage'),
      flows: localStorage.getItem('snaptest-flow-storage'),
      features: localStorage.getItem('snaptest-feature-storage'),
    }
  }

  localStorage.setItem(backupKey, JSON.stringify(backup))
  console.log('✅ [MIGRATION] Backup created:', backupKey)

  return backupKey
}

/**
 * Restore from backup
 */
export function restoreFromBackup(backupKey: string): boolean {
  try {
    const backupData = localStorage.getItem(backupKey)
    if (!backupData) {
      console.error('❌ [MIGRATION] Backup not found:', backupKey)
      return false
    }

    const backup = JSON.parse(backupData)

    // Restore all data
    if (backup.data.projects) {
      localStorage.setItem('snaptest-project-storage', backup.data.projects)
    }
    if (backup.data.steps) {
      localStorage.setItem('snaptest-step-storage', backup.data.steps)
    }
    if (backup.data.flows) {
      localStorage.setItem('snaptest-flow-storage', backup.data.flows)
    }
    if (backup.data.features) {
      localStorage.setItem('snaptest-feature-storage', backup.data.features)
    }

    // Restore version
    setDataVersion(backup.version)

    console.log('✅ [MIGRATION] Successfully restored from backup:', backupKey)
    return true

  } catch (error) {
    console.error('❌ [MIGRATION] Failed to restore backup:', error)
    return false
  }
}

/**
 * List all available backups
 */
export function listBackups(): Array<{ key: string; timestamp: number; version: number }> {
  const backups: Array<{ key: string; timestamp: number; version: number }> = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('snaptest-backup-')) {
      try {
        const backupData = localStorage.getItem(key)
        if (backupData) {
          const backup = JSON.parse(backupData)
          backups.push({
            key,
            timestamp: backup.timestamp,
            version: backup.version
          })
        }
      } catch (error) {
        console.error('Failed to parse backup:', key)
      }
    }
  }

  return backups.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Delete old backups (keep only last 5)
 */
export function cleanupOldBackups(): void {
  const backups = listBackups()

  // Keep only the 5 most recent backups
  if (backups.length > 5) {
    backups.slice(5).forEach(backup => {
      localStorage.removeItem(backup.key)
      console.log('🗑️ [MIGRATION] Deleted old backup:', backup.key)
    })
  }
}

/**
 * Migrate V1 data to V2
 */
export function migrateV1ToV2(): MigrationResult {
  const result: MigrationResult = {
    success: false,
    version: 2,
    backupKey: null,
    errors: [],
    migratedProjects: 0,
    migratedFeatures: 0,
    migratedSteps: 0
  }

  try {
    console.log('🚀 [MIGRATION] Starting V1 → V2 migration...')

    // Step 1: Create backup
    result.backupKey = createBackup()

    // Step 2: Load V1 data
    const v1Projects = loadV1Projects()
    const v1Flows = loadV1Flows()
    const v1Steps = loadV1Steps()

    console.log('📊 [MIGRATION] Found V1 data:', {
      projects: v1Projects.length,
      flows: v1Flows.length,
      steps: v1Steps.length
    })

    // Step 3: Migrate projects
    const v2Projects: Project[] = v1Projects.map(v1Project => ({
      id: v1Project.id,
      title: v1Project.title,
      webUrl: v1Project.url,  // Migrate url → webUrl
      currentPlatform: 'web' as const,
      description: v1Project.description,
      createdAt: v1Project.createdAt,
      lastEdited: v1Project.lastEdited
    }))

    result.migratedProjects = v2Projects.length

    // Step 4: Migrate flows → features
    const v2Features: Feature[] = []

    v1Projects.forEach(project => {
      // Get all flows for this project
      const projectFlows = v1Flows.filter(flow => flow.projectId === project.id)

      if (projectFlows.length > 0) {
        // Create a feature for each flow
        projectFlows.forEach(flow => {
          const flowSteps = flow.steps || v1Steps.filter(s => s.flowId === flow.id)

          const feature: Feature = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name: flow.name || 'Legacy Flow',
            descriptionWeb: `Migrated from V1 flow: ${flow.name}`,
            stepsWeb: flowSteps.map((step, index) => ({
              ...step,
              order: index,
              featureId: undefined,  // Will be set by feature store
              platform: 'web' as const
            })),
            stepsMobile: [],
            status: 'draft',
            createdAt: flow.createdAt || Date.now(),
            lastEdited: Date.now()
          }

          v2Features.push(feature)
          result.migratedSteps += flowSteps.length
        })
      } else {
        // Project has no flows, create empty "Legacy Flow" feature
        const feature: Feature = {
          id: crypto.randomUUID(),
          projectId: project.id,
          name: 'Legacy Flow',
          descriptionWeb: 'Automatically created during V1 → V2 migration',
          stepsWeb: [],
          stepsMobile: [],
          status: 'draft',
          createdAt: project.createdAt,
          lastEdited: Date.now()
        }

        v2Features.push(feature)
      }
    })

    result.migratedFeatures = v2Features.length

    // Step 5: Save V2 data
    saveV2Projects(v2Projects)
    saveV2Features(v2Features)

    // Step 6: Update data version
    setDataVersion(2)

    // Step 7: Cleanup old backups
    cleanupOldBackups()

    result.success = true
    console.log('✅ [MIGRATION] Migration completed successfully:', result)

  } catch (error: any) {
    result.errors.push(error.message || 'Unknown migration error')
    console.error('❌ [MIGRATION] Migration failed:', error)

    // Attempt rollback
    if (result.backupKey) {
      console.log('🔄 [MIGRATION] Attempting rollback...')
      const rollbackSuccess = restoreFromBackup(result.backupKey)
      if (rollbackSuccess) {
        console.log('✅ [MIGRATION] Rollback successful')
      } else {
        console.error('❌ [MIGRATION] Rollback failed')
      }
    }
  }

  return result
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const currentVersion = getDataVersion()
  return currentVersion < CURRENT_VERSION
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  currentVersion: number
  targetVersion: number
  needsMigration: boolean
  hasBackups: boolean
} {
  const currentVersion = getDataVersion()
  const backups = listBackups()

  return {
    currentVersion,
    targetVersion: CURRENT_VERSION,
    needsMigration: currentVersion < CURRENT_VERSION,
    hasBackups: backups.length > 0
  }
}

// Helper functions for loading V1 data

function loadV1Projects(): V1Project[] {
  try {
    const data = localStorage.getItem('snaptest-project-storage')
    if (!data) return []

    const parsed = JSON.parse(data)
    return parsed.state?.projects || []
  } catch (error) {
    console.error('Failed to load V1 projects:', error)
    return []
  }
}

function loadV1Flows(): V1Flow[] {
  try {
    const data = localStorage.getItem('snaptest-flow-storage')
    if (!data) return []

    const parsed = JSON.parse(data)
    return parsed.state?.flows || []
  } catch (error) {
    console.error('Failed to load V1 flows:', error)
    return []
  }
}

function loadV1Steps(): V1Step[] {
  try {
    const data = localStorage.getItem('snaptest-step-storage')
    if (!data) return []

    const parsed = JSON.parse(data)
    return parsed.state?.steps || []
  } catch (error) {
    console.error('Failed to load V1 steps:', error)
    return []
  }
}

// Helper functions for saving V2 data

function saveV2Projects(projects: Project[]): void {
  const data = {
    state: {
      projects,
      currentProjectId: null,
      openProjectTabs: [],
      currentPage: 'login',
      isAuthenticated: false,
      username: ''
    },
    version: 0
  }

  localStorage.setItem('snaptest-project-storage', JSON.stringify(data))
  console.log('✅ [MIGRATION] Saved V2 projects:', projects.length)
}

function saveV2Features(features: Feature[]): void {
  const data = {
    state: {
      features,
      currentFeatureId: null
    },
    version: 0
  }

  localStorage.setItem('snaptest-feature-storage', JSON.stringify(data))
  console.log('✅ [MIGRATION] Saved V2 features:', features.length)
}
