import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Splash from './components/Splash.jsx'
import SetupNeeded from './pages/SetupNeeded.jsx'
import Login from './pages/Login.jsx'
import SelectFamily from './pages/SelectFamily.jsx'
import Home from './pages/Home.jsx'
import Expenses from './pages/Expenses.jsx'
import Tombala from './pages/Tombala.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const { isConfigured, loading, user, profile, admin } = useAuth()

  if (!isConfigured) return <SetupNeeded />
  if (loading) return <Splash />
  if (!user) return <Login />
  if (!profile?.familyId) return <SelectFamily />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/masraf" element={<Expenses />} />
        <Route path="/tombala" element={<Tombala />} />
        <Route path="/yonetim" element={admin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
