import {z} from 'zod';

const integer=z.number().finite().int();
export const noteCreateSchema=z.object({paperId:z.string().trim().min(1),chunk:z.object({start:integer.min(0),end:integer.min(1)}).strict().optional(),body:z.string().trim().min(1).max(5000)}).strict().refine(value=>!value.chunk||value.chunk.start<value.chunk.end&&value.chunk.end-value.chunk.start<=2000,'Chunk không hợp lệ.');
export const notePatchSchema=z.object({baseRevision:integer.min(1),body:z.string().trim().min(1).max(5000)}).strict();
export const noteListSchema=z.object({paperId:z.string().trim().min(1),limit:integer.min(1).max(100).default(50),cursor:z.string().min(1).optional()}).strict();
export type Anchor={start:number;end:number;quote:string;contentHash:string;datasetVersion:string};
export type Note={id:string;paperId:string;anchor:Anchor|null;body:string;createdAt:string;updatedAt:string;revision:number};
export type AnchorStatus='current'|'changed'|'stale'|'paper_missing';
export function anchorStatus(anchor:Anchor|null,paper:{title:string;abstract:string;provenance?:{abstractAvailable:boolean}}|null,currentHash?:string):AnchorStatus|undefined{
 if(!anchor)return undefined;if(!paper)return 'paper_missing';const text=paper.provenance?.abstractAvailable===false?paper.title:paper.abstract;
 if(currentHash===anchor.contentHash)return 'current';return text.slice(anchor.start,anchor.end)===anchor.quote?'changed':'stale';
}
