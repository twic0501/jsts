import {describe,it,expect}from'vitest';
import {corpusSchema,SearchIndex,searchSchema,searchResultSchema,normalizeText}from'../packages/core/src';
import raw from'../data/corpus.json';
const corpus=corpusSchema.parse(raw),index=new SearchIndex(corpus);
describe('Corpus và tìm kiếm',()=>{
 it('ID duy nhất và nguồn arXiv',()=>{expect(new Set(corpus.papers.map(p=>p.id)).size).toBe(corpus.papers.length);expect(corpus.papers.length).toBeGreaterThanOrEqual(24);for(const p of corpus.papers)expect(p.sourceUrl).toBe('https://arxiv.org/abs/'+p.id)});
 it('tìm U-Net đúng bài đầu',()=>{expect(index.search({query:'U-Net',topK:10}).items[0]?.paper.id).toBe('1505.04597')});
 it('truy vấn Việt có dữ liệu liên quan y sinh',()=>{const result=index.search({query:'ảnh y sinh',topK:20});expect(result.items.some(x=>x.paper.id==='1505.04597')).toBe(true)});
 it('lọc nhóm và năm trước topK',()=>{const r=index.search({query:'',group:'physics',yearFrom:2020,topK:2});expect(r.items.length).toBe(2);for(const x of r.items){expect(x.paper.group).toBe('physics');expect(x.paper.year).toBeGreaterThanOrEqual(2020)}});
 it('từ không có trả danh sách rỗng',()=>expect(index.search({query:'zzzzzznotfoundmagic',topK:10}).items).toEqual([]));
 it('tìm lặp cho cùng thứ tự',()=>{const input={query:'learning',topK:10};expect(index.search(input).items).toEqual(index.search(input).items)});
 it('neighbors không chứa self',()=>{const p=corpus.papers.find(p=>p.id==='1505.04597');if(!p)throw new Error('fixture missing');expect(index.neighbors(p).every(x=>x.paper.id!==p.id)).toBe(true)});
 it('response đúng schema và không có số vô hạn',()=>expect(searchResultSchema.safeParse(index.search({query:'AI',topK:20})).success).toBe(true));
 it('không biến false/null thành chuỗi tìm kiếm',()=>{expect(searchSchema.safeParse({query:false}).success).toBe(false);expect(searchSchema.safeParse({query:null}).success).toBe(false)});
 it('bỏ dấu tiếng Việt',()=>expect(normalizeText('Đọc ẢNH TẾ BÀO')).toBe('doc anh te bao'));
});
describe('Validation bắt chặt biên',()=>{
 it.each([0,51,1.5,NaN,Infinity,'12abc','',null,'10',false])('từ chối topK %s',topK=>expect(searchSchema.safeParse({query:'AI',topK}).success).toBe(false));
 it.each([1,50])('chấp nhận topK %s',topK=>expect(searchSchema.parse({topK}).topK).toBe(topK));
 it('optional missing khác null',()=>{expect(searchSchema.parse({}).group).toBeUndefined();expect(searchSchema.safeParse({group:null}).success).toBe(false)});
 it('không nhận field lạ hoặc Mongo operator',()=>{expect(searchSchema.safeParse({query:'AI',$where:'hack'}).success).toBe(false);expect(searchSchema.safeParse({query:{$ne:null}}).success).toBe(false)});
 it('năm bắt đầu <= kết thúc',()=>expect(searchSchema.safeParse({yearFrom:2024,yearTo:2020}).success).toBe(false));
 it('query dài và whitespace',()=>{expect(searchSchema.safeParse({query:'a'.repeat(301)}).success).toBe(false);expect(searchSchema.parse({query:'   '}).query).toBe('')});
});
