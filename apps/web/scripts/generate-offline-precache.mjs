import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(scriptDir, "../dist");

const excluded = new Set([
  "sw.js",
  "offline-precache.json",
]);

async function collect(directory, files = []) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await collect(fullPath, files);
    } else if (entry.isFile()) {
      const relative = path
        .relative(dist, fullPath)
        .replaceAll("\\", "/");

      // Không tự động precache model AI có kích thước lớn.
      // Model được quản lý bằng cơ chế riêng.
      if (
        relative.startsWith("models/") ||
        relative.endsWith(".map") ||
        excluded.has(relative)
      ) {
        continue;
      }

      files.push(relative);
    }
  }

  return files;
}

const files = (await collect(dist)).sort();

if (!files.includes("index.html")) {
  throw new Error("Không tìm thấy dist/index.html");
}

const hash = createHash("sha256");

for (const relative of files) {
  hash.update(relative);
  hash.update(await fs.readFile(path.join(dist, relative)));
}

const version = hash.digest("hex").slice(0, 16);

const assets = files.map(
  (file) =>
    "/" + file.split("/").map(encodeURIComponent).join("/"),
);

const manifest = {
  version,
  generatedAt: new Date().toISOString(),
  assets,
};

await fs.writeFile(
  path.join(dist, "offline-precache.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);

console.log("Paper Galaxy offline manifest generated.");
console.log("Version:", version);
console.log("Assets:", assets.length);
