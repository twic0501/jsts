# Kiến trúc, API và dữ liệu hiện tại

Kiến trúc thống nhất là modular monolith: React/Vite → webserverNode → Next.jsAPI → repository/RAG → MongoDB vàmodelcục bộ. Hosting mục tiêu thêmNginx tạiHTTPS443; các cổng8080/3001/27017 chỉloopback. Nginx đã kiểmlocal, publichost cầnDNS/chứng chỉ thật.

Cấu trúc: apps/web làUI; apps/api làbackend; packages/core làschema/math/vector/chunk; data làcorpus/manifest; scripts làcông cụJS; tests làkiểm thửTS; deploy làcấu hìnhhạ tầng. README vàAIlog theo module.

Thiết kế đầy đủ, flow,8endpoint, input/output/status,6collectionMongo và3storeIndexedDB: [14-architecture-api-database.md](14-architecture-api-database.md). Phạm vi/yêu cầu nghiệm thu: [13-requirements.md](13-requirements.md).

Luồng online không bắt buộc quaIndexedDB trước: client gửiNext, backend đọcMongo/model/nguồn theo scope, trảkết quả rồi clientlưu bảncache. KhiAPI không truy cập được, browser tìmtrên dữ liệuđãcài/cache bằngE5 và báofallback; khônggọiđây làRAGđầyđủ. Chỉscopeonline/combined mới gọi arXiv/OpenAlex.
