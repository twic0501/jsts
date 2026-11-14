import { getIdentityModule } from '../../../../src/modules/identity/identity.bootstrap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return getIdentityModule().controller.createSession(request)
}
