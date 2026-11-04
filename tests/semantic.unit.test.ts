import{describe,it,expect}from'vitest';
import{fitPca3,projectPca,cosineSimilarity,normalizeVector,SemanticIndex,corpusSchema,validateSnapshot}from'../packages/core/src';
import corpusFile from'../data/corpus.json';
import snapshotFile from'../data/semantic-snapshot.json';
const corpus=corpusSchema.parse(corpusFile),snapshot=validateSnapshot(corpus,snapshotFile),index=new SemanticIndex(corpus,snapshot);
describe('Vector ngữ nghĩa',()=>{
 it('cosine identical / opposite / orthogonal',()=>{expect(cosineSimilarity([1,0],[1,0])).toBeCloseTo(1);expect(cosineSimilarity([1,0],[-1,0])).toBeCloseTo(-1);expect(cosineSimilarity([1,0],[0,1])).toBeCloseTo(0)});
 it.each([[],[0,0],[NaN,1],[Infinity,0]])('từ chối vector không hợp lệ %j',v=>expect(()=>normalizeVector(v)).toThrow());
 it('từ chối sai dimension',()=>expect(()=>cosineSimilarity([1,0],[1])).toThrow());
 it('30 vector thật, 384 chiều và L2 norm gần 1',()=>{expect(snapshot.papers).toHaveLength(30);for(const p of snapshot.papers){expect(p.vector).toHaveLength(384);expect(Math.hypot(...p.vector)).toBeCloseTo(1,5)}});
 it('self-search đứng đầu, neighbors loại self',()=>{const item=snapshot.papers[0];if(!item)throw new Error('fixture');const result=index.search({query:'self',topK:10},item.vector);expect(result.items[0]?.paper.id).toBe(item.paperId);const paper=corpus.papers.find(p=>p.id===item.paperId);if(!paper)throw new Error('fixture');expect(index.neighbors(paper).some(h=>h.paper.id===paper.id)).toBe(false)});
 it('không gọi tìm query mà thiếu embedding',()=>expect(()=>index.search({query:'hello',topK:10})).toThrow());
 it('filter trước topK',()=>{const v=snapshot.papers[0]?.vector;const result=index.search({query:'q',group:'physics',yearFrom:2024,topK:2},v);expect(result.items).toHaveLength(2);expect(result.items.every(h=>h.paper.group==='physics'&&h.paper.year>=2024)).toBe(true)});
 it('rank được tính từ vector gốc, không từ tọa độ PCA',()=>{const first=snapshot.papers[0];if(!first)throw new Error('fixture');const expected=[...snapshot.papers].sort((a,b)=>cosineSimilarity(first.vector,b.vector)-cosineSimilarity(first.vector,a.vector)||a.paperId.localeCompare(b.paperId));expect(index.search({query:'q',topK:5},first.vector).items.map(h=>h.paper.id)).toEqual(expected.slice(0,5).map(h=>h.paperId))});
 it('version mismatch / duplicate ID / tọa độ giả đều bị từ chối',()=>{expect(()=>validateSnapshot({...corpus,version:'different'},snapshot)).toThrow();const copy=structuredClone(snapshot);if(copy.papers[0])copy.papers[0].point.x+=1;expect(()=>validateSnapshot(corpus,copy)).toThrow();const duplicate=structuredClone(snapshot);if(duplicate.papers[0]&&duplicate.papers[1])duplicate.papers[1].paperId=duplicate.papers[0].paperId;expect(()=>validateSnapshot(corpus,duplicate)).toThrow()});
});
describe('PCA 3D',()=>{
 it('deterministic và đúng tọa độ training/query',()=>{const vectors=[[3,1,0],[2,-1,1],[-3,1,-1],[-2,-1,0]];expect(fitPca3(vectors,42)).toEqual(fitPca3(vectors,42));const model=fitPca3(vectors,42);for(const v of vectors){const p=projectPca(v,model);expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true)}});
 it('rank deficient không tạo noise hoặc NaN',()=>{const model=fitPca3([[1,1],[1,1],[1,1]]);expect(projectPca([1,1],model)).toEqual({x:0,y:0,z:0});expect(model.explainedVariance).toEqual([0,0,0])});
 it('basis thật trực chuẩn và explained variance không vượt 1',()=>{const components=snapshot.projection.components;for(let i=0;i<3;i++){expect(Math.hypot(...(components[i]??[]))).toBeCloseTo(1,6);for(let j=i+1;j<3;j++)expect((components[i]??[]).reduce((s,x,k)=>s+x*(components[j]?.[k]??0),0)).toBeCloseTo(0,6)}expect(snapshot.projection.explainedVariance.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(1)});
 it('projection từ snapshot khớp điểm đã lưu',()=>{for(const p of snapshot.papers)expect(projectPca(p.vector,snapshot.projection)).toEqual(p.point)});
});
