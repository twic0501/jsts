import { historyController } from '../../../../../../src/modules/personal-library/search-history/history.controller';
export const runtime = 'nodejs';
export const GET = historyController.listHistory;
export const POST = historyController.createHistory;
