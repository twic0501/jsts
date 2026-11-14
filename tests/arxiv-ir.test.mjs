import assert from 'node:assert/strict';
import { test } from 'node:test';
import { measureRanking } from '../scripts/evaluate-arxiv-ir.mjs';

test('graded nDCG and truncated reciprocal rank handle unjudged IDs', () => {
  const result = measureRanking(['unjudged', 'support', 'direct'], { direct: 2, support: 1 }, [1, 2, 3]);
  assert.equal(result['recall@1'], 0);
  assert.equal(result['mrr@1'], 0);
  assert.equal(result['ndcg@1'], 0);
  assert.equal(result['recall@2'], 0.5);
  assert.equal(result['recall@3'], 1);
  assert.equal(result['mrr@3'], 0.5);
  assert.equal(result.mrr, 0.5);
  assert.equal(result['ndcg@3'], (1 / Math.log2(3) + 3 / Math.log2(4)) / (3 + 1 / Math.log2(3)));
});
