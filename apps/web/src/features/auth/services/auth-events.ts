/** Invalidation only: identity is always reloaded from the Backend cookie. */
export function createAuthEvents(invalidate: () => void) {
  let channel: BroadcastChannel | null = null
  try { if(typeof BroadcastChannel !== 'undefined')channel=new BroadcastChannel('paper-magic-auth-v1') } catch { /* Browser may deny this capability. */ }
  if (channel) channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data
    if (data && typeof data === 'object' && (data as Record<string,unknown>).type === 'identity-changed' && (data as Record<string,unknown>).version === 1) invalidate()
  }
  return {
    publish() { try { channel?.postMessage({ type: 'identity-changed', version: 1 }) } catch { /* Focus refresh remains available. */ } },
    close() { channel?.close() },
  }
}
