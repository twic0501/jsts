import { getDataset } from "../../../../../../lib/repository";
import { fail, success } from "../../../../../../lib/http";

export const runtime = "nodejs";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 50;

type RouteContext = {
  params: Promise<{
    paperId: string;
  }>;
};

/**
 * GET /api/v1/papers/:paperId/neighbors?topK=5
 *
 * Tìm các bài báo gần nhất với bài báo được chỉ định.
 *
 * Similarity được tính trên embedding 384 chiều.
 * Không sử dụng tọa độ PCA 3D để tính similarity.
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { paperId } = await context.params;

    // Kiểm tra paperId.
    if (
      typeof paperId !== "string" ||
      paperId.trim().length === 0 ||
      paperId.length > 100
    ) {
      return fail(400, "INVALID_PAPER_ID", "Mã bài báo không hợp lệ.");
    }

    // Đọc query parameter.
    const url = new URL(request.url);
    const rawTopK = url.searchParams.get("topK");

    let topK = DEFAULT_TOP_K;

    // Kiểm tra topK nếu người dùng truyền vào.
    if (rawTopK !== null) {
      if (!/^\d+$/.test(rawTopK)) {
        return fail(
          422,
          "VALIDATION_ERROR",
          `topK phải là số nguyên từ 1 đến ${MAX_TOP_K}.`,
        );
      }

      topK = Number(rawTopK);

      if (!Number.isSafeInteger(topK) || topK < 1 || topK > MAX_TOP_K) {
        return fail(
          422,
          "VALIDATION_ERROR",
          `topK phải nằm trong khoảng 1-${MAX_TOP_K}.`,
        );
      }
    }

    // Lấy dữ liệu và semantic index.
    const { corpus, index } = await getDataset();

    // Kiểm tra bài báo có tồn tại không.
    const paper = corpus.papers.find((item) => item.id === paperId);

    if (!paper) {
      return fail(404, "PAPER_NOT_FOUND", "Không tìm thấy bài báo.");
    }

    // Tìm các bài báo tương đồng.
    // SemanticIndex.neighbors đã sử dụng cosine similarity
    // trên vector embedding 384 chiều.
    const items = index.neighbors(paper, topK);

    return success({
      paperId: paper.id,
      items,
      total: items.length,
      datasetVersion: corpus.version,
      method: "semantic",
    });
  } catch {
    return fail(
      503,
      "NEIGHBORS_UNAVAILABLE",
      "Chưa tìm được các bài báo liên quan.",
    );
  }
}
