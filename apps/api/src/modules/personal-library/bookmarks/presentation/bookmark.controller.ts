import { BookmarkError } from '../domain/bookmark.entity'
import type { BookmarkApplication } from '../application/bookmark.service'
import { IdentityError } from '../../../identity/domain/identity.error'
import { mutationProof } from '../../../identity/presentation/identity.validation'
import { mutationOf, queryOf } from './bookmark.dto'
export class BookmarkController {
  constructor(private readonly service: BookmarkApplication,private readonly origin:(request:Request)=>void) {}
  list(request: Request){return this.handle(request)}
  put(request: Request,id: string){return this.handle(request,'PUT',id)}
  remove(request: Request,id: string){return this.handle(request,'DELETE',id)}
  private async handle(request: Request,method?:'PUT'|'DELETE',id=''): Promise<Response> {
    const requestId=crypto.randomUUID(),headers={'Cache-Control':'private, no-store','X-Request-Id':requestId}
    try {
      let proof
      try{proof=mutationProof(request)}catch{throw new BookmarkError(401,'AUTHENTICATION_REQUIRED','Cần đăng nhập.')}
      if(!method)return Response.json(await this.service.list(proof,()=>queryOf(request)),{headers})
      const result=await this.service.mutate(proof,method,async()=>{this.origin(request);return mutationOf(request,id,method)})
      if(method==='DELETE')return new Response(null,{status:204,headers})
      if(!result)throw new Error('Missing bookmark')
      return Response.json(result,{status:200,headers:{...headers,ETag:`"${result.revision}"`}})
    }catch(error){
      const safe=error instanceof BookmarkError||error instanceof IdentityError
      return Response.json({error:{code:safe?error.code:'INTERNAL_ERROR',message:safe?error.message:'Không thể xử lý bookmark.'},requestId},{status:safe?error.status:500,headers})
    }
  }
}
