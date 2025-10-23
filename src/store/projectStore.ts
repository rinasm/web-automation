import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  title: string
  url: string
  description: string
  createdAt: number
  lastEdited: number
}

interface ProjectState {
  projects: Project[]
  currentProjectId: string | null
  openProjectTabs: string[] // Array of project IDs
  currentPage: 'login' | 'dashboard' | 'project'
  isAuthenticated: boolean
  username: string

  // Actions
  login: (username: string) => void
  logout: () => void
  navigateTo: (page: 'login' | 'dashboard' | 'project') => void
  createProject: (title: string, url: string, description: string) => string
  deleteProject: (projectId: string) => void
  openProject: (projectId: string) => void
  closeProjectTab: (projectId: string) => void
  setCurrentProject: (projectId: string) => void
  updateProjectLastEdited: (projectId: string) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      currentProjectId: null,
      openProjectTabs: [],
      currentPage: 'login',
      isAuthenticated: false,
      username: '',

  login: (username: string) => {
    set({
      isAuthenticated: true,
      username,
      currentPage: 'dashboard'
    })
  },

  logout: () => {
    set({
      isAuthenticated: false,
      username: '',
      currentPage: 'login',
      currentProjectId: null,
      openProjectTabs: []
    })
  },

  navigateTo: (page: 'login' | 'dashboard' | 'project') => {
    set({ currentPage: page })
  },

  createProject: (title: string, url: string, description: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      url,
      description,
      createdAt: Date.now(),
      lastEdited: Date.now(),
    }

    set((state) => ({
      projects: [...state.projects, newProject],
      currentProjectId: newProject.id,
      openProjectTabs: [...state.openProjectTabs, newProject.id],
      currentPage: 'project'
    }))

    return newProject.id
  },

  deleteProject: (projectId: string) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      openProjectTabs: state.openProjectTabs.filter(id => id !== projectId),
      currentProjectId: state.currentProjectId === projectId
        ? (state.openProjectTabs.length > 1
            ? state.openProjectTabs[0]
            : null)
        : state.currentProjectId
    }))
  },

  openProject: (projectId: string) => {
    set((state) => {
      const isAlreadyOpen = state.openProjectTabs.includes(projectId)
      return {
        currentProjectId: projectId,
        openProjectTabs: isAlreadyOpen
          ? state.openProjectTabs
          : [...state.openProjectTabs, projectId],
        currentPage: 'project'
      }
    })
  },

  closeProjectTab: (projectId: string) => {
    set((state) => {
      const newOpenTabs = state.openProjectTabs.filter(id => id !== projectId)
      const isCurrentProject = state.currentProjectId === projectId

      if (isCurrentProject) {
        if (newOpenTabs.length > 0) {
          return {
            openProjectTabs: newOpenTabs,
            currentProjectId: newOpenTabs[0],
            currentPage: 'project'
          }
        } else {
          return {
            openProjectTabs: newOpenTabs,
            currentProjectId: null,
            currentPage: 'dashboard'
          }
        }
      }

      return { openProjectTabs: newOpenTabs }
    })
  },

  setCurrentProject: (projectId: string) => {
    set({ currentProjectId: projectId, currentPage: 'project' })
  },

  updateProjectLastEdited: (projectId: string) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, lastEdited: Date.now() }
          : project
      ),
    }))
  },
}),
    {
      name: 'snaptest-project-storage',
    }
  )
)
