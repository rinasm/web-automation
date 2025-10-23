import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'

function Dashboard() {
  const { projects, openProject, username, logout, openProjectTabs, setCurrentProject } = useProjectStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const { createProject } = useProjectStore()

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectTitle.trim() && websiteUrl.trim()) {
      createProject(projectTitle, websiteUrl, projectDescription)
      // Reset form
      setProjectTitle('')
      setWebsiteUrl('')
      setProjectDescription('')
      setShowCreateModal(false)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">SnapTest</span>
          </div>

          {/* HOME Tab */}
          <button className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            HOME
          </button>

          {/* Open Project Tabs */}
          {openProjectTabs.map((projectId) => {
            const project = projects.find(p => p.id === projectId)
            if (!project) return null

            return (
              <div
                key={projectId}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all group"
              >
                <button
                  onClick={() => setCurrentProject(projectId)}
                  className="text-sm text-gray-700 font-medium"
                >
                  {project.title}
                </button>
                <button
                  onClick={() => useProjectStore.getState().closeProjectTab(projectId)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            )
          })}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{username}</span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-semibold">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={logout}
            className="ml-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 animate-fadeInUp">Recent projects</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Existing Project Cards */}
          {projects.map((project, index) => (
            <button
              key={project.id}
              onClick={() => openProject(project.id)}
              className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 text-left h-48 flex flex-col justify-between border border-gray-100 hover:border-indigo-200 hover:-translate-y-1 group animate-fadeInUp"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Edited {formatDate(project.lastEdited)}
                </p>
              </div>
            </button>
          ))}

          {/* Create New Project Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 hover:shadow-xl transition-all duration-300 h-48 flex flex-col items-center justify-center text-white hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-1 border border-indigo-500 animate-fadeInUp"
            style={{ animationDelay: `${projects.length * 0.1}s` }}
          >
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="text-lg font-semibold">Create a Project</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: backwards;
        }
      `}</style>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl transform animate-scaleIn">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">New Project</h2>
            <p className="text-gray-500 mb-8">Create a new automation testing project</p>

            <form onSubmit={handleCreateProject} className="space-y-5">
              {/* Project Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project title
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="My Awesome Project"
                  autoFocus
                  required
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="https://example.com"
                  required
                />
              </div>

              {/* About this project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  About this project
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  rows={3}
                  placeholder="Brief description of your test automation project..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Dashboard
