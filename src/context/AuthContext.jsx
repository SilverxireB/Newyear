import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db, googleProvider, isConfigured } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // Firebase auth kullanıcısı
  const [profile, setProfile] = useState(null) // Firestore users/{uid} dokümanı
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }
      const ref = doc(db, 'users', u.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        // Siteye ilk kayıt olan yönetici (admin) olur; sonrakiler üye.
        let role = 'member'
        try {
          const first = await getDocs(query(collection(db, 'users'), limit(1)))
          if (first.empty) role = 'admin'
        } catch {
          // okuma başarısızsa üye olarak devam et
        }
        await setDoc(ref, {
          uid: u.uid,
          name: u.displayName || u.email?.split('@')[0] || 'İsimsiz',
          email: u.email || '',
          photoURL: u.photoURL || '',
          familyId: null,
          role,
          createdAt: serverTimestamp(),
        })
      }
      // Profili canlı dinle (aile/rol değişirse anında yansısın)
      const unsubProfile = onSnapshot(ref, (s) => {
        setProfile(s.exists() ? s.data() : null)
        setLoading(false)
      })
      return unsubProfile
    })
    return () => unsub()
  }, [])

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
  const signOut = () => fbSignOut(auth)

  const value = {
    user,
    profile,
    loading,
    isConfigured,
    admin: profile?.role === 'admin',
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
