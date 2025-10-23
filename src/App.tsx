import { useProjectStore } from './store/projectStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'

function App() {
  const { currentPage } = useProjectStore()

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login />
      case 'dashboard':
        return <Dashboard />
      case 'project':
        return <ProjectView />
      default:
        return <Login />
    }
  }

  return <>{renderPage()}</>
}

export default App
