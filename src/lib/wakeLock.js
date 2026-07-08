import { useEffect } from 'react'

// Ekranı uyanık tutar (müzik/oyun sürerken telefon sönmesin).
// active=false verilirse bırakır. Sekmeye dönünce kilidi yeniden alır.
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined
    let lock = null
    let stopped = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // izin yok / desteklenmiyor — yoksay
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible' && !stopped) request()
    }
    request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVis)
      try {
        lock && lock.release()
      } catch {
        // yoksay
      }
    }
  }, [active])
}
