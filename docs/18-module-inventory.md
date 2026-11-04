# Module, số hàm/biến và nhật ký AI

Sinh từ code-catalog.json. Hàm có tên và các biến khởi tạo được đếm theo quy tắc AST trong03-ham-bien-toan.md; không tính anonymouscallbacks hoặc node_modules. Phạm viapps/packages/scripts, không cộng mã test/presentation thành chức năng ứng dụng. Không dùng số cũ sau khi sửa mã.

| Module | Hàm có tên | Khởi tạo biến | README | Log phát triển |
|---|---:|---:|---|---|
| Scene3D | 59 | 352 | [README](../apps/web/src/scene/README.md) | [AI log](../apps/web/src/scene/ai-development-log.jsonl) |
| Model trong browser | 2 | 12 | [README](../apps/web/src/semantic/README.md) | [AI log](../apps/web/ai-development-log.jsonl) |
| RAG backend | 21 | 97 | [README](../apps/api/lib/rag/README.md) | [AI log](../apps/api/lib/rag/ai-development-log.jsonl) |
| Nguồn học thuật | 17 | 80 | [README](../apps/api/lib/online/README.md) | [AI log](../apps/api/lib/online/ai-development-log.jsonl) |
| Frontend và lưu web | 23 | 92 | [README](../apps/web/README.md) | [AI log](../apps/web/ai-development-log.jsonl) |
| Backend/API | 20 | 75 | [README](../apps/api/README.md) | [AI log](../apps/api/ai-development-log.jsonl) |
| Core dùng chung | 36 | 122 | [README](../packages/core/README.md) | [AI log](../packages/core/ai-development-log.jsonl) |
| Công cụ và kiểm chứng | 23 | 318 | [README](../scripts/README.md) | [AI log](../scripts/ai-development-log.jsonl) |
| Tổng | 201 | 1148 | | |

Dữ liệu, tests, deploy và docs có README riêng nhưng không thuộc tổng hàm ứng dụng/công cụ trên. Log có thể được lưu tại module cha để tránh nhân bản cùng thông tin; README chỉ rõ vị trí. Các file log ghi nhận phát triển, không phải rawtranscript lịch sử cho mọi function.

## Scene3D

- [apps/web/src/scene/atmosphere.ts](../apps/web/src/scene/atmosphere.ts): 2 hàm có tên — createAtmosphere@4, update@16.
- [apps/web/src/scene/book-pages.ts](../apps/web/src/scene/book-pages.ts): 6 hàm có tên — wrapLines@4, readingPages@6, line@12, block@13, orbitMark@14, createPageTexture@15.
- [apps/web/src/scene/create-book-scene.ts](../apps/web/src/scene/create-book-scene.ts): 29 hàm có tên — textTexture@16, setMathematicalRotation@20, createBookScene@24, updateNetwork@65, updateEdges@66, publish@70, paintPage@71, paintPages@72, clearLeaf@73, planLetters@74, colorScores@75, down@78, pickPaper@79, move@80, up@81, cancel@82, wheel@83, resetCamera@85, animate@87, startSearch@128, empty@129, select@130, turn@131, setPaused@132, zoom@132, focusPage@133, filter@134, setQuery@135, dispose@136.
- [apps/web/src/scene/enchanting-table.ts](../apps/web/src/scene/enchanting-table.ts): 2 hàm có tên — createEnchantingTable@3, block@12.
- [apps/web/src/scene/knowledge-portal.ts](../apps/web/src/scene/knowledge-portal.ts): 2 hàm có tên — createKnowledgePortal@4, update@14.
- [apps/web/src/scene/letter-flight.ts](../apps/web/src/scene/letter-flight.ts): 4 hàm có tên — launchDelay@4, flightProgress@5, arcPoint@6, orderLetters@10.
- [apps/web/src/scene/MagicBook.tsx](../apps/web/src/scene/MagicBook.tsx): 3 hàm có tên — MagicBook@8, close@22, key@23.
- [apps/web/src/scene/ritual.ts](../apps/web/src/scene/ritual.ts): 8 hàm có tên — smooth@4, similarityTone@7, start@16, resolve@17, close@18, turn@19, tick@20, sample@30.
- [apps/web/src/scene/semantic-links.ts](../apps/web/src/scene/semantic-links.ts): 1 hàm có tên — sparseSemanticLinks@3.
- [apps/web/src/scene/spatial-layout.ts](../apps/web/src/scene/spatial-layout.ts): 2 hàm có tên — toLibraryPoint@5, readingCamera@7.

