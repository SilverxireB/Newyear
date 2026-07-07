import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const GAME = () => doc(db, 'tabu', 'current')

export function subscribeTabuGame(cb) {
  return onSnapshot(GAME(), (snap) => {
    if (snap.exists()) {
      cb(snap.data())
    } else {
      cb(null)
    }
  })
}

// Oyunu tamamen sıfırlama
export async function resetTabuGame() {
  await setDoc(GAME(), {
    status: 'setup',
    teams: [
      { name: 'Takım 1', score: 0 },
      { name: 'Takım 2', score: 0 },
    ],
    turn: 0,
    duration: 60,
    level: 0,
    startedBy: null,
    activeCard: null,
    round: { correct: 0, pass: 0, tabu: 0 },
    timeLeft: 60,
    expiresAt: null,
    playedCards: [],
  })
}

// Sadece ayarları (takımlar, süre, zorluk) güncelleme
export async function updateTabuSettings(updates) {
  try {
    await updateDoc(GAME(), updates)
  } catch (err) {
    if (err.code === 'not-found') {
      await resetTabuGame()
      await updateDoc(GAME(), updates)
    }
  }
}

// Turu başlatma (Narrator tarafından çağrılır)
export async function startTabuRound(uid, card, duration) {
  await updateDoc(GAME(), {
    status: 'playing',
    startedBy: uid,
    activeCard: card,
    round: { correct: 0, pass: 0, tabu: 0 },
    timeLeft: duration,
    expiresAt: Date.now() + duration * 1000,
  })
}

// Cevap (doğru, pas, tabu)
// playedCards dizisine ID veya kelimeyi atabiliriz ki deste yönetilsin, ama Tabu.jsx'de yerel deste ile idare de edebiliriz.
export async function submitTabuAnswer(type, newCard, currentRound) {
  const roundUpdate = { ...currentRound, [type]: currentRound[type] + 1 }
  await updateDoc(GAME(), {
    activeCard: newCard,
    round: roundUpdate,
  })
}

// Süreyi durdurma
export async function pauseTabuRound(timeLeft) {
  await updateDoc(GAME(), {
    status: 'paused',
    timeLeft,
    expiresAt: null,
  })
}

// Süreyi devam ettirme
export async function resumeTabuRound(timeLeft) {
  await updateDoc(GAME(), {
    status: 'playing',
    timeLeft,
    expiresAt: Date.now() + timeLeft * 1000,
  })
}

// Turu bitirme
export async function endTabuRound(teams, turn, passPenalty, correct, tabu) {
  const newTeams = teams.map((t, i) => {
    if (i !== turn) return t
    return { ...t, score: t.score + correct - tabu - passPenalty }
  })
  
  await updateDoc(GAME(), {
    status: 'roundEnd',
    teams: newTeams,
    activeCard: null,
    expiresAt: null,
    startedBy: null,
  })
}

// Sonraki tura geçme (Sırayı değiştir)
export async function nextTabuTurn(turn, totalTeams, duration) {
  await updateDoc(GAME(), {
    status: 'setup',
    turn: (turn + 1) % totalTeams,
    timeLeft: duration,
  })
}
