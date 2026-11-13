import type {Db} from 'mongodb';
import {createPersonalLibraryModule} from '../modules/personal-library/personal-library.module';
import {SearchError,type Principal} from '../shared/search-context';
export type PersonalLibraryIntegration = {
  principal:(request:Request)=>Promise<Principal>;
  authorizeMutation:(request:Request,principal:Principal)=>Promise<void>;
  database:()=>Promise<Db>;
};
let integration:PersonalLibraryIntegration|undefined;
let runtime:Promise<ReturnType<typeof createPersonalLibraryModule>>|undefined;
export function configurePersonalLibraryIntegration(deps:PersonalLibraryIntegration){integration=deps;runtime=undefined}
function configured(){
  if(!integration)throw new SearchError(503,'HISTORY_INTEGRATION_REQUIRED','Chưa ghép lịch sử với FR12 và MongoDB chung.');
  return integration;
}
export function principalFromRequest(request:Request){return configured().principal(request)}
export function authorizeSearchMutation(request:Request,principal:Principal){return configured().authorizeMutation(request,principal)}
export function historyRuntime(){
  const deps=configured();
  return runtime??=deps.database().then(createPersonalLibraryModule).catch(error=>{runtime=undefined;throw error});
}