## Model trong browser

- [apps/web/src/semantic/client.ts](../apps/web/src/semantic/client.ts): 2 hàm có tên — getWorker@4, embedQueryLocal@5.
- [apps/web/src/semantic/embedding.worker.ts](../apps/web/src/semantic/embedding.worker.ts): 0 hàm có tên.

## RAG backend

- [apps/api/lib/rag/audit.ts](../apps/api/lib/rag/audit.ts): 1 hàm có tên — auditPrompt@7.
- [apps/api/lib/rag/generation-runtime.mjs](../apps/api/lib/rag/generation-runtime.mjs): 1 hàm có tên — generateLocal@7.
- [apps/api/lib/rag/generation-worker.mjs](../apps/api/lib/rag/generation-worker.mjs): 0 hàm có tên.
- [apps/api/lib/rag/generation.ts](../apps/api/lib/rag/generation.ts): 5 hàm có tên — getWorker@5, generate@6, cleanup@10, fail@11, receive@12.
- [apps/api/lib/rag/prompts.ts](../apps/api/lib/rag/prompts.ts): 5 hàm có tên — planningPrompt@4, parseJson@5, parsePlan@6, synthesisPrompt@11, parseSynthesis@12.
- [apps/api/lib/rag/repository.ts](../apps/api/lib/rag/repository.ts): 3 hàm có tên — database@4, loadResearchDataset@5, saveResearch@14.
- [apps/api/lib/rag/rerank-runtime.mjs](../apps/api/lib/rag/rerank-runtime.mjs): 1 hàm có tên — rerankLocal@7.
- [apps/api/lib/rag/search.ts](../apps/api/lib/rag/search.ts): 4 hàm có tên — digest@7, batches@8, runResearch@9, matches@16.
- [apps/api/lib/rag/service.ts](../apps/api/lib/rag/service.ts): 1 hàm có tên — researchSearch@12.

## Nguồn học thuật

- [apps/api/lib/online/providers.ts](../apps/api/lib/online/providers.ts): 13 hàm có tên — record@3, text@4, cleanText@5, reconstructAbstract@6, guessGroup@7, https@8, safeDoi@9, normalizeOpenAlex@10, normalizeArxiv@19, field@20, deduplicatePapers@25, limitedText@28, searchProvider@29.
- [apps/api/lib/online/search.ts](../apps/api/lib/online/search.ts): 4 hàm có tên — hash@9, runOnlineSearch@10, matches@12, onlineSearch@23.

## Frontend và lưu web

- [apps/web/src/App.tsx](../apps/web/src/App.tsx): 8 hàm có tên — App@16, update@25, listener@41, local@49, search@69, changeScope@70, bookmark@71, chooseGroup@72.
- [apps/web/src/main.tsx](../apps/web/src/main.tsx): 0 hàm có tên.
- [apps/web/src/offline-ready.ts](../apps/web/src/offline-ready.ts): 1 hàm có tên — checkOfflineReady@2.
- [apps/web/src/PaperDossier.tsx](../apps/web/src/PaperDossier.tsx): 4 hàm có tên — paperSource@5, paperCitation@6, PaperDossier@7, copyCitation@9.
- [apps/web/src/ResearchPanel.tsx](../apps/web/src/ResearchPanel.tsx): 1 hàm có tên — ResearchPanel@4.
- [apps/web/src/storage.ts](../apps/web/src/storage.ts): 8 hàm có tên — db@3, upgrade@3, saveCorpus@4, loadCorpus@5, loadBookmarks@6, setBookmark@7, saveOnlineDataset@8, loadOnlineDataset@9.
- [apps/web/vite.config.ts](../apps/web/vite.config.ts): 1 hàm có tên — configureServer@6.

## Backend/API

