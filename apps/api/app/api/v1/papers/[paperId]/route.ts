import { getDataset } from "../../../../../lib/repository";
import { fail, success } from "../../../../../lib/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    paperId: string;
  }>;
};

/**
 * GET /api/v1/papers/:paperId
 *
 * Lấy thông tin chi tiết của một bài báo.
 *
 * Response gồm:
 * - paper: thông tin bài báo.
 * - point: tọa độ PCA 3D.
 * - bridgeEvidence: thông tin kết nối với các lĩnh vực khác.
 *
 * Lưu ý:
 * PCA chỉ phục vụ trực quan hóa.
 * Không sử dụng tọa độ PCA để tính semantic similarity.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { paperId } = await context.params;

    // Kiểm tra mã bài báo.
    if (
      typeof paperId !== "string" ||
      paperId.trim().length === 0 ||
      paperId.length > 100
    ) {
      return fail(400, "INVALID_PAPER_ID", "Mã bài báo không hợp lệ.");
    }

    // Lấy corpus và semantic index.
    const { corpus, index } = await getDataset();

    // Tìm bài báo trong corpus.
    const paper = corpus.papers.find((item) => item.id === paperId);

    if (!paper) {
      return fail(404, "PAPER_NOT_FOUND", "Không tìm thấy bài báo.");
    }

    // Tìm vector tương ứng trong semantic snapshot.
    const embedding = index.snapshot.papers.find(
      (item) => item.paperId === paper.id,
    );

    if (!embedding) {
      return fail(
        503,
        "PAPER_VECTOR_UNAVAILABLE",
        "Không tìm thấy vector của bài báo.",
      );
    }

    // Phân tích mức độ kết nối giữa các lĩnh vực.
    const bridgeEvidence = index.bridgeEvidence(paper);

    return success({
      paper,
      point: embedding.point,
      bridgeEvidence,
    });
  } catch {
    return fail(503, "PAPER_UNAVAILABLE", "Chưa đọc được thông tin bài báo.");
  }
}
