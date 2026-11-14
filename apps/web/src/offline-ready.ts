/** A controlling SW alone does not prove the model and shell are cached. */
export async function checkOfflineReady() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  document.documentElement.dataset.offlineReady = 'false'
  try {
    await navigator.serviceWorker.ready
    const worker = navigator.serviceWorker.controller
    if (!worker) return
    const channel = new MessageChannel()
    const timer = setTimeout(() => channel.port1.close(), 15000)
    channel.port1.onmessage = (event: MessageEvent<{ ready: boolean }>) => {
      clearTimeout(timer)
      channel.port1.close()
      document.documentElement.dataset.offlineReady = String(event.data.ready)
      window.dispatchEvent(
        new CustomEvent('paper-magic-offline-ready', { detail: event.data.ready })
      )
    }
    worker.postMessage({ type: 'offline-status' }, [channel.port2])
  } catch {}
}
