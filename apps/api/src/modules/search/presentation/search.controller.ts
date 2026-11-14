import {documentSearchInputSchema} from '@paper-galaxy/core';
import {SearchError} from '../../../shared/search-context';
import {searchHttp,type IdentityDependencies} from '../../../shared/search-http';
import type {createSearchService} from '../application/search.service';
export type SearchControllerDependencies = IdentityDependencies & {
 runtime: () => Promise<{service: ReturnType<typeof createSearchService>}>;
};
export function createSearchController(deps:SearchControllerDependencies){
 const {json,id,key,body,identity,handle}=searchHttp(deps);
 return{
  search:(request:Request)=>handle(async()=>{
   const principal=await identity(request,false,true),operationKey=key(request);
   const parsed=documentSearchInputSchema.safeParse(await body(request));
   if(!parsed.success)throw new SearchError(422,'VALIDATION_ERROR',parsed.error.issues[0]?.message??'DTO không hợp lệ.');
   const result=await(await deps.runtime()).service.search({input:parsed.data,key:operationKey,principal});
   return json(result,201,{Location:`/api/v4/searches/${result.id}`});
  }),
  getSearch:(request:Request,searchId:string)=>handle(async()=>{
   const principal=await identity(request,false),resourceId=id(searchId);
   return json(await(await deps.runtime()).service.get(resourceId,principal));
  }),
 };
}
