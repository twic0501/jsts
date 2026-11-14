import { z } from 'zod'
import reference from '../contracts/fr12.reference.json'
import { csrfRejected, IdentityError } from '../domain/identity.error'
import type { IdentityHttpPolicy } from '../identity.config'
import type { LoginInput, RegisterInput } from './identity.dto'
import type { MutationProof } from '../ports/authentication'

const length = (min: number, max: number) => z.string().refine(value => {
  const size = Array.from(value).length
  return size >= min && size <= max
})
const email = z.string().max(reference.schemas.RegisterInput.properties.email.maxLength)
  .transform(value => value.trim().toLowerCase()).pipe(z.email().max(reference.schemas.RegisterInput.properties.email.maxLength))
const register = z.object({ email, password: length(12, 256), displayName: length(1, 100) }).strict()
const login = z.object({ email, password: length(1, 256) }).strict()
export function parseProfilePatch(value: unknown) {
  const result = z.object({ displayName: length(1, 100) }).strict().safeParse(value)
  if (!result.success) throw new IdentityError(422, 'VALIDATION_ERROR', 'Chỉ được cập nhật tên hiển thị từ 1–100 ký tự.')
  return result.data
}
export function parseRevision(value: string | null) {
  if (value === null) throw new IdentityError(428, 'PRECONDITION_REQUIRED', 'Cần If-Match.')
  if (!/^"[1-9]\d*"$/.test(value) || !Number.isSafeInteger(Number(value.slice(1, -1)))) throw new IdentityError(422, 'INVALID_ETAG', 'If-Match không hợp lệ.')
  return Number(value.slice(1, -1))
}
export function clearSessionCookie(policy: IdentityHttpPolicy) {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=${policy.sameSite}`
}
const key = z.uuid()
export const SESSION_COOKIE = reference.securitySchemes.sessionCookie.name
export const MAX_IDENTITY_BODY = reference.endpoints[0]!.bodyLimitBytes

export function parseRegisterInput(value: unknown): RegisterInput {
  const result = register.safeParse(value)
  if (!result.success) throw new IdentityError(422, 'VALIDATION_ERROR', 'Kiểm tra email, mật khẩu (12–256 ký tự) và tên hiển thị (1–100 ký tự).')
  return result.data
}
export function parseLoginInput(value: unknown): LoginInput {
  const result = login.safeParse(value)
  if (!result.success) throw new IdentityError(422, 'VALIDATION_ERROR', 'Kiểm tra email và mật khẩu đăng nhập.')
  return result.data
}
export function parseRegistrationKey(value: string | null) {
  const result = key.safeParse(value)
  if (!result.success) throw new IdentityError(422, 'IDEMPOTENCY_KEY_REQUIRED', 'Cần Idempotency-Key hợp lệ cho yêu cầu đăng ký.')
  return result.data.toLowerCase()
}

export function assertAllowedOrigin(request: Request, policy: IdentityHttpPolicy) {
  if (!policy.allowedOrigins.has(request.headers.get('origin') ?? '')) throw csrfRejected()
}
export function mutationProof(request: Request): MutationProof {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(SESSION_COOKIE + '='))
  if (matches.length > 1) throw csrfRejected()
  const token = matches[0]?.slice(SESSION_COOKIE.length + 1)
  if (token !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(token)) throw csrfRejected()
  const csrf = request.headers.get('x-csrf-token')
  return { ...(token === undefined ? {} : { sessionToken: token }), ...(csrf === null ? {} : { csrfToken: csrf }) }
}
export async function readIdentityJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    throw new IdentityError(415, 'CONTENT_TYPE', 'Cần gửi application/json.')
  const claimedSize = request.headers.get('content-length')
  if (claimedSize && (!/^\d+$/.test(claimedSize) || Number(claimedSize) > MAX_IDENTITY_BODY))
    throw new IdentityError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi quá lớn.')
  const reader = request.body?.getReader()
  if (!reader) throw new IdentityError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.')
  let bytes = 0, text = ''
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > MAX_IDENTITY_BODY) {
        await reader.cancel()
        throw new IdentityError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi quá lớn.')
      }
      text += decoder.decode(part.value, { stream: true })
    }
    return JSON.parse(text + decoder.decode()) as unknown
  } catch (error) {
    if (error instanceof IdentityError) throw error
    throw new IdentityError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.')
  } finally { reader.releaseLock() }
}

export function sessionCookie(token: string, expiresAt: Date, policy: IdentityHttpPolicy) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid session cookie material')
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${policy.sessionTtlSeconds}; Expires=${expiresAt.toUTCString()}; HttpOnly; Secure; SameSite=${policy.sameSite}`
}
