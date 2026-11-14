export type IdentityAuditKind = 'login_success' | 'login_failure' | 'register_success' | 'register_failure' | 'rate_limited' | 'csrf_rejected' | 'session_revoked'
export interface IdentityAuditEvent { kind: IdentityAuditKind; at: string }
export interface IdentityAuditSink { write(event: IdentityAuditEvent): void }
export function emitAudit(sink: IdentityAuditSink | undefined, kind: IdentityAuditKind, now: () => Date) {
  try { sink?.write({ kind, at: now().toISOString() }) } catch { /* Audit failure cannot expose credentials or change auth results. */ }
}
