// Cloudinary ayarları — bu değerler herkese açıktır (istemci tarafı, gizli değil).
// Kullanıcı "Cloud name" ve "unsigned upload preset" verince buraya gömülür.
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dah8lwcea'
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Claude'

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

// İmzasız (unsigned) yükleme — tarayıcıdan doğrudan Cloudinary'ye.
export async function uploadToCloudinary(fileOrBlob) {
  const form = new FormData()
  form.append('file', fileOrBlob)
  form.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Cloudinary yükleme hatası')
  return res.json() // { secure_url, public_id, width, height, ... }
}

// Cloudinary dönüşümlü URL (küçük resim / optimizasyon).
export function cldUrl(publicId, transform) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicId}`
}

// Tam boy indirme linki (fl_attachment -> tarayıcı indirir; f_jpg -> her cihazda açılır).
export function downloadUrl(publicId) {
  return cldUrl(publicId, 'fl_attachment,f_jpg,q_auto:best')
}

export function triggerDownload(publicId, name) {
  const a = document.createElement('a')
  a.href = downloadUrl(publicId)
  a.download = `${name || 'foto'}.jpg`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Tarayıcıda küçült (uzun kenar maxDim px, JPEG). Başarısızsa null döner -> orijinal yüklenir.
export function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width >= height && width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      }
      img.onerror = () => resolve(null)
      img.src = url
    } catch {
      resolve(null)
    }
  })
}
