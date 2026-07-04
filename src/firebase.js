import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase web config — bu değerler tarayıcıda görünür, gizli değildir (Firebase böyle çalışır).
// Güvenlik firestore.rules ile sağlanır. İstenirse .env üzerinden de geçilebilir.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB19CFTbzWp-fAfUj0hkPG8Blsum8glfs0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'newyear-e7616.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'newyear-e7616',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'newyear-e7616.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '117875196870',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:117875196870:web:895238faf1cdec178e28c7',
}

// Config eksikse uygulama çökmesin, kurulum ekranı gösterelim.
export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app = null
let auth = null
let db = null

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

export const googleProvider = new GoogleAuthProvider()

export { app, auth, db }
