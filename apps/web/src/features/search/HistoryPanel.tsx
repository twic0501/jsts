import { useEffect, useRef, useState } from 'react';
import { GROUPS, type SearchHistory } from '@paper-galaxy/core';
import { loadAccountHistory, removeAccountHistory, type HistoryAccess } from './client';
import {loadDeviceHistory, removeDeviceHistory} from './device-history';
import './history.css';

export default function HistoryPanel({ open, close, access, refresh, repeat, retrySave }: {
  open: boolean; close: () => void; access: HistoryAccess | undefined; refresh: number;
  repeat: (row: SearchHistory) => void; retrySave?: (() => void) | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<SearchHistory[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [deleting, setDeleting] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const generation = useRef(0), deleteKeys = useRef(new Map<string, string>());
  const send = access?.send;
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => {
    const current = ++generation.current;
    if (!open) return;
    setLoading(true); setError(''); setDeleting([]);
    (send ? loadAccountHistory(send) : loadDeviceHistory()).then(data => {
      if (generation.current === current) { setRows(data.items); setCursor(data.nextCursor); }
    }).catch(e => { if (generation.current === current) setError(e instanceof Error ? e.message : 'Không tải được lịch sử.'); })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current++; };
  }, [open, send, refresh, reload]);
  async function more() {
    if (!cursor) return;
    const current = generation.current; setLoading(true); setError('');
    try {
      const data = await (send ? loadAccountHistory(send, cursor) : loadDeviceHistory(cursor));
      if (generation.current === current) { setRows(old => [...old, ...data.items.filter(r => !old.some(x => x.id === r.id))]); setCursor(data.nextCursor); }
    } catch (e) { if (generation.current === current) setError(e instanceof Error ? e.message : 'Không tải được lịch sử.'); }
    finally { if (generation.current === current) setLoading(false); }
  }
  async function remove(row: SearchHistory) {
    const current = generation.current;
    const key = deleteKeys.current.get(row.id) ?? crypto.randomUUID(); deleteKeys.current.set(row.id, key);
    setDeleting(old => [...old, row.id]); setError('');
    try {
      if (send) await removeAccountHistory(row.id, row.revision, key, send);
      else await removeDeviceHistory(row.id);
      if (generation.current === current) setRows(old => old.filter(x => x.id !== row.id));
    } catch (e) { if (generation.current === current) setError(e instanceof Error ? e.message : 'Không xóa được lịch sử.'); }
    finally { if (generation.current === current) setDeleting(old => old.filter(id => id !== row.id)); }
  }
  return <dialog ref={dialog} id="search-history-panel" className="history-panel" aria-labelledby="history-title"
    onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }}>
    <div className="history-content">
      <header><h2 id="history-title">Lịch sử tìm kiếm</h2><button onClick={close} aria-label="Đóng lịch sử">✕</button></header>
      <>
        <p>{access ? 'Lịch sử tài khoản của bạn.' : 'Lịch sử trên thiết bị này · Không cần đăng nhập · Có thể xem và xóa khi offline.'}</p>
        <p>Các lượt gần nhất ở trên. Bấm một câu hỏi để tìm lại.</p>
        {error && <div role="alert">{error} <button onClick={() => setReload(n => n + 1)}>Tải lại</button></div>}
        {retrySave && <button onClick={retrySave}>Thử lưu lại lượt tìm vừa gửi</button>}
        {loading && <p role="status">Đang tải lịch sử…</p>}
        {!loading && !error && rows.length === 0 && <p>Bạn chưa có lượt tìm kiếm nào.</p>}
        <ol aria-label="Các lượt tìm gần nhất">{rows.map(row => <li key={row.id}>
          <button className="history-repeat" onClick={() => repeat(row)} disabled={deleting.includes(row.id)} aria-label={`Tìm lại: ${row.query}`}>
            <strong>{row.query}</strong><time dateTime={row.updatedAt}>{new Date(row.updatedAt).toLocaleString('vi-VN')}</time>
            <small>{row.filters.subjects?.map(s => GROUPS[s].label).join(', ') ?? 'Tất cả lĩnh vực'} · {row.filters.yearFrom ?? '…'}–{row.filters.yearTo ?? '…'}{row.filters.kinds ? ` · ${row.filters.kinds.join(', ')}` : ''}</small>
          </button>
          <button aria-label={`Xóa: ${row.query}`} onClick={() => void remove(row)} disabled={loading || deleting.includes(row.id)}>Xóa</button>
        </li>)}</ol>
        {cursor && <button onClick={() => void more()} disabled={loading}>Xem lịch sử cũ hơn</button>}
      </>
    </div>
  </dialog>;
}
