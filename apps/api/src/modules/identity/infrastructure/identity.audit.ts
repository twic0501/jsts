import type { IdentityAuditEvent, IdentityAuditSink } from '../ports/audit'

/** Fixed allowlist; never serialize a request, error, user, or arbitrary extra fields. */
export class ConsoleIdentityAuditSink implements IdentityAuditSink {
  write(event: IdentityAuditEvent) {
    const kinds = ['login_success','login_failure','register_success','register_failure','rate_limited','csrf_rejected','session_revoked']
    if (!kinds.includes(event.kind) || !Number.isFinite(Date.parse(event.at))) return
    console.info(JSON.stringify({ scope: 'identity', event: event.kind, at: new Date(event.at).toISOString() }))
  }
}
