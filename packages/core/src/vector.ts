export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type Projection = {
  mean: number[];
  components: number[][];
  explainedVariance: number[];
  center: Vec3;
  scale: number;
  seed: number;
};

const VECTOR_EPSILON = 1e-12;
const PCA_EPSILON = 1e-10;
const PCA_MAX_ITERATIONS = 200;
const PCA_TOLERANCE = 1e-9;

/**
 * Tính norm Euclidean của vector.
 */
function vectorNorm(vector: readonly number[]): number {
  return Math.hypot(...vector);
}

/**
 * Tính tích vô hướng của hai vector.
 */
function dot(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new RangeError("Hai vector phải có cùng số chiều.");
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result += a[i]! * b[i]!;
  }

  return result;
}

/**
 * Chuẩn hóa vector theo L2 norm.
 *
 * v_normalized = v / ||v||₂
 */
export function normalizeVector(
  input: readonly number[],
  dimensions = input.length,
): number[] {
  if (
    !Number.isInteger(dimensions) ||
    dimensions < 1 ||
    input.length !== dimensions
  ) {
    throw new RangeError("Vector sai số chiều.");
  }

  if (!input.every(Number.isFinite)) {
    throw new RangeError("Vector chứa số không hữu hạn.");
  }

  const norm = vectorNorm(input);

  if (!Number.isFinite(norm) || norm < VECTOR_EPSILON) {
    throw new RangeError("Vector không được có norm bằng 0.");
  }

  return input.map((value) => value / norm);
}

/**
 * Tính Cosine Similarity giữa hai vector.
 *
 * cosine(A, B) = (A · B) / (||A|| × ||B||)
 *
 * Giá trị nằm trong khoảng [-1, 1].
 */
export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length !== b.length) {
    throw new RangeError("Hai vector phải có cùng số chiều.");
  }

  const av = normalizeVector(a);
  const bv = normalizeVector(b);

  const similarity = dot(av, bv);

  if (!Number.isFinite(similarity)) {
    throw new RangeError("Không thể tính Cosine Similarity.");
  }

  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Kiểm tra Projection trước khi sử dụng.
 */
function validateProjection(projection: Projection): number {
  const dimensions = projection.mean.length;

  if (dimensions < 1 || !projection.mean.every(Number.isFinite)) {
    throw new RangeError("Mean của PCA không hợp lệ.");
  }

  if (
    projection.components.length !== 3 ||
    projection.components.some(
      (component) =>
        component.length !== dimensions || !component.every(Number.isFinite),
    )
  ) {
    throw new RangeError("Components của PCA không hợp lệ.");
  }

  if (!Number.isFinite(projection.scale) || projection.scale <= 0) {
    throw new RangeError("Scale của PCA phải là số dương.");
  }

  if (
    !Number.isFinite(projection.center.x) ||
    !Number.isFinite(projection.center.y) ||
    !Number.isFinite(projection.center.z)
  ) {
    throw new RangeError("Center của PCA không hợp lệ.");
  }

  return dimensions;
}

/**
 * Chiếu vector từ không gian nhiều chiều xuống 3D.
 *
 * Quy trình:
 * 1. Trừ mean.
 * 2. Chiếu lên ba principal components.
 * 3. Dịch tâm và chuẩn hóa tọa độ.
 *
 * PCA 3D chỉ phục vụ trực quan hóa.
 * Không sử dụng tọa độ này để tính similarity.
 */
export function projectPca(
  vector: readonly number[],
  projection: Projection,
): Vec3 {
  const dimensions = validateProjection(projection);

  if (vector.length !== dimensions || !vector.every(Number.isFinite)) {
    throw new RangeError("Vector không khớp với PCA projection.");
  }

  const centered = vector.map(
    (value, index) => value - projection.mean[index]!,
  );

  const raw = projection.components.map((component) =>
    dot(centered, component),
  );

  const result: Vec3 = {
    x: (raw[0]! - projection.center.x) * projection.scale,
    y: (raw[1]! - projection.center.y) * projection.scale,
    z: (raw[2]! - projection.center.z) * projection.scale,
  };

  if (
    !Number.isFinite(result.x) ||
    !Number.isFinite(result.y) ||
    !Number.isFinite(result.z)
  ) {
    throw new RangeError("PCA tạo ra tọa độ không hợp lệ.");
  }

  return result;
}

