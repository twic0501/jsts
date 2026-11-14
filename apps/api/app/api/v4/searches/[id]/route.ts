import {searchController} from '../../../../../src/modules/search/integration';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return searchController.getSearch(request,(await context.params).id);}
