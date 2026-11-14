import { getIdentityModule } from '../../../../../src/modules/identity/identity.bootstrap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return getIdentityModule().controller.getCurrentUser(request)
}

export async function PATCH(request: Request) {
  return getIdentityModule().controller.updateCurrentUser(request)
}
