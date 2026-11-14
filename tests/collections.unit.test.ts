import {describe,it,expect} from 'vitest';
import {collectionInputSchema,collectionPatchSchema} from '@paper-galaxy/core';
describe('collections contracts',()=>{it('enforces strict cleaned collection data',()=>{expect(collectionInputSchema.safeParse({name:' A ',description:null}).success).toBe(true);expect(collectionInputSchema.safeParse({name:'A',extra:true}).success).toBe(false);expect(collectionInputSchema.safeParse({name:'A\n'}).success).toBe(false);expect(collectionPatchSchema.safeParse({}).success).toBe(false)})});