- [apps/api/app/api/v1/graph/route.ts](../apps/api/app/api/v1/graph/route.ts): 1 hàm có tên — GET@4.
- [apps/api/app/api/v1/health/route.ts](../apps/api/app/api/v1/health/route.ts): 1 hàm có tên — GET@4.
- [apps/api/app/api/v1/papers/route.ts](../apps/api/app/api/v1/papers/route.ts): 1 hàm có tên — GET@4.
- [apps/api/app/api/v1/papers/[paperId]/neighbors/route.ts](../apps/api/app/api/v1/papers/[paperId]/neighbors/route.ts): 1 hàm có tên — GET@4.
- [apps/api/app/api/v1/papers/[paperId]/route.ts](../apps/api/app/api/v1/papers/[paperId]/route.ts): 1 hàm có tên — GET@4.
- [apps/api/app/api/v1/search/route.ts](../apps/api/app/api/v1/search/route.ts): 1 hàm có tên — POST@6.
- [apps/api/app/api/v2/search/route.ts](../apps/api/app/api/v2/search/route.ts): 1 hàm có tên — POST@6.
- [apps/api/app/api/v3/research/route.ts](../apps/api/app/api/v3/research/route.ts): 1 hàm có tên — POST@6.
- [apps/api/app/layout.tsx](../apps/api/app/layout.tsx): 1 hàm có tên — RootLayout@2.
- [apps/api/app/page.tsx](../apps/api/app/page.tsx): 1 hàm có tên — Page@1.
- [apps/api/lib/embedding-runtime.mjs](../apps/api/lib/embedding-runtime.mjs): 2 hàm có tên — getExtractor@7, embedTexts@14.
- [apps/api/lib/embedding-worker.mjs](../apps/api/lib/embedding-worker.mjs): 0 hàm có tên.
- [apps/api/lib/embedding.ts](../apps/api/lib/embedding.ts): 4 hàm có tên — getWorker@6, fail@10, embedBatch@12, embedQuery@20.
- [apps/api/lib/http.ts](../apps/api/lib/http.ts): 2 hàm có tên — fail@1, success@2.
- [apps/api/lib/repository.ts](../apps/api/lib/repository.ts): 1 hàm có tên — getDataset@10.
- [apps/api/next.config.ts](../apps/api/next.config.ts): 1 hàm có tên — headers@8.

## Core dùng chung

- [packages/core/src/contracts.ts](../packages/core/src/contracts.ts): 0 hàm có tên.
- [packages/core/src/math.ts](../packages/core/src/math.ts): 8 hàm có tên — finite@2, constructor@4, rotate@5, rotatePoint3D@7, orbitPosition@14, damp@21, zoomRadius@22, stepAngle@23.
- [packages/core/src/online.ts](../packages/core/src/online.ts): 3 hàm có tên — embeddingText@14, validateBundle@15, mergeBundles@17.
- [packages/core/src/rag.ts](../packages/core/src/rag.ts): 6 hàm có tên — chunkPaper@16, terms@22, rankPassages@24, extractiveReport@34, documentFallbackReport@37, validateGroundedClaims@42.
- [packages/core/src/search.ts](../packages/core/src/search.ts): 8 hàm có tên — normalizeText@4, tokenize@5, expandQuery@6, counts@7, magnitude@8, constructor@11, search@17, neighbors@27.
- [packages/core/src/semantic.ts](../packages/core/src/semantic.ts): 6 hàm có tên — validateSnapshot@14, constructor@23, search@24, neighbors@32, projectQuery@33, bridgeEvidence@34.
- [packages/core/src/vector.ts](../packages/core/src/vector.ts): 5 hàm có tên — normalizeVector@3, cosineSimilarity@7, dot@10, projectPca@11, fitPca3@17.

## Công cụ và kiểm chứng

