import { historyController } from '../../../../../../../src/modules/personal-library/search-history/history.controller';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return historyController.getHistory(request, (await context.params).id);
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return historyController.deleteHistory(request, (await context.params).id);
}