/**
 * Trừ thành phần chiếu lên các vector đã có.
 *
 * Được sử dụng trong Gram-Schmidt
 * để duy trì tính trực giao của các principal components.
 */
function orthogonalize(
  vector: number[],
  previous: readonly number[][],
): number[] {
  const result = [...vector];

  for (const component of previous) {
    const amount = dot(result, component);

    for (let i = 0; i < result.length; i++) {
      result[i] = result[i]! - amount * component[i]!;
    }
  }

  return result;
}

/**
 * Khởi tạo vector xác định dựa trên seed.
 *
 * Không sử dụng Math.random() để bảo đảm
 * kết quả có thể tái tạo.
 */
function createInitialDirection(
  dimensions: number,
  seed: number,
  axis: number,
): number[] {
  const direction = Array.from({ length: dimensions }, (_, index) =>
    Math.sin((index + 1) * (seed + axis * 13.37)),
  );

  const norm = vectorNorm(direction);

  if (norm < PCA_EPSILON) {
    direction[axis % dimensions] = 1;
    return direction;
  }

  return direction.map((value) => value / norm);
}

/**
 * Tính covariance matrix nhân với một vector.
 *
 * Không tạo ma trận covariance D × D.
 *
 * C × v = Xᵀ(Xv) / (n - 1)
 *
 * Bỏ hệ số 1/(n - 1) không làm thay đổi
 * hướng eigenvector trong power iteration.
 */
function covarianceMultiply(
  centered: readonly number[][],
  direction: readonly number[],
): number[] {
  const dimensions = direction.length;

  const result = new Array<number>(dimensions).fill(0);

  for (const row of centered) {
    const weight = dot(row, direction);

    for (let i = 0; i < dimensions; i++) {
      result[i] = result[i]! + weight * row[i]!;
    }
  }

  return result;
}

/**
 * Tìm principal component tiếp theo
 * bằng Power Iteration kết hợp Gram-Schmidt.
 */
function findPrincipalComponent(
  centered: readonly number[][],
  dimensions: number,
  previous: readonly number[][],
  seed: number,
  axis: number,
): number[] {
  let direction = createInitialDirection(dimensions, seed, axis);

  direction = orthogonalize(direction, previous);

  const initialNorm = vectorNorm(direction);

  if (initialNorm < PCA_EPSILON) {
    for (let i = 0; i < dimensions; i++) {
      const candidate = new Array<number>(dimensions).fill(0);

      candidate[i] = 1;

      const orthogonal = orthogonalize(candidate, previous);

      const norm = vectorNorm(orthogonal);

      if (norm >= PCA_EPSILON) {
        direction = orthogonal.map((value) => value / norm);
        break;
      }
    }
  } else {
    direction = direction.map((value) => value / initialNorm);
  }

  for (let iteration = 0; iteration < PCA_MAX_ITERATIONS; iteration++) {
    let next = covarianceMultiply(centered, direction);

    next = orthogonalize(next, previous);

    const norm = vectorNorm(next);

    // Dữ liệu không còn phương sai theo hướng đang xét.
    if (!Number.isFinite(norm) || norm < PCA_EPSILON) {
      return new Array<number>(dimensions).fill(0);
    }

    next = next.map((value) => value / norm);

    const difference = Math.hypot(
      ...next.map((value, index) => value - direction[index]!),
    );

    direction = next;

    if (difference < PCA_TOLERANCE) {
      break;
    }
  }

  // Quy ước dấu để kết quả PCA ổn định hơn.
  let signIndex = 0;

  for (let i = 1; i < dimensions; i++) {
    if (Math.abs(direction[i]!) > Math.abs(direction[signIndex]!)) {
      signIndex = i;
    }
  }

  if (direction[signIndex]! < 0) {
    direction = direction.map((value) => -value);
  }

  return direction;
}

