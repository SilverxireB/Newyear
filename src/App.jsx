import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Splash from './components/Splash.jsx'
import SetupNeeded from './pages/SetupNeeded.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Houses from './pages/Houses.jsx'
import Music from './pages/Music.jsx'
import Expenses from './pages/Expenses.jsx'
import Liste from './pages/Liste.jsx'
import Album from './pages/Album.jsx'
import Oyunlar from './pages/Oyunlar.jsx'
import Tombala from './pages/Tombala.jsx'
import Tabu from './pages/Tabu.jsx'
import Vampir from './pages/Vampir.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const { isConfigured, loading, user, admin } = useAuth()

  if (!isConfigured) return <SetupNeeded />
  // Splash sadece site/oturum yüklenene kadar görünür; zorunlu bekleme yok.
  if (loading) return <Splash />
  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ev" element={<Houses />} />
        <Route path="/muzik" element={<Music />} />
        <Route path="/masraf" element={<Expenses />} />
        <Route path="/liste" element={<Liste />} />
        <Route path="/album" element={<Album />} />
        <Route path="/oyunlar" element={<Oyunlar />} />
        <Route path="/tombala" element={<Tombala />} />
        <Route path="/tabu" element={<Tabu />} />
        <Route path="/vampir" element={<Vampir />} />
        <Route path="/yonetim" element={admin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
