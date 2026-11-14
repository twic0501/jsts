import {z} from 'zod';

const noControls=z.string().refine(value=>!/[\u0000-\u001f\u007f]/.test(value),'Không được có ký tự điều khiển.');
const clean=noControls.trim();
export const collectionInputSchema=z.object({
 name:clean.min(1).max(100).refine(value=>!/[\u0000-\u001f\u007f]/.test(value),'Tên không được có ký tự điều khiển.'),
 description:clean.max(500).nullable().optional()
}).strict();
export const collectionPatchSchema=collectionInputSchema.partial().refine(value=>value.name!==undefined||value.description!==undefined,'Cần ít nhất một trường để cập nhật.');
export type CollectionInput=z.infer<typeof collectionInputSchema>;
export type Collection={id:string;name:string;description:string|null;createdAt:string;updatedAt:string};
export type CollectionWithCount=Collection&{paperCount:number};
