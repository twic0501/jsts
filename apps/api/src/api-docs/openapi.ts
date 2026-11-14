import reference from '../modules/identity/contracts/fr12.reference.json'

type ObjectMap = Record<string, unknown>
const json = (schema: ObjectMap) => ({ 'application/json': { schema } })
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const error = { description: 'Lỗi theo contract; xem error.code và requestId.', content: json(ref('Error')) }
const failures = Object.fromEntries([400,401,403,404,409,410,412,413,415,422,428,429,500,503].map(status=>[status,error]))
const cookie = [{ sessionCookie: [] }]
const {examples: _examples,...errorSchema}=reference.schemas.Error
const csrf = { name:'X-CSRF-Token',in:'header',required:false,schema:{type:'string'},description:'Trang tài liệu tự lấy token mới từ GET sessions/current trước thao tác ghi. Bắt buộc với session đang đăng nhập.' }
const key = { name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',format:'uuid'},description:'UUID cho một thao tác. Giữ nguyên key/body/precondition khi retry; dùng key mới khi đổi thao tác hoặc nội dung.' }
const match = { name:'If-Match',in:'header',required:true,schema:{type:'string',pattern:'^"[1-9][0-9]*"$'},description:'Strong ETag từ GET users/me (hồ sơ) hoặc PUT bookmark. Ví dụ: "1".' }

export const openapi: ObjectMap = {
  openapi:'3.0.3',
  info:{title:'Paper Magic — FR12 & FR14',version:'1.0.0',description:'Tài liệu API đang triển khai cho Tài khoản và Bookmark. Try it out gọi Backend thật và có thể thay đổi database development. Đăng nhập bằng POST /api/v4/sessions hoặc từ website cùng origin. Cookie HttpOnly do trình duyệt quản lý, không nhập Bearer token. Bookmark hiện fail-closed: thiếu Document Service, ACL và mapping ID chính thức; đăng nhập đúng vẫn có thể nhận 503 BOOKMARK_DEPENDENCY_UNAVAILABLE.'},
  servers:[{url:'/',description:'Backend cùng origin với trang tài liệu'}],
  tags:[{name:'FR12 — Tài khoản',description:'Đăng ký, đăng nhập, session, hồ sơ và đăng xuất.'},{name:'FR14 — Bookmark',description:'CHƯA SẴN SÀNG trên dữ liệu thật: cần Document Service + mapping Paper.id ↔ Document UUID. Không dùng UUID giả để vượt kiểm quyền.'}],
  paths:buildPaths(),
  components:{
    securitySchemes:reference.securitySchemes,
    schemas:{...reference.schemas,
      RegisterInput:{...reference.schemas.RegisterInput,properties:{...reference.schemas.RegisterInput.properties,password:{...reference.schemas.RegisterInput.properties.password,format:'password',writeOnly:true}}},
      LoginInput:{...reference.schemas.LoginInput,properties:{...reference.schemas.LoginInput.properties,password:{...reference.schemas.LoginInput.properties.password,format:'password',writeOnly:true}}},
      Session:{...reference.schemas.Session,properties:{user:{allOf:[ref('User')],nullable:true},csrfToken:reference.schemas.Session.properties.csrfToken,expiresAt:{type:'string',format:'date-time',nullable:true}}},
      Error:{...errorSchema,example:{error:{code:'BOOKMARK_DEPENDENCY_UNAVAILABLE',message:'Thiếu Document Service chính thức.'},requestId:'00000000-0000-4000-8000-000000000001'}},
      Bookmark:{type:'object',additionalProperties:false,required:['id','documentId','saved','revision','updatedAt'],properties:{id:{type:'string',format:'uuid'},documentId:{type:'string',format:'uuid'},saved:{type:'boolean',enum:[true]},revision:{type:'integer',minimum:1},updatedAt:{type:'string',format:'date-time'}}},
      BookmarkPage:{type:'object',additionalProperties:false,required:['items','nextCursor'],properties:{items:{type:'array',items:ref('Bookmark')},nextCursor:{type:'string',nullable:true}}},
      SaveBookmark:{type:'object',additionalProperties:false,required:['saved'],properties:{saved:{type:'boolean',enum:[true]}}},
    },
  },
}

function buildPaths(): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>>={}
  for(const endpoint of reference.endpoints){
    const protectedOperation=endpoint.path==='/api/v4/users/me'
    const headers:Record<string,unknown>={...endpoint.successHeaders}
    // The design reference lists optional headers broadly; document only actual controller output.
    if(endpoint.path.includes('/sessions'))delete headers.ETag
    const operation:ObjectMap={
      tags:['FR12 — Tài khoản'],operationId:endpoint.id.replaceAll('.','_'),summary:endpoint.description,
      security:protectedOperation?cookie:[],
      parameters:endpoint.parameters.map(parameter=>parameter.name==='X-CSRF-Token'?csrf:parameter),
      responses:{...failures,[endpoint.success]:{description:endpoint.success===204?'Thành công, không có body.':'Thành công.',headers,...(endpoint.responseSchema?{content:json({$ref:endpoint.responseSchema})}:{})}},
    }
    if(endpoint.requestSchema)operation.requestBody={required:true,content:json({$ref:endpoint.requestSchema})}
    if(endpoint.path==='/api/v4/users')operation.description='Tạo tài khoản thật trong database đã cấu hình. Không tự đăng nhập và hiện chưa xác minh email bằng OTP. Email, password, displayName là bắt buộc; confirmPassword không gửi lên Backend.'
    if(endpoint.method==='PATCH')operation.description='Chỉ đổi displayName. Trước tiên GET users/me để lấy ETag; nhập nguyên giá trị có dấu ngoặc kép vào If-Match.'
    if(endpoint.path==='/api/v4/sessions/current'&&endpoint.method==='GET')operation.description='Guest cũng nhận 200 với user=null. Có user không đồng nghĩa đã xác thực email. Session hết hạn hoặc bị thu hồi sẽ không được khôi phục.'
    paths[endpoint.path]??={}
    paths[endpoint.path]![endpoint.method.toLowerCase()]=operation
  }
  const shared={tags:['FR14 — Bookmark'],security:cookie,description:'Hiện trả 503 BOOKMARK_DEPENDENCY_UNAVAILABLE sau xác thực hợp lệ vì thiếu Document adapter/mapping chính thức; Guest nhận 401. Schema thành công mô tả contract để tích hợp sau, không xác nhận tính năng đã sẵn sàng.'}
  paths['/api/v4/users/me/bookmarks']={get:{...shared,operationId:'listBookmarks',summary:'Danh sách bài đã lưu — đang chờ Document Service',parameters:[{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:200,default:20}},{name:'cursor',in:'query',schema:{type:'string',maxLength:4096},description:'Cursor từ nextCursor của trang trước; gắn với tài khoản và limit, có thời hạn.'}],responses:{...failures,200:{description:'Danh sách bookmark được phép xem.',content:json(ref('BookmarkPage'))}}}}
  const document={name:'documentId',in:'path',required:true,schema:{type:'string',format:'uuid'},description:'UUID Document chính thức từ mapping; không dùng mã arXiv hoặc sinh UUID thay thế.'}
  paths['/api/v4/users/me/bookmarks/{documentId}']={
    put:{...shared,operationId:'saveBookmark',summary:'Lưu bài — đang chờ Document Service',parameters:[document,key,csrf,{...match,required:false},{name:'If-None-Match',in:'header',schema:{type:'string',enum:['*']},description:'Tạo mới: nhập *. Cập nhật: chỉ nhập If-Match. Bắt buộc đúng một trong hai header, không gửi cả hai.'}],requestBody:{required:true,content:json(ref('SaveBookmark'))},responses:{...failures,200:{description:'Bookmark đã lưu.',headers:{ETag:{schema:{type:'string'},description:'Strong ETag revision.'}},content:json(ref('Bookmark'))}}},
    delete:{...shared,operationId:'removeBookmark',summary:'Bỏ lưu bài — đang chờ Document Service',parameters:[document,key,csrf,match],responses:{...failures,204:{description:'Đã bỏ lưu, không có body.'}}},
  }
  return paths
}
