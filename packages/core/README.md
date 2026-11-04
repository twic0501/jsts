# Core — contract / toán / tìm kiếm

`contracts.ts`: schema Zod, DTO và type. `math.ts`: Complex, quay XYZ, orbit, damping, zoom, góc thời gian. `search.ts`: TF-IDF + từ khóa Việt/Anh, lọc và xếp hạng.

**Bản0.2:** `vector.ts` có normalize/cosine/PCA; `semantic.ts` có SemanticIndex, snapshot schema, ranking, neighbors và bridge evidence. Luồng sản phẩm hiện dùng SemanticIndex. TF-IDF giữ để so baseline, không âm thầm fallback. Test mới: tests/semantic.unit.test.ts.

Không import React, Next, MongoDB hoặc Three.js. Dùng được ở Node và browser, không cần mạng. Hàm thuần không ghi DB. Tất cả số input của hàm toán phải hữu hạn; radius dương, dt không âm.

Test cụ thể: tests/math.unit.test.ts, tests/search.unit.test.ts. Danh mục named functions và biến thực tế: docs/function-catalog.md, docs/code-catalog.json.

Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.


Mốc0.7: rag.ts có6 hàm: chunkPaper, terms, rankPassages, extractiveReport, documentFallbackReport, validateGroundedClaims. Schema researchRequest/Report và researchResponse ở online.ts. Chunk100từ overlap20 max4, giữoffsetgốc; dense+BM25 kết hợpRRF, cosine táchfusionScore; optional rerankScore rawlogit. Inputstrict, citation phải nằm trong evidence. null cho model/trace vắng; undefined cho optionalscore/adapter. Xem docs12/catalognamedfunctions và testRAG.
