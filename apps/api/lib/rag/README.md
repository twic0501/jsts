# Local research / RAG — JS và TypeScript

Kiến trúc chi tiết: docs/12-rag-architecture.md. POST /api/v3/research: corpus/cache Mongo → query planning → provider khi online → chunk → E5+BM25/RRF → cross encoder → context → diễn giải có ID nguồn → kiểm hợp đồng → scene và bảng dẫn chứng. Không gọi dịch vụ LLM ngoài.

| File | Số hàm có tên | Trách nhiệm |
|---|---:|---|
| search.ts |4|digest hash; batches chia batch2; matches lọc field/year; runResearch orchestrator |
| prompts.ts |5|planningPrompt, parseJson, parsePlan, synthesisPrompt, parseSynthesis |
| generation.ts |5|getWorker, generate; cleanup/fail/receive quản lý listener, timeout và kết quả |
| generation-runtime.mjs |1|generateLocal verify manifest, load local Qwen3, greedy/no thinking |
| rerank-runtime.mjs |1|rerankLocal verify/load MiniLM, tokenize text_pair, trả logits |
| repository.ts |3|database, loadResearchDataset, saveResearch |
| service.ts |1|researchSearch kết nối dependency thật, cache và persistence |
| audit.ts |1|auditPrompt ghi input/output/promptVersion/accepted thật |

generation-worker.mjs chỉ có callback xử lý message, không named function theo quy tắc AST. Catalog thật xem docs/function-catalog.md/code-catalog.json; không cộng anonymous callbacks vào số hàm trên.

Input strict, body8KiB, query2..300, scope3giá trị, topK1..20, group/year tùy chọn. Output research giữ plan/evidence/claims/mode/retrieval/gaps/traceId/model/metrics. Citation phải nằm trong context; quote là substring nguyên văn bằng start/end. Kiểm này không chứng minh mọi câu model sinh đúng nghĩa.

Biến: conceptual là câu≥5từ; plan.method original khi query ngắn hoặc planner lỗi; fresh≤24bài; passages≤4đoạn/bài; queryVectors giữ câu gốc và ý định riêng; fusionScore là điểm kết hợp thứ hạng; cosine là điểm384D; rerankScore rawlogit không phải %. evidence≤6, context synthesis≤4. traceId dùng UUID, worker request id tách riêng. warnings là lỗi fallback đã lược chi tiết; không trả rawexception/secret.

Model manifest pinned/hash: E5Q8, Qwen3-0.6BQ4, MiniLMcrossencoderQ8. pnpm ai:rag:setup tải2model bổ sung; lần đầu cần Internet. Lần chạy sau allowRemoteModels=false, local_files_only=true. KhôngPython/khôngtrain. Inference cần hàng giây tới hàng chục giây tùy câu và cache. Reranker tiếng Anh không dùng trực tiếp câu Việt nếu planner lỗi.

null: report không có model sinh diễn giải hoặc trace ở browser fallback. undefined: optional rerank adapter/score khi chưa chạy. [] cho thiếu nguồn/evidence/claims. Không dùng null thay lỗi503. Một lượt generator đang chạy;45stimeout/lượt;90snhàn terminate. Embedding cache600vector, responsecache20key/5phút. Mongo cache60bài, ragRunsTTL7ngày. Prompt runtime tối đa50stage trong .local/rag-prompts.json; dữ liệu cục bộ khôngpublic. Model có thể trả tiếng Anh hoặc không đủ bằng chứng; UI hiện giới hạn.

Kiểm thử: tests/rag.unit.test.ts, tests/e2e/research.spec.ts, scripts/check-research.mjs, check-offline-ai.mjs, capture-research.mjs. Unit có dependency injection; live check tách nguồn/model/Mongo thật. Không gọi fixture là inference thật. Không coi IDcitation đúng là entailment hoặc hiểu đúng mọi câu hỏi. Kết quả docs/verification.md.