/**
 * Huấn luyện PCA với 3 principal components.
 *
 * Đầu vào:
 * - Ma trận dữ liệu n × d.
 * - n là số lượng tài liệu.
 * - d là số chiều embedding.
 *
 * Đầu ra:
 * - Mean: vector trung bình.
 * - Components: ba hướng PCA.
 * - Explained variance: tỷ lệ phương sai từng trục.
 * - Center và scale: dùng chuẩn hóa tọa độ hiển thị.
 *
 * Độ phức tạp chính:
 * O(n × d × iterations × 3)
 *
 * Không tạo ma trận covariance d × d.
 */
export function fitPca3(vectors: readonly number[][], seed = 42): Projection {
  const first = vectors[0];

  if (!first || vectors.length < 2) {
    throw new RangeError("PCA cần ít nhất hai vector.");
  }

  const dimensions = first.length;

  if (dimensions < 1 || !Number.isInteger(seed)) {
    throw new RangeError("Dữ liệu PCA hoặc seed không hợp lệ.");
  }

  // Kiểm tra dữ liệu đầu vào.
  for (const vector of vectors) {
    if (vector.length !== dimensions || !vector.every(Number.isFinite)) {
      throw new RangeError("Dữ liệu PCA không hợp lệ.");
    }
  }

  // Bước 1: Tính mean của từng chiều.
  const mean = new Array<number>(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      mean[i] = mean[i]! + vector[i]!;
    }
  }

  for (let i = 0; i < dimensions; i++) {
    mean[i] = mean[i]! / vectors.length;
  }

  // Bước 2: Center dữ liệu.
  const centered = vectors.map((vector) =>
    vector.map((value, index) => value - mean[index]!),
  );

  // Tổng bình phương độ lệch.
  const totalVariance = centered.reduce((sum, row) => sum + dot(row, row), 0);

  // Dữ liệu không có phương sai: không cần tìm principal components.
  if (totalVariance <= PCA_EPSILON) {
    const zeroComponent = new Array<number>(dimensions).fill(0);

    return {
      mean,
      components: [[...zeroComponent], [...zeroComponent], [...zeroComponent]],
      explainedVariance: [0, 0, 0],
      center: { x: 0, y: 0, z: 0 },
      scale: 1,
      seed,
    };
  }

  // Dữ liệu ít hơn 3 chiều nhưng có phương sai
  // không thể tạo đủ ba principal components độc lập.
  if (dimensions < 3) {
    throw new RangeError("Dữ liệu PCA hoặc seed không hợp lệ.");
  }

  // Bước 3: Tìm ba principal components.
  const components: number[][] = [];

  const explainedVariance: number[] = [];

  for (let axis = 0; axis < 3; axis++) {
    const component = findPrincipalComponent(
      centered,
      dimensions,
      components,
      seed,
      axis,
    );

    components.push(component);

    const variance = centered.reduce((sum, row) => {
      const projection = dot(row, component);

      return sum + projection * projection;
    }, 0);

    const ratio = totalVariance > PCA_EPSILON ? variance / totalVariance : 0;

    explainedVariance.push(Math.max(0, Math.min(1, ratio)));
  }

  // Bước 4: Chiếu dữ liệu lên không gian 3D.
  const raw = centered.map((vector) =>
    components.map((component) => dot(vector, component)),
  );

  // Bước 5: Tìm giới hạn của từng trục.
  const mins = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];

  const maxs = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (const point of raw) {
    for (let axis = 0; axis < 3; axis++) {
      const value = point[axis]!;

      mins[axis] = Math.min(mins[axis]!, value);

      maxs[axis] = Math.max(maxs[axis]!, value);
    }
  }

  // Bước 6: Tính tâm hiển thị.
  const center: Vec3 = {
    x: (mins[0]! + maxs[0]!) / 2,
    y: (mins[1]! + maxs[1]!) / 2,
    z: (mins[2]! + maxs[2]!) / 2,
  };

  // Bước 7: Tìm bán kính lớn nhất.
  let maxRadius = 0;

  for (const point of raw) {
    const radius = Math.hypot(
      point[0]! - center.x,
      point[1]! - center.y,
      point[2]! - center.z,
    );

    maxRadius = Math.max(maxRadius, radius);
  }

  // Tránh scale bằng 0 khi dữ liệu không có phương sai.
  const scale = 2.5 / Math.max(maxRadius, 1e-8);

  return {
    mean,
    components,
    explainedVariance,
    center,
    scale,
    seed,
  };
}
