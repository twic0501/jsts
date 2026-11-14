import { openDB, type DBSchema } from 'idb'

export interface ReadingAnchor {
  versionId: string
  chunkId?: string | null
  page?: number | null
  progress: number
}

export interface ReadingState extends ReadingAnchor {
  id: string
  documentId: string
  revision: number
  updatedAt: string
}

type Condition = { 'If-Match': string } | { 'If-None-Match': '*' }
export interface PendingReadingState {
  ownerId: string
  documentId: string
  key: string
  anchor: ReadingAnchor
  condition: Condition
  queuedAt: number
}

interface ReadingDatabase extends DBSchema {
  pending: { key: [string, string]; value: PendingReadingState }
}

const database = () => openDB<ReadingDatabase>('paper-magic-reading-states', 1, {
  upgrade(db) { db.createObjectStore('pending', { keyPath: ['ownerId', 'documentId'] }) },
})
const stateUrl = (documentId: string) => '/api/v4/users/me/reading-states/' + encodeURIComponent(documentId)
const savedReceiptWindowMs = 86_400_000
const sameOrigin = { credentials: 'same-origin', cache: 'no-store' } as const

export class ReadingRequestError extends Error {
  constructor(readonly status: number, readonly code: string, readonly retryAfter: string | null = null) { super(code) }
}

async function requestError(response: Response) {
  const body = await response.json().catch(() => null)
  return new ReadingRequestError(response.status, body?.error?.code ?? 'READING_REQUEST_FAILED', response.headers.get('Retry-After'))
}

function readingFetch(url: string, init?: RequestInit) {
  const timeout = AbortSignal.timeout(10_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(url, { ...sameOrigin, ...init, signal })
}

export async function readingJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await readingFetch(url, signal ? { signal } : undefined)
  if (!response.ok) throw await requestError(response)
  return response.json() as Promise<T>
}

export async function readDocument<T>(url: string, signal: AbortSignal) {
  const response = await readingFetch(url, { signal })
  if (!response.ok) throw await requestError(response)
  return { ...(await response.json() as T), canManage: response.headers.get('X-Can-Manage-Document') === 'true' }
}

export async function writeDocument(ownerId: string, url: string, init: RequestInit, signal: AbortSignal) {
  const { csrfToken } = await currentSession(ownerId, signal)
  const headers = new Headers(init.headers)
  headers.set('X-CSRF-Token', csrfToken)
  const response = await readingFetch(url, { ...init, headers, signal })
  if (!response.ok) throw await requestError(response)
  return response
}

export async function readCurrentReadingState(documentId: string, signal?: AbortSignal) {
  const response = await readingFetch(stateUrl(documentId), signal ? { signal } : undefined)
  if (!response.ok) {
    const error = await requestError(response)
    if (error.status === 404 && error.code === 'READING_STATE_NOT_FOUND') return null
    throw error
  }
  const etag = response.headers.get('ETag')
  const state: ReadingState = await response.json()
  if (etag !== `"${state.revision}"`) throw new Error('Invalid reading state ETag')
  return { state, etag }
}

async function currentSession(ownerId: string, signal?: AbortSignal) {
  const response = await readingFetch('/api/v4/sessions/current', signal ? { signal } : undefined)
  if (!response.ok) throw await requestError(response)
  const session = await response.json()
  if (session.user?.id !== ownerId || typeof session.csrfToken !== 'string') {
    throw new ReadingRequestError(401, 'AUTHENTICATION_REQUIRED')
  }
  return session as { csrfToken: string }
}

function readKey(ownerId: string, documentId: string): [string, string] {
  return [ownerId, documentId]
}

export async function loadPendingReadingState(ownerId: string, documentId: string) {
  const db = await database()
  try { return await db.get('pending', readKey(ownerId, documentId)) }
  finally { db.close() }
}

export async function discardPendingReadingState(pending: PendingReadingState) {
  const db = await database()
  try {
    const tx = db.transaction('pending', 'readwrite')
    const key = readKey(pending.ownerId, pending.documentId)
    if ((await tx.store.get(key))?.key === pending.key) await tx.store.delete(key)
    await tx.done
  } finally { db.close() }
}

/** Persist the original condition and key before sending an intent. Pass the ETag seen by the reader. */
export async function queueReadingState(
  ownerId: string, documentId: string, anchor: ReadingAnchor, baseEtag: string | null, replacesKey?: string,
) {
  const db = await database()
  try {
    const pending: PendingReadingState = {
      ownerId, documentId, anchor, key: crypto.randomUUID(), queuedAt: Date.now(),
      condition: baseEtag === null ? { 'If-None-Match': '*' } : { 'If-Match': baseEtag },
    }
    const tx = db.transaction('pending', 'readwrite')
    const key = readKey(ownerId, documentId)
    const previous = await tx.store.get(key)
    if (previous?.key !== replacesKey) {
      await tx.done
      throw new Error('Resolve the current reading draft before replacing it')
    }
    await tx.store.put(pending)
    await tx.done
    return pending
  } finally { db.close() }
}

export async function retryReadingState(ownerId: string, documentId: string, signal?: AbortSignal) {
  const pending = await loadPendingReadingState(ownerId, documentId)
  if (!pending) return { status: 'empty' } as const
  try {
    const { csrfToken } = await currentSession(ownerId, signal)
    if (Date.now() - pending.queuedAt >= savedReceiptWindowMs) {
      return { status: 'expired', pending, current: await readCurrentReadingState(documentId, signal) } as const
    }
    const response = await readingFetch(stateUrl(documentId), {
      method: 'PUT',
      headers: { ...pending.condition, 'Content-Type': 'application/json', 'Idempotency-Key': pending.key, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(pending.anchor),
      ...(signal && { signal }),
    })
    if (response.status === 412) return { status: 'conflict', pending, current: await readCurrentReadingState(documentId, signal) } as const
    if (!response.ok) throw await requestError(response)
    const state: ReadingState = await response.json()
    await discardPendingReadingState(pending)
    return { status: 'saved', state } as const
  } catch (error) {
    // A failed request leaves the same operation available for replay, including after reload.
    if (error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError') ||
      (error instanceof ReadingRequestError && [429, 503].includes(error.status))) {
      return { status: 'pending', pending, error } as const
    }
    throw error
  }
}
