import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Paper } from "@paper-galaxy/core";

import {
  OFFLINE_PAPERS_CHANGED,
  deleteOfflinePapers,
  getSavedOfflinePapers,
  saveOfflinePapers,
  type SavedOfflinePaper,
} from "./papers-store";

import "./offline-picker.css";

type Props = {
  papers: Paper[];
  offline: boolean;
  onOpen: (paper: Paper) => void;
  onToggleOffline: () => void;
};

function OfflinePaperPickerPanel({
  papers,
  offline,
  onOpen,
  onToggleOffline,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedRecords, setSavedRecords] = useState<
    SavedOfflinePaper[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const records = await getSavedOfflinePapers();
    setSavedRecords(records);
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const records = await getSavedOfflinePapers();

        if (active) {
          setSavedRecords(records);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không đọc được bài báo offline.",
          );
        }
      }
    };

    const handleChange = () => {
      void load();
    };

    void load();

    window.addEventListener(
      OFFLINE_PAPERS_CHANGED,
      handleChange,
    );

    return () => {
      active = false;

      window.removeEventListener(
        OFFLINE_PAPERS_CHANGED,
        handleChange,
      );
    };
  }, []);

  const savedIds = useMemo(
    () => new Set(savedRecords.map((record) => record.id)),
    [savedRecords],
  );

  const visiblePapers = useMemo(
    () =>
      showSaved
        ? savedRecords.map((record) => record.paper)
        : offline
          ? papers.filter((paper) => savedIds.has(paper.id))
          : papers,
    [showSaved, savedRecords, savedIds, papers, offline],
  );

  const visibleIds = useMemo(
    () => new Set(visiblePapers.map((paper) => paper.id)),
    [visiblePapers],
  );

  const currentSelection = selectedIds.filter((id) =>
    visibleIds.has(id),
  );

  const allSelected =
    visiblePapers.length > 0 &&
    visiblePapers.every((paper) =>
      currentSelection.includes(paper.id),
    );

  function togglePaper(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((previous) =>
        previous.filter((id) => !visibleIds.has(id)),
      );
    } else {
      setSelectedIds((previous) => [
        ...new Set([
          ...previous,
          ...visiblePapers.map((paper) => paper.id),
        ]),
      ]);
    }
  }

  async function saveSelected() {
    if (busy || currentSelection.length === 0) return;

    const selected = visiblePapers.filter((paper) =>
      currentSelection.includes(paper.id),
    );

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const count = await saveOfflinePapers(selected);
      await refresh();

      setSelectedIds([]);

      setMessage(
        `Đã lưu ${count} bài báo vào thư viện cá nhân offline.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không lưu được bài báo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (busy || currentSelection.length === 0) return;

    const ids = currentSelection.filter((id) =>
      savedIds.has(id),
    );

    if (ids.length === 0) {
      setMessage("Những bài đã chọn chưa được lưu offline.");
      return;
    }

    if (
      !window.confirm(
        `Xóa ${ids.length} bài khỏi thư viện cá nhân offline?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await deleteOfflinePapers(ids);
      await refresh();

      setSelectedIds([]);

      setMessage(
        `Đã xóa ${ids.length} bài khỏi thư viện offline.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không xóa được bài báo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`offline-paper-picker${open ? " is-open" : ""}`}
      aria-label="Chế độ offline cho bài báo"
    >
      <button
        type="button"
        className="offline-picker-toggle"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        {offline ? "● OFFLINE" : "↓ Lưu để đọc offline"}
        <span>{savedRecords.length} bài đã lưu</span>
      </button>

      {open && (
        <div className="offline-picker-body">
          <div className="offline-picker-heading">
            <div>
              <strong>Thư viện OFFLINE</strong>
              <p>
                {offline
                  ? "Đang sử dụng dữ liệu có trên thiết bị."
                  : "Chọn bài báo để lưu vào thiết bị."}
              </p>
            </div>

            <button
              type="button"
              className="offline-picker-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng bảng offline"
            >
              ×
            </button>
          </div>

          <div className="offline-picker-mode">
            <span>Chế độ tìm kiếm</span>
            <button
              type="button"
              className={offline ? "is-offline" : "is-online"}
              aria-pressed={offline}
              disabled={offline && !navigator.onLine}
              onClick={onToggleOffline}
            >
              {offline
                ? "Offline · Chỉ bài đã lưu"
                : "Online · Toàn thư viện"}
            </button>
          </div>

          <div className="offline-picker-tabs">
            <button
              type="button"
              className={!showSaved ? "active" : ""}
              aria-pressed={!showSaved}
              onClick={() => {
                setShowSaved(false);
                setSelectedIds([]);
              }}
            >
              Kết quả tìm kiếm ({papers.length})
            </button>

            <button
              type="button"
              className={showSaved ? "active" : ""}
              aria-pressed={showSaved}
              onClick={() => {
                setShowSaved(true);
                setSelectedIds([]);
              }}
            >
              Đã lưu ({savedRecords.length})
            </button>
          </div>

          <label className="offline-picker-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={visiblePapers.length === 0 || busy}
              onChange={toggleAll}
            />
            Chọn tất cả bài đang hiển thị
          </label>

          <div className="offline-picker-list">
            {visiblePapers.length === 0 ? (
              <p className="offline-picker-empty">
                {showSaved
                  ? "Chưa có bài báo nào được lưu."
                  : "Không có kết quả tìm kiếm để lựa chọn."}
              </p>
            ) : (
              visiblePapers.map((paper) => {
                const checked = currentSelection.includes(
                  paper.id,
                );

                return (
                  <div
                    className="offline-picker-paper"
                    key={paper.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${paper.title}`}
                      checked={checked}
                      disabled={busy}
                      onChange={() => togglePaper(paper.id)}
                    />

                    <div className="offline-picker-info">
                      <button
                        type="button"
                        className="offline-picker-title"
                        onClick={() => onOpen(paper)}
                      >
                        {paper.title}
                      </button>

                      <span>
                        {paper.year} · {paper.group}
                        {savedIds.has(paper.id)
                          ? " · Đã lưu"
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="offline-picker-footer">
            <strong>
              Đã chọn {currentSelection.length} bài
            </strong>

            <div className="offline-picker-actions">
              <button
                type="button"
                disabled={busy || currentSelection.length === 0 || offline}
                onClick={() => void saveSelected()}
              >
                {busy ? "Đang xử lý..." : "Lưu bài đã chọn"}
              </button>

              <button
                type="button"
                disabled={busy || currentSelection.length === 0}
                onClick={() => void deleteSelected()}
                className="offline-picker-delete"
              >
                Xóa đã chọn
              </button>
            </div>
          </div>

          {message && (
            <p className="offline-picker-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="offline-picker-error" role="alert">
              {error}
            </p>
          )}

          <p className="offline-picker-note">
            Bản lưu gồm thông tin và abstract đang có trong
            Paper Galaxy, không tự tải toàn văn PDF.
            Khi mất mạng, chỉ có thể tìm kiếm dữ liệu
            đã có trên thiết bị.
          </p>
        </div>
      )}
    </section>
  );
}

export default function OfflinePaperPicker(props: Props) {
  return createPortal(
    <OfflinePaperPickerPanel {...props} />,
    document.body,
  );
}


