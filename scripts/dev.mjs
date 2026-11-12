import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

const backendPort = process.env.API_PORT || "3001";
const frontendPort = process.env.WEB_PORT || "5173";

if (backendPort !== "3001") {
  throw new Error("Bản cơ bản dùng API_PORT=3001 để khớp proxy Vite.");
}

const children = [
  spawn(
    process.execPath,
    [
      path.join(root, "apps/api/node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      backendPort,
    ],
    {
      cwd: path.join(root, "apps/api"),
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ),

  spawn(
    process.execPath,
    [
      path.join(root, "apps/web/node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      frontendPort,
    ],
    {
      cwd: path.join(root, "apps/web"),
      stdio: "inherit",
      env: process.env,
    },
  ),
];

let closing = false;
let exitCode = 0;
let closedCount = 0;

function stop(code = 0) {
  if (closing) return;

  closing = true;
  exitCode = code;

  for (const child of children) {
    // Bỏ qua tiến trình đã kết thúc.
    if (child.exitCode !== null || child.signalCode !== null) {
      continue;
    }

    if (process.platform === "win32") {
      // Windows: kết thúc cả cây tiến trình.
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/T", "/F"],
        { stdio: "ignore" },
      );

      killer.on("error", () => {
        child.kill();
      });

      killer.on("close", (code) => {
        if (code !== 0) {
          child.kill();
        }
      });
    } else {
      // Linux/macOS.
      child.kill("SIGTERM");
    }
  }
}

function handleClose(code, signal) {
  if (!closing) {
    const failureCode = code === 0 && signal === null ? 0 : (code ?? 1);

    stop(failureCode);
  }

  closedCount++;

  // Chỉ thoát khi tất cả tiến trình con đã đóng.
  if (closing && closedCount === children.length) {
    process.exit(exitCode);
  }
}

// Xử lý lỗi khi khởi chạy tiến trình.
for (const child of children) {
  child.on("error", (error) => {
    console.error("Không thể khởi chạy tiến trình:", error.message);
    stop(1);
  });

  child.on("close", handleClose);
}

// Xử lý tín hiệu dừng chương trình.
process.on("SIGINT", () => {
  stop(130);
});

process.on("SIGTERM", () => {
  stop(143);
});
