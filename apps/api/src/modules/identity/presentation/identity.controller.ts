import { fail } from '../../../../lib/http'
import {
  IdentityUnavailableError,
  type AuthenticationApplication,
  type IdentityApplication,
  type IdentityOperation,
} from '../application/identity.service'
import type { IdentityErrorDto } from './identity.dto'
import { IdentityError } from '../domain/identity.error'
import type { User } from '../domain/user.entity'
import { emitAudit, type IdentityAuditSink } from '../ports/audit'
import { publicUser } from '../domain/role.policy'
import { clearSessionCookie, parseProfilePatch, parseRevision } from './identity.validation'
import { assertAllowedOrigin, mutationProof, parseLoginInput, parseRegisterInput, parseRegistrationKey, readIdentityJson, sessionCookie } from './identity.validation'

/** HTTP adapter only; never queries a repository or trusts client roles/cookies. */
export class IdentityController {
  constructor(private readonly identity: IdentityApplication, private readonly authentication?: AuthenticationApplication,
    private readonly source: (request: Request) => string | undefined = () => undefined,
    private readonly audit?: IdentityAuditSink) {}

  registerUser(request: Request) { return this.authenticate(request, 'registerUser') }
  createSession(request: Request) { return this.authenticate(request, 'createSession') }
  getCurrentSession(request: Request) { return this.account(request, 'getCurrentSession') }
  deleteCurrentSession(request: Request) { return this.account(request, 'deleteCurrentSession') }
  getCurrentUser(request: Request) { return this.account(request, 'getCurrentUser') }
  updateCurrentUser(request: Request) { return this.account(request, 'updateCurrentUser') }

  private async account(request: Request, operation: IdentityOperation): Promise<Response> {
    const application = this.authentication
    if (!application) return this.respond(operation)
    try {
      let proof
      try { proof = mutationProof(request) } catch (error) {
        if (operation === 'getCurrentUser' || operation === 'updateCurrentUser') throw new IdentityError(401, 'AUTHENTICATION_REQUIRED', 'Cần đăng nhập.')
        if (operation !== 'getCurrentSession') throw error
        proof = {}
      }
      const headers = { 'Cache-Control': 'private, no-store', 'X-Request-Id': crypto.randomUUID() }
      if (operation === 'getCurrentSession') {
        const session = await application.current(proof)
        return Response.json({ user: session.user ? publicUser(session.user) : null, csrfToken: session.csrfToken, expiresAt: session.expiresAt }, { headers })
      }
      if (operation === 'deleteCurrentSession') {
        assertAllowedOrigin(request, application.policy)
        await application.logout(proof)
        return new Response(null, { status: 204, headers: { ...headers, 'Set-Cookie': clearSessionCookie(application.policy) } })
      }
      let user: User
      if (operation === 'updateCurrentUser') {
        // Authenticate/CSRF before parsing DTO to retain 401/403 precedence.
        // Service owns the single lookup and invokes the lazy HTTP parser afterwards.
        user = await application.updateProfile(proof, async () => {
          assertAllowedOrigin(request, application.policy)
          const patch = parseProfilePatch(await readIdentityJson(request))
          return { displayName: patch.displayName, revision: parseRevision(request.headers.get('if-match')), key: parseRegistrationKey(request.headers.get('idempotency-key')) }
        })
      } else user = await application.requireAuthenticatedUser(proof)
      return Response.json(publicUser(user), { headers: { ...headers, ETag: `"${user.revision}"` } })
    } catch (error) {
      if (error instanceof IdentityError) return this.errorResponse(error.status, error.code, error.message, error.retryAfterSeconds)
      return this.errorResponse(500, 'INTERNAL_ERROR', 'Không thể xử lý yêu cầu tài khoản.')
    }
  }

  private async authenticate(request: Request, operation: 'registerUser' | 'createSession'): Promise<Response> {
    const application = this.authentication
    if (!application) return this.respond(operation)
    try {
      const policy = application.policy
      assertAllowedOrigin(request, policy)
      const proof = mutationProof(request)
      await application.assertMutationProof(proof)
      const raw = await readIdentityJson(request)
      const headers = { 'Cache-Control': 'private, no-store', 'X-Request-Id': crypto.randomUUID() }
      if (operation === 'registerUser') {
        const input = parseRegisterInput(raw)
        const key = parseRegistrationKey(request.headers.get('idempotency-key'))
        const source=this.source(request)
        const user = publicUser(await application.register(input, key, source ? {source} : {}))
        return Response.json(user, { status: 201, headers: { ...headers, Location: '/api/v4/users/me', ETag: `"${user.revision}"` } })
      }
      const source=this.source(request)
      const result = await application.login(parseLoginInput(raw), proof, source ? {source} : {})
      if (!result.session.user) throw new Error('Invalid login result')
      return Response.json({ user: publicUser(result.session.user), csrfToken: result.session.csrfToken, expiresAt: result.session.expiresAt }, {
        status: 200, headers: { ...headers, 'Set-Cookie': sessionCookie(result.cookieToken, result.expiresAt, policy) },
      })
    } catch (error) {
      if (error instanceof IdentityError) return this.errorResponse(error.status, error.code, error.message, error.retryAfterSeconds)
      return this.errorResponse(500, 'INTERNAL_ERROR', 'Không thể xử lý yêu cầu tài khoản.')
    }
  }

  private async respond(operation: IdentityOperation): Promise<Response> {
    try {
      // Reject before reading body/cookie until validation/security/persistence are wired.
      return await this.identity.execute(operation)
    } catch (error) {
      if (error instanceof IdentityUnavailableError)
        return this.errorResponse(503, error.code, error.message)
      // Reuse the existing HTTP envelope without exposing exceptions or credentials.
      return this.errorResponse(500, 'INTERNAL_ERROR', 'Không thể xử lý yêu cầu tài khoản.')
    }
  }

  private async errorResponse(status: number, code: string, message: string, retryAfter?: number): Promise<Response> {
    if (code==='CSRF_REJECTED') emitAudit(this.audit,'csrf_rejected',()=>new Date())
    const response = fail(status, code, message)
    // Adapt the existing shared envelope locally; do not change other modules' HTTP helper.
    const body = await response.clone().json() as IdentityErrorDto
    response.headers.set('X-Request-Id', body.requestId)
    response.headers.set('Cache-Control', 'private, no-store')
    if (retryAfter !== undefined) response.headers.set('Retry-After', String(retryAfter))
    return response
  }
}
