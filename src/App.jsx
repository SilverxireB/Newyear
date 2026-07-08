import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Splash from './components/Splash.jsx'
import SetupNeeded from './pages/SetupNeeded.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
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

  // Açılış animasyonu tadında izlensin diye splash en az 2.6 sn kalır.
  const [minWait, setMinWait] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setMinWait(false), 2600)
    return () => clearTimeout(t)
  }, [])

  if (!isConfigured) return <SetupNeeded />
  if (loading || minWait) return <Splash />
  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
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
