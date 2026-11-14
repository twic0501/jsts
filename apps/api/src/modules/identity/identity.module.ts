import type { AuthenticationApplication, IdentityApplication } from './application/identity.service'
import { UnavailableIdentityService } from './application/identity.service'
import { IdentityController } from './presentation/identity.controller'
import type { IdentityAuditSink } from './ports/audit'

export interface IdentityModule {
  readonly controller: IdentityController
  readonly readiness: () => Promise<void>
  readonly authorization: Pick<AuthenticationApplication, 'requireAuthenticatedUser' | 'requireRole' | 'assertMutationProof'>
}

/** Explicit constructor injection; compatible with a future shared composition root. */
export function createIdentityModule(dependencies: { identity?: IdentityApplication; authentication?: AuthenticationApplication; requestSource?: (request: Request) => string | undefined; audit?: IdentityAuditSink; readiness?: () => Promise<void> }): IdentityModule {
  const unavailable = dependencies.identity ?? new UnavailableIdentityService()
  const active = dependencies.authentication
  const fail = async (): Promise<never> => unavailable.execute('getCurrentUser')
  return {
    controller: new IdentityController(unavailable, active, dependencies.requestSource, dependencies.audit),
    readiness: dependencies.readiness ?? (async()=>unavailable.execute('getCurrentUser')),
    authorization: {
      requireAuthenticatedUser: active ? active.requireAuthenticatedUser.bind(active) : fail,
      requireRole: active ? active.requireRole.bind(active) : fail,
      assertMutationProof: active ? active.assertMutationProof.bind(active) : fail,
    },
  }
}
