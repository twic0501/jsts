import { getIdentityModule } from '../../../../../src/modules/identity/identity.bootstrap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return getIdentityModule().controller.getCurrentSession(request)
}

export async function DELETE(request: Request) {
  return getIdentityModule().controller.deleteCurrentSession(request)
}