- [scripts/build-sw.mjs](../scripts/build-sw.mjs): 1 hàm có tên — walk@5.
- [scripts/capture-book-qa.mjs](../scripts/capture-book-qa.mjs): 0 hàm có tên.
- [scripts/capture-dossier.mjs](../scripts/capture-dossier.mjs): 0 hàm có tên.
- [scripts/capture-liquid.mjs](../scripts/capture-liquid.mjs): 0 hàm có tên.
- [scripts/capture-online.mjs](../scripts/capture-online.mjs): 0 hàm có tên.
- [scripts/capture-research.mjs](../scripts/capture-research.mjs): 0 hàm có tên.
- [scripts/capture-ritual.mjs](../scripts/capture-ritual.mjs): 0 hàm có tên.
- [scripts/check-browser-semantic.mjs](../scripts/check-browser-semantic.mjs): 0 hàm có tên.
- [scripts/check-model.mjs](../scripts/check-model.mjs): 0 hàm có tên.
- [scripts/check-offline-ai.mjs](../scripts/check-offline-ai.mjs): 0 hàm có tên.
- [scripts/check-online.mjs](../scripts/check-online.mjs): 0 hàm có tên.
- [scripts/check-proxy-cancellation.mjs](../scripts/check-proxy-cancellation.mjs): 0 hàm có tên.
- [scripts/check-research.mjs](../scripts/check-research.mjs): 0 hàm có tên.
- [scripts/copy-wasm.mjs](../scripts/copy-wasm.mjs): 0 hàm có tên.
- [scripts/debug-offline.mjs](../scripts/debug-offline.mjs): 0 hàm có tên.
- [scripts/dev.mjs](../scripts/dev.mjs): 1 hàm có tên — stop@12.
- [scripts/document-code.mjs](../scripts/document-code.mjs): 3 hàm có tên — files@4, visit@7, escape@15.
- [scripts/document-modules.mjs](../scripts/document-modules.mjs): 0 hàm có tên.
- [scripts/evaluate-semantic.mjs](../scripts/evaluate-semantic.mjs): 0 hàm có tên.
- [scripts/fetch-papers.mjs](../scripts/fetch-papers.mjs): 3 hàm có tên — clean@5, field@6, parse@21.
- [scripts/log-immersive.mjs](../scripts/log-immersive.mjs): 0 hàm có tên.
- [scripts/log-liquid.mjs](../scripts/log-liquid.mjs): 0 hàm có tên.
- [scripts/log-online.mjs](../scripts/log-online.mjs): 0 hàm có tên.
- [scripts/log-ritual.mjs](../scripts/log-ritual.mjs): 0 hàm có tên.
- [scripts/measure-online.mjs](../scripts/measure-online.mjs): 1 hàm có tên — percentile@4.
- [scripts/measure-research.mjs](../scripts/measure-research.mjs): 2 hàm có tên — request@3, percentile@4.
- [scripts/measure.mjs](../scripts/measure.mjs): 1 hàm có tên — percentile@6.
- [scripts/mongo.mjs](../scripts/mongo.mjs): 1 hàm có tên — stop@7.
- [scripts/prepare-semantic.mjs](../scripts/prepare-semantic.mjs): 1 hàm có tên — hash@7.
- [scripts/preview.mjs](../scripts/preview.mjs): 1 hàm có tên — stop@4.
- [scripts/seed.mjs](../scripts/seed.mjs): 0 hàm có tên.
- [scripts/serve-production.mjs](../scripts/serve-production.mjs): 2 hàm có tên — handle@12, stop@31.
- [scripts/setup-model.mjs](../scripts/setup-model.mjs): 0 hàm có tên.
- [scripts/setup-rag-model.mjs](../scripts/setup-rag-model.mjs): 0 hàm có tên.
- [scripts/test-https.mjs](../scripts/test-https.mjs): 1 hàm có tên — get@9.
- [scripts/test-network-guard.mjs](../scripts/test-network-guard.mjs): 0 hàm có tên.
- [scripts/test-nginx.mjs](../scripts/test-nginx.mjs): 1 hàm có tên — get@14.
- [scripts/test-resilience.mjs](../scripts/test-resilience.mjs): 4 hàm có tên — pause@7, request@8, summarize@9, save@11.
- [scripts/write-development-logs.mjs](../scripts/write-development-logs.mjs): 0 hàm có tên.

Mọi tham số/return ở function-catalog.md; mọi biểu thức gán khởi tạo ở variable-catalog.md. Giá trị môi trường/secret không được thu thập. Hàm kiểm thử nằm tests, log kiểm thử ở docs/evidence; cấu hình hosting ở deploy, không được gọi là đã public chỉ vì có file cấu hình.
