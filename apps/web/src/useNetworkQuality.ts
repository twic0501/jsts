import { useEffect, useRef, useState } from 'react'

/** good = mạng ổn · poor = mạng yếu · offline = mất kết nối */
export type NetQuality = 'good' | 'poor' | 'offline'

type ConnectionInfo = {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}
type Connection = ConnectionInfo & {
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

/** Đánh giá chất lượng mạng từ các tín hiệu của trình duyệt (hàm thuần, dễ kiểm tra). */
export function assessNetwork(online: boolean, info?: ConnectionInfo | null): NetQuality {
  if (!online) return 'offline'
  if (info) {
    if (info.saveData) return 'poor' // người dùng bật chế độ tiết kiệm dữ liệu
    if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') return 'poor'
    if (typeof info.downlink === 'number' && info.downlink > 0 && info.downlink < 0.6) return 'poor'
    if (typeof info.rtt === 'number' && info.rtt > 1200) return 'poor'
  }
  return 'good'
}

const RANK: Record<NetQuality, number> = { good: 0, poor: 1, offline: 2 }

function readConnection(): Connection | undefined {
  return (navigator as Navigator & { connection?: Connection }).connection
}

/**
 * Theo dõi mạng. Xấu đi thì báo NGAY; tốt lên thì phải ổn định liên tục `recoverMs` mới báo,
 * để giao diện không nhấp nháy giữa 2D và 3D khi mạng chập chờn.
 */
export function useNetworkQuality(recoverMs = 4000): { quality: NetQuality; online: boolean } {
  const read = () => assessNetwork(navigator.onLine, readConnection())
  const [quality, setQuality] = useState<NetQuality>(read)
  const current = useRef(quality)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const apply = (next: NetQuality) => {
      current.current = next
      setQuality(next)
    }
    const update = () => {
      window.clearTimeout(timer.current)
      const next = read()
      if (RANK[next] >= RANK[current.current]) {
        apply(next) // xấu đi hoặc giữ nguyên: cập nhật ngay
        return
      }
      timer.current = window.setTimeout(() => apply(read()), recoverMs) // tốt lên: chờ ổn định
    }
    const connection = readConnection()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    connection?.addEventListener?.('change', update)
    update()
    return () => {
      window.clearTimeout(timer.current)
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      connection?.removeEventListener?.('change', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverMs])

  return { quality, online: quality !== 'offline' }
}
