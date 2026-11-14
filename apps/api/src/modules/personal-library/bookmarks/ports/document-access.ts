/** Must be implemented by the authoritative Document module, including shared ACLs/deletion. */
export interface DocumentAccess {
  ready(): Promise<void>
  readable(userId: string, documentId: string): Promise<boolean>
}
