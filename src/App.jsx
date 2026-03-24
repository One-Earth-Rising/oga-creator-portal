import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CharactersPage from './pages/CharactersPage'
import CharacterEditPage from './pages/CharacterEditPage'
import MintedAssetsPage from './pages/MintedAssetsPage'
import ScansPage from './pages/ScansPage'
import IPBrandsPage from './pages/IPBrandsPage';
import PortalPassesPage from './pages/PortalPassesPage';
import PortalPassBuilderPage from './pages/PortalPassBuilderPage';


function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-oga-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-oga-black flex items-center justify-center p-8">
        <div className="oga-card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold uppercase mb-4">Access Denied</h2>
          <p className="text-white/60 mb-2">
            Your account ({user.email}) is not authorized for the Creator Portal.
          </p>
          <p className="text-white/40 text-sm">
            Contact jan@oneearthrising.com for access.
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="characters" element={<CharactersPage />} />
                <Route path="characters/:id" element={<CharacterEditPage />} />
                <Route path="characters/new" element={<CharacterEditPage />} />
                <Route path="brands" element={<IPBrandsPage />} />
                <Route path="assets" element={<MintedAssetsPage />} />
                <Route path="scans" element={<ScansPage />} />
                <Route path="portal-passes" element={<PortalPassesPage />} />
                <Route path="/portal-passes/:id" element={<PortalPassBuilderPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
