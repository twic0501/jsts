import { describe, expect, it } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { BookmarkCursor } from '../application/bookmark.cursor'
import { assertReadable } from '../domain/bookmark.policy'
import { documentId, mutationOf, queryOf } from '../presentation/bookmark.dto'
describe('FR14 DTO/policy/cursor, no authentication simulation',()=>{
  it('hides missing and forbidden documents behind the same policy',()=>{
    expect(()=>assertReadable(false)).toThrow('Tài liệu không tồn tại hoặc không được phép truy cập.')
    expect(()=>assertReadable(true)).not.toThrow()
  })
  it.each(['?limit=0','?limit=201','?limit=1.5','?limit=2&limit=3','?cursor=','?userId=forged'])('rejects invalid list query %s',query=>{
    expect(()=>queryOf(new Request('https://paper.test/api/v4/users/me/bookmarks'+query))).toThrow()
  })
  it('accepts a bounded cursor query and validates UUIDs',()=>{
    expect(queryOf(new Request('https://paper.test/?limit=200&cursor=opaque'))).toEqual({limit:200,cursor:'opaque'})
    expect(()=>documentId('oa:W123')).toThrow();expect(documentId(randomUUID())).toHaveLength(36)
  })
  it('requires DELETE If-Match and rejects body or weak revision',async()=>{
    const id=randomUUID(),headers={'Idempotency-Key':randomUUID()}
    await expect(mutationOf(new Request('https://paper.test',{method:'DELETE',headers}),id,'DELETE')).rejects.toMatchObject({status:428})
    await expect(mutationOf(new Request('https://paper.test',{method:'DELETE',headers:{...headers,'If-Match':'W/"1"'}}),id,'DELETE')).rejects.toMatchObject({status:422})
    await expect(mutationOf(new Request('https://paper.test',{method:'DELETE',headers:{...headers,'If-Match':'"1"'},body:'{}'}),id,'DELETE')).rejects.toMatchObject({status:422})
    await expect(mutationOf(new Request('https://paper.test',{method:'DELETE',headers:{...headers,'If-Match':'"1"'},body:''}),id,'DELETE')).resolves.toMatchObject({documentId:id,revision:1})
  })
  it('does not expose the continuation ID in cursor plaintext and binds its lifetime',()=>{
    const cursor=new BookmarkCursor(randomBytes(32),1),owner=randomUUID(),id=randomUUID(),now=new Date()
    const token=cursor.encode(owner,20,id,now)
    expect(Buffer.from(token,'base64url').toString('utf8')).not.toContain(id)
    expect(cursor.decode(token,owner,20,now)).toBe(id)
    expect(()=>cursor.decode(token,randomUUID(),20,now)).toThrow()
    expect(()=>cursor.decode(token,owner,20,new Date(now.getTime()+1001))).toThrow('Cursor đã hết hạn')
  })
})
