import { searchSchema } from "@paper-galaxy/core";
import { getDataset } from "../../../../lib/repository";
import { fail, success } from "../../../../lib/http";
import { embedQuery } from "../../../../lib/embedding";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Kiểm tra Content-Type
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return fail(415, "CONTENT_TYPE", "Cần gửi application/json.");
  }

  // 2. Đọc JSON, giới hạn kích thước request
  let body: unknown;

  try {
    const reader = request.body?.getReader();
    let bytes = 0;
    let text = "";

    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        bytes += value.byteLength;

        if (bytes > 8192) {
          await reader.cancel();

          return fail(413, "BODY_TOO_LARGE", "Dữ liệu gửi quá lớn.");
        }

        text += decoder.decode(value, {
          stream: true,
        });
      }

      text += decoder.decode();
    }

    body = JSON.parse(text);
  } catch {
    return fail(400, "INVALID_JSON", "Dữ liệu JSON không hợp lệ.");
  }

  // 3. Kiểm tra schema
  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return fail(
      422,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Dữ liệu tìm kiếm không hợp lệ.",
    );
  }

  const started = performance.now();

  // 4. Tải corpus và semantic index
  try {
    const { index } = await getDataset();

    let vector: number[] | undefined;

    // 5. Thử tạo embedding thật
    if (parsed.data.query) {
      try {
        vector = await embedQuery(parsed.data.query);

        console.info("[Paper Galaxy API] Semantic embedding ready", {
          dimensions: vector.length,
        });
      } catch (error) {
        console.error("[Paper Galaxy API] Embedding failed:", error);

        // Không dừng API.
        // SemanticIndex sẽ sử dụng Keyword Fallback.
        vector = undefined;
      }
    }

    // 6. Tìm kiếm
    const result = index.search(parsed.data, vector);

    // 7. PCA chỉ khi có embedding thật
    if (vector) {
      result.queryPoint = index.projectQuery(vector);
    }

    result.durationMs = performance.now() - started;

    console.info("[Paper Galaxy API] Search completed", {
      mode: vector
        ? "semantic"
        : parsed.data.query
          ? "keyword-fallback"
          : "browse",
      total: result.total,
      durationMs: result.durationMs,
    });

    return success(result);
  } catch (error) {
    console.error("[Paper Galaxy API] Search failed:", error);

    return fail(
      503,
      "SEARCH_UNAVAILABLE",
      "Không thể tải dữ liệu hoặc thực hiện tìm kiếm.",
    );
  }
}
