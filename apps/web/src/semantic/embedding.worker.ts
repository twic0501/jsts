import { env, pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/multilingual-e5-small";

// Cho phép tải model từ Hugging Face khi có Internet.
env.allowRemoteModels = true;

// Không yêu cầu thư mục /models/ phải tồn tại.
env.allowLocalModels = false;

// Lưu model vào bộ nhớ đệm của trình duyệt.
env.useBrowserCache = true;

// Lưu tài nguyên ONNX/WASM để có thể tái sử dụng.
env.useWasmCache = true;

// Sử dụng cấu hình WASM mặc định của thư viện.
// Chỉ đặt wasmPaths = "/wasm/" khi đã triển khai
// đầy đủ các file WASM tại đường dẫn đó.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

type EmbeddingPipeline = Awaited<
  ReturnType<typeof pipeline<"feature-extraction">>
>;

type WorkerRequest = {
  id: string;
  query: string;
};

type WorkerResponse = {
  id: string;
  vector?: number[];
  error?: string;
};

let extractorPromise: Promise<EmbeddingPipeline> | undefined;

function getExtractor(): Promise<EmbeddingPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8",
      device: "wasm",
    }).catch((error: unknown) => {
      extractorPromise = undefined;
      throw error;
    });
  }

  return extractorPromise;
}

async function embed(query: string): Promise<number[]> {
  const extractor = await getExtractor();

  // multilingual-e5-small yêu cầu tiền tố query:
  const output = await extractor(`query: ${query}`, {
    pooling: "mean",
    normalize: true,
  });

  const vector = output.tolist()[0] as number[];

  if (
    !Array.isArray(vector) ||
    vector.length !== 384 ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Embedding không hợp lệ: yêu cầu vector 384 chiều.");
  }

  return vector;
}

// Thực hiện lần lượt các truy vấn để tránh
// khởi tạo và sử dụng model đồng thời.
let queue: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, query } = event.data;

  queue = queue
    .then(async () => {
      try {
        const vector = await embed(query);

        const response: WorkerResponse = {
          id,
          vector,
        };

        self.postMessage(response);
      } catch (error) {
        console.error("[Paper Galaxy] Embedding worker:", error);

        const message = error instanceof Error ? error.message : String(error);

        const response: WorkerResponse = {
          id,
          error: `Không thể tạo embedding: ${message}`,
        };

        self.postMessage(response);
      }
    })
    .catch((error) => {
      console.error("[Paper Galaxy] Worker queue:", error);
    });
};
