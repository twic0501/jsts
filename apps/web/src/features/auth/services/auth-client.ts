import type { AuthClient } from '../types/auth.types'

let client: Promise<AuthClient> | undefined
export function getAuthClient(): Promise<AuthClient> {
  client ??= import('./real-auth-client').then(({ createRealAuthClient }) => createRealAuthClient())
  return client
}
