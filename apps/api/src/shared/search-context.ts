export class SearchError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export type Principal = { id: string } | null;
