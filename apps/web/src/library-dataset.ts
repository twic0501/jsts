import { validateBundle, type DatasetBundle } from '@paper-galaxy/core'

export type Neighbor = { id: string; score: number }
export type NeighborRow = { id: string; neighbors: Neighbor[] }
export type LibraryDataset = { dataset: DatasetBundle; neighbors?: NeighborRow[] }

function readNeighbors(raw: unknown, dataset: DatasetBundle): NeighborRow[] | undefined {
  if (!Array.isArray(raw) || raw.length !== dataset.snapshot.papers.length) return undefined
  const ids = new Set(dataset.snapshot.papers.map(row => row.paperId))
  const rows: NeighborRow[] = []
  for (const [index, row] of raw.entries()) {
    if (row?.paperId !== dataset.snapshot.papers[index]?.paperId ||
        !Array.isArray(row.neighbors) || row.neighbors.length !== Math.min(20, ids.size - 1)) return undefined
    const neighbors: Neighbor[] = []
    const seen = new Set<string>()
    for (const edge of row.neighbors) {
      const last = neighbors.at(-1)
      if (!edge || !ids.has(edge.paperId) || edge.paperId === row.paperId || seen.has(edge.paperId) ||
          !Number.isFinite(edge.cosine) || Math.abs(edge.cosine) > 1 ||
          (last && (last.score < edge.cosine || (last.score === edge.cosine && last.id >= edge.paperId)))) {
        return undefined
      }
      seen.add(edge.paperId)
      neighbors.push({ id: edge.paperId, score: edge.cosine })
    }
    rows.push({ id: row.paperId, neighbors })
  }
  return rows
}

export function readLibrary(raw: unknown): { library: LibraryDataset; storage: 'mongodb' | 'json' } {
  if (!raw || typeof raw !== 'object' || !('dataset' in raw)) throw new Error('Thiếu corpus và snapshot.')
  const dataset = validateBundle(raw.dataset)
  if (new Set(dataset.corpus.papers.map(paper => paper.id)).size !== dataset.corpus.papers.length) {
    throw new Error('Corpus có ID trùng.')
  }
  const neighbors = readNeighbors('neighbors' in raw ? raw.neighbors : undefined, dataset)
  const storage = 'storage' in raw && raw.storage === 'mongodb' ? 'mongodb' : 'json'
  return { library: { dataset, ...(neighbors && { neighbors }) }, storage }
}
