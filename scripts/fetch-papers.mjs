import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const GROUPS = ["ai", "biology", "medicine", "physics"];

function decodeXml(value) {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (entity, code) => {
      const key = code.toLowerCase();

      if (key === "amp") return "&";
      if (key === "lt") return "<";
      if (key === "gt") return ">";
      if (key === "quot") return '"';
      if (key === "apos") return "'";

      const number = key.startsWith("#x")
        ? parseInt(key.slice(2), 16)
        : Number(key.slice(1));

      if (
        !Number.isInteger(number) ||
        number < 0 ||
        number > 0x10ffff ||
        (number >= 0xd800 && number <= 0xdfff)
      ) {
        return entity;
      }

      return String.fromCodePoint(number);
    },
  );
}

const clean = (value) =>
  decodeXml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/\s+/g, " ")
    .trim();

const field = (entry, name) =>
  clean(
    entry.match(
      new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">"),
    )?.[1] || "",
  );

const summaries = {
  1706.03762:
    "Kiến trúc Transformer dùng attention để xử lý chuỗi và dịch máy.",
  1810.04805: "BERT học biểu diễn ngôn ngữ hai chiều để hiểu văn bản.",
  1512.03385: "Mạng residual giúp huấn luyện mô hình nhận diện ảnh sâu hơn.",
  1505.04597: "U-Net phân đoạn ảnh y sinh với kiến trúc encoder–decoder.",
  1406.2661: "Hai mạng đối kháng học cách tạo dữ liệu mới.",
  2005.14165: "Mô hình ngôn ngữ quy mô lớn học tác vụ từ một vài ví dụ.",
  2010.11929: "Áp dụng Transformer cho bài toán nhận diện hình ảnh.",
  2006.11239: "Mô hình diffusion học tái tạo hình ảnh qua quá trình khử nhiễu.",
  "2103.00020": "Kết nối hình ảnh và ngôn ngữ bằng biểu diễn học chung.",
  "1602.07360": "SqueezeNet giảm số tham số cho mô hình nhận diện ảnh gọn nhẹ.",
  "1803.09010":
    "Đề xuất tài liệu mô tả tập dữ liệu để tăng tính minh bạch và khả năng tái sử dụng.",
  2106.09685:
    "LoRA điều chỉnh mô hình ngôn ngữ bằng các ma trận hạng thấp để giảm chi phí huấn luyện.",
};

function inferGroup(id, categories, forced) {
  if (id === "1505.04597") {
    return "medicine";
  }

  if (forced) {
    if (!GROUPS.includes(forced)) {
      throw new Error("Nhóm dữ liệu không hợp lệ: " + forced);
    }

    return forced;
  }

  if (categories.some((category) => category.startsWith("q-bio"))) {
    return "biology";
  }

  if (categories.some((category) => category.includes("med-ph"))) {
    return "medicine";
  }

  if (
    categories.some(
      (category) =>
        category.startsWith("quant-") || category.startsWith("physics"),
    )
  ) {
    return "physics";
  }

  return "ai";
}

function parse(xml, forced) {
  if (!xml.includes("<feed")) {
    throw new Error("arXiv Atom feed không hợp lệ.");
  }

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const rawId = field(entry, "id");
    const idMatch = rawId.match(/\/abs\/([^?#]+)/);

    const id = idMatch?.[1].replace(/v\d+$/, "");

    if (!id) {
      throw new Error("Missing arXiv ID");
    }

    const categories = [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(
      (match) => clean(match[1]),
    );

    const title = field(entry, "title");
    const abstract = field(entry, "summary");

    const published = field(entry, "published");
    const year = Number(published.slice(0, 4));

    if (!title) {
      throw new Error("Paper thiếu tiêu đề: " + id);
    }

    if (!abstract) {
      throw new Error("Paper thiếu abstract: " + id);
    }

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new Error("Năm xuất bản không hợp lệ: " + id);
    }

    const group = inferGroup(id, categories, forced);

    return {
      id,
      title,
      abstract,

      authors: [...entry.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(
        ([, author]) => field(author, "name"),
      ),

      year,
      group,
      categories,

      sourceUrl: "https://arxiv.org/abs/" + id,

      tags: categories,

      summary:
        summaries[id] ||
        {
          biology:
            "Nghiên cứu sinh học và mô hình tính toán cho dữ liệu sinh học.",
          medicine:
            "Phương pháp tính toán và hình ảnh trong nghiên cứu y sinh.",
          physics: "Nghiên cứu vật lý và mô hình hóa hệ thống.",
          ai: "Nghiên cứu phương pháp học máy và trí tuệ nhân tạo.",
        }[group],
    };
  });
}

// 1. Đọc dữ liệu arXiv có sẵn.
const seed = await fs.readFile(path.join(root, "data/arxiv-seed.atom"), "utf8");

let papers = parse(seed);

// 2. Thu thập thêm dữ liệu theo từng nhóm.
const queries = [
  ["biology", "cat:q-bio.BM AND all:learning"],
  ["medicine", "cat:physics.med-ph AND all:imaging"],
  ["physics", "cat:quant-ph AND all:learning"],
];

for (const [group, query] of queries) {
  // Giữ khoảng cách giữa các request đến arXiv.
  await new Promise((resolve) => setTimeout(resolve, 3100));

  const url = new URL("https://export.arxiv.org/api/query");

  url.search = new URLSearchParams({
    search_query: query,
    max_results: "6",
    sortBy: "relevance",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error("arXiv HTTP " + response.status);
  }

  const xml = await response.text();

  await fs.writeFile(path.join(root, `data/arxiv-${group}.atom`), xml);

  papers.push(...parse(xml, group));
}

// 3. Loại bỏ paper trùng ID.
// Giữ bản ghi xuất hiện đầu tiên để tránh ghi đè nhóm.
const uniquePapers = new Map();

for (const paper of papers) {
  if (!uniquePapers.has(paper.id)) {
    uniquePapers.set(paper.id, paper);
  }
}

papers = [...uniquePapers.values()];

if (papers.length === 0) {
  throw new Error("Không thu thập được bài báo nào.");
}

// 4. Tạo corpus.
const corpus = {
  version: "arxiv-starter-2026-11-04-v1",
  title: "Thư viện khởi đầu · arXiv",
  fetchedAt: new Date().toISOString(),
  papers,
};

// 5. Lưu corpus.
await fs.writeFile(
  path.join(root, "data/corpus.json"),
  JSON.stringify(corpus, null, 2) + "\n",
);

// 6. Thống kê phân bố dữ liệu.
const distribution = Object.fromEntries(
  GROUPS.map((group) => [
    group,
    papers.filter((paper) => paper.group === group).length,
  ]),
);

console.log(
  "Saved " +
    papers.length +
    " actual arXiv records. " +
    JSON.stringify(distribution),
);
