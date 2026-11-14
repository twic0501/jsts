import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import {
  estimateStorage,
  getOfflineStatus,
  installStarterDataset,
  removeOfflineDataset,
  type OfflineStatus,
} from "./store";
import {
  auditOfflineResources,
  probeOfflineEmbedding,
  type OfflineAudit,
  type ModelProbe,
} from "./readiness";
import "./offline.css";

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** unit).toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function OfflineManagerPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<OfflineAudit | null>(null);
  const [modelProbe, setModelProbe] = useState<ModelProbe | null>(null);
  const [checkingModel, setCheckingModel] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });

  const refresh = useCallback(async () => {
    const [nextStatus, nextStorage, nextAudit] = await Promise.all([
      getOfflineStatus(),
      estimateStorage(),
      auditOfflineResources(),
    ]);

    setStatus(nextStatus);
    setStorage(nextStorage);
    setAudit(nextAudit);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getOfflineStatus(), estimateStorage()])
      .then(([nextStatus, nextStorage]) => {
        if (cancelled) return;

        setStatus(nextStatus);
        setStorage(nextStorage);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;

        setError(
          cause instanceof Error
            ? cause.message
            : "Không kiểm tra được bộ nhớ offline.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function install() {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const next = await installStarterDataset();
      await refresh();

      if (!next.valid) {
        throw new Error(
          next.error ?? "Dữ liệu đã lưu nhưng xác minh không thành công.",
        );
      }

      setMessage(
        `Đã lưu và xác minh ${next.paperCount} bài báo cùng semantic snapshot.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu dữ liệu offline.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !status?.installed) return;

    const approved = window.confirm(
      "Xóa bản sao dữ liệu offline của Paper Galaxy trên trình duyệt này? " +
        "Thao tác không xóa dữ liệu gốc trên server.",
    );

    if (!approved) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await removeOfflineDataset();
      await refresh();

      setMessage("Đã xóa bản sao dữ liệu offline.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể xóa dữ liệu offline.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkModel() {
    if (checkingModel || busy) return;

    setCheckingModel(true);
    setModelProbe(null);

    try {
      const probe = await probeOfflineEmbedding();
      setModelProbe(probe);
    } finally {
      setCheckingModel(false);
    }
  }
  const ready = Boolean(status?.installed && status.valid);

  return (
    <section className="offline-manager" aria-label="Quản lý dữ liệu offline">
      <div className="offline-manager-header">
        <div>
          <strong>Dữ liệu offline</strong>
          <p>
            Lưu thư viện và tọa độ vector vào thiết bị để sử dụng lại.
          </p>
        </div>

        <button
          type="button"
          className="offline-toggle"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {ready ? "Đã lưu ✓" : "Quản lý offline"}
          <span aria-hidden="true">{open ? " −" : " +"}</span>
        </button>
      </div>

      {open && (
        <div className="offline-manager-body">
          <div className="offline-dataset">
            <div className="offline-dataset-info">
              <strong>Paper Galaxy Starter Library</strong>
              <span>30 bài báo · Corpus + Semantic Snapshot</span>
            </div>

            <span
              className={`offline-status ${
                ready
                  ? "is-ready"
                  : status?.installed
                    ? "is-invalid"
                    : ""
              }`}
            >
              {ready
                ? "Dữ liệu hợp lệ"
                : status?.installed
                  ? "Cần sửa dữ liệu"
                  : status
                    ? "Chưa lưu"
                    : "Đang kiểm tra"}
            </span>
          </div>

          <div className="offline-stat-grid">
            <div>
              <span>Bài báo đã lưu</span>
              <strong>{status?.paperCount ?? 0}</strong>
            </div>

            <div>
              <span>Dung lượng bộ dữ liệu</span>
              <strong>{formatSize(status?.sizeBytes ?? 0)}</strong>
            </div>

            <div>
              <span>Bộ nhớ trình duyệt đang dùng</span>
              <strong>{formatSize(storage.usage)}</strong>
            </div>

            <div>
              <span>Hạn mức trình duyệt ước tính</span>
              <strong>{formatSize(storage.quota)}</strong>
            </div>
          </div>

          {status?.installedAt && (
            <p className="offline-meta">
              Lưu lần cuối:{" "}
              {new Date(status.installedAt).toLocaleString("vi-VN")}
            </p>
          )}

          {status?.error && (
            <p className="offline-error" role="alert">
              Dữ liệu không hợp lệ: {status.error}
            </p>
          )}

          {error && (
            <p className="offline-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="offline-success" role="status">
              {message}
            </p>
          )}

          <div className="offline-actions">
            <button
              type="button"
              disabled={busy}
              onClick={install}
            >
              {busy
                ? "Đang xử lý..."
                : ready
                  ? "Lưu lại / cập nhật"
                  : "Lưu bộ dữ liệu"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError("");
                void refresh().catch((cause: unknown) => {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Không kiểm tra được dữ liệu.",
                  );
                });
              }}
            >
              Kiểm tra
            </button>

            <button
              type="button"
              className="offline-delete"
              disabled={busy || !status?.installed}
              onClick={remove}
            >
              Xóa bản lưu
            </button>
          </div>

          <div className="offline-readiness">
            <strong>Kiểm tra tài nguyên offline</strong>

            {audit ? (
              <>
                <p>
                  Dữ liệu: {audit.datasetReady
                    ? `${audit.paperCount} bài báo hợp lệ`
                    : "Chưa sẵn sàng"}
                </p>

                <p>
                  Ứng dụng: {audit.app.message}
                </p>

                {audit.app.missing.length > 0 && (
                  <p className="offline-error">
                    Tài nguyên thiếu: {audit.app.missing.join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p>Nhấn Kiểm tra để xác minh dữ liệu và cache ứng dụng.</p>
            )}

            <button
              type="button"
              disabled={checkingModel || busy}
              onClick={() => void checkModel()}
            >
              {checkingModel
                ? "Đang kiểm tra model..."
                : "Thử model AI 384 chiều"}
            </button>

            {modelProbe && (
              <p
                className={
                  modelProbe.success
                    ? "offline-success"
                    : "offline-error"
                }
                role="status"
              >
                {modelProbe.message}
                {" "}({Math.round(modelProbe.durationMs)} ms)
              </p>
            )}

            <p className="offline-meta">
              Lần thử AI khi online có thể tải model về máy.
              Để xác nhận AI thực sự chạy offline, bật
              Network → Offline rồi thử lại.
            </p>
          </div>
          <p className="offline-note">
            Trạng thái trên xác nhận corpus và snapshot đã lưu hợp lệ.
            Model AI và khả năng mở ứng dụng khi mất mạng sẽ được kiểm tra
            riêng. Xóa bản lưu không xóa dữ liệu nguồn hoặc cache model.
          </p>
        </div>
      )}
    </section>
  );
}

export default function OfflineManager() {
  return createPortal(
    <OfflineManagerPanel />,
    document.body,
  );
}

