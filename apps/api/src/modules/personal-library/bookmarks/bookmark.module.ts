import { BookmarkService, UnavailableBookmarkService, type BookmarkDependencies } from './application/bookmark.service'
import { BookmarkController } from './presentation/bookmark.controller'
import type { IdentityModule } from '../../identity/identity.module'
export function createBookmarkModule(options:{authorization:IdentityModule['authorization'];origin:(request:Request)=>void;dependencies?:BookmarkDependencies}) {
  const service=options.dependencies?new BookmarkService(options.dependencies):new UnavailableBookmarkService(options.authorization)
  return {
    controller:new BookmarkController(service,options.origin),
    readiness:async()=>{
      if(!options.dependencies)throw new Error('Bookmark dependencies unavailable')
      await options.dependencies.documents.ready();await options.dependencies.repository.ready()
    },
  }
}
