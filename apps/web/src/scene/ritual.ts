/** Choreography in seconds/radians; semantic results gate the first data flight. */
export type Phase =
  | "idle"
  | "waiting"
  | "vortex"
  | "charging"
  | "channeling"
  | "sealing"
  | "closing"
  | "settling"
  | "zooming"
  | "opening"
  | "reading"
  | "turn-framing"
  | "turning"
  | "exit-closing"
  | "exit-zoom"
  | "exit-reopen"
  | "exit-release"
  | "exit-opening";

export const DURATIONS = {
  idle: 0,
  waiting: 0,
  vortex: 5,
  charging: 2.1,
  channeling: 3.8,
  sealing: 1,
  closing: 0.75,
  settling: 1,
  zooming: 0.9,
  opening: 1.2,
  reading: 0,
  "turn-framing": 0.55,
  turning: 1.05,
  "exit-closing": 0.8,
  "exit-zoom": 1,
  "exit-reopen": 1.1,
  "exit-release": 2.6,
  "exit-opening": 0.8,
} as const;

export function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Display bands for this prototype, not calibrated probabilities or scientific quality. */
export const SIMILARITY_BANDS = {
  veryHigh: 0.85,
  high: 0.82,
  medium: 0.79,
} as const;

export function similarityTone(score: number | null): {
  color: string;
  label: string;
} {
  if (score === null || !Number.isFinite(score)) {
    return { color: "#c4b7ff", label: "Chưa có điểm" };
  }

  if (score >= SIMILARITY_BANDS.veryHigh) {
    return { color: "#4de8d8", label: "Tương đồng rất cao" };
  }

  if (score >= SIMILARITY_BANDS.high) {
    return { color: "#6fb4ff", label: "Tương đồng cao" };
  }

  if (score >= SIMILARITY_BANDS.medium) {
    return { color: "#a98bff", label: "Tương đồng vừa" };
  }

  return { color: "#d6cdf2", label: "Tương đồng thấp hơn" };
}

/** 0..1 liên tục theo điểm cosine: điều khiển độ sáng đốm sáng và độ đậm đường nối. */
export function similarityStrength(score: number | null): number {
  if (score === null || !Number.isFinite(score)) return 0.5;

  const { veryHigh, high, medium } = SIMILARITY_BANDS;

  if (score >= veryHigh) {
    return Math.min(1, 0.88 + (score - veryHigh) * 4);
  }

  if (score >= high) {
    return 0.7 + (0.18 * (score - high)) / (veryHigh - high);
  }

  if (score >= medium) {
    return 0.45 + (0.25 * (score - medium)) / (high - medium);
  }

  return Math.max(0.12, 0.45 - (medium - score) * 3);
}

export class BookRitual {
  phase: Phase = "idle";
  age = 0;
  ready = false;

  private exitAngle = 0.72;
  private exitZoom = 0;
  private exitLay = 0;

  start() {
    this.phase = "waiting";
    this.age = 0;
    this.ready = false;
  }

  resolve() {
    if (this.phase === "idle") this.start();
    this.ready = true;
  }

  close() {
    if (this.phase === "idle" || this.phase.startsWith("exit-")) return;

    if (this.phase === "waiting") {
      this.phase = "idle";
      this.age = 0;
      this.ready = false;
      return;
    }

    const s = this.sample();

    this.exitAngle = s.angle;
    this.exitZoom = s.zoom;
    this.exitLay = s.lay;

    this.phase = "exit-closing";
    this.age = 0;
    this.ready = false;
  }

  turn() {
    if (this.phase !== "reading") return false;

    this.phase = "turn-framing";
    this.age = 0;

    return true;
  }

  tick(dt: number, reduced = false) {
    if (!Number.isFinite(dt) || dt < 0) {
      throw new RangeError("dt phải hữu hạn, không âm.");
    }

    if (reduced) {
      this.phase = this.phase.startsWith("exit-")
        ? "idle"
        : this.ready
          ? "reading"
          : this.phase === "idle"
            ? "idle"
            : "waiting";

      this.age = 0;
      return;
    }

    this.age += dt;

    const next: Partial<Record<Phase, Phase>> = {
      vortex: "charging",
      charging: "channeling",
      channeling: "sealing",
      sealing: "closing",
      closing: "settling",
      settling: "zooming",
      zooming: "opening",
      opening: "reading",
      "turn-framing": "turning",
      turning: "reading",
      "exit-closing": "exit-zoom",
      "exit-zoom": "exit-reopen",
      "exit-reopen": "exit-release",
      "exit-release": "exit-opening",
      "exit-opening": "idle",
    };

    for (let guard = 0; guard < 20; guard++) {
      if (this.phase === "waiting") {
        if (!this.ready) {
          this.age = 0;
          break;
        }

        this.phase = "vortex";
        this.age = 0;
        continue;
      }

      const duration = DURATIONS[this.phase];
      const target = next[this.phase];

      if (!target || this.age < duration) break;

      this.age -= duration;
      this.phase = target;
    }
  }

  sample() {
    const phase = this.phase;
    const linear = DURATIONS[phase]
      ? Math.min(1, this.age / DURATIONS[phase])
      : 0;

    const p = smooth(linear);
    const closed = 1.54;
    const rest = 0.72;
    const read = 0.1;

    let angle = rest;
    let zoom = 0;
    let portal = 0;
    let charge = 0;
    let lay = 0;
    let land = 0;
    let release = 0;
    let flip = 0;
    let cast = 0;

    if (phase === "vortex") {
      cast = smooth(this.age / 1.4);
    }

    if (phase === "charging") {
      cast = 1;
      angle = rest - (rest - 0.32) * p;
      charge = Math.sin((Math.PI * this.age) / 0.7) ** 2;
    }

    if (phase === "channeling") {
      cast = 1;
      angle = 0.32;
      portal = smooth(linear / 0.15);
      charge = 0.4 + 0.3 * Math.sin(this.age * 8) ** 2;
    }

    if (phase === "sealing") {
      cast = 1;
      angle = 0.32;
      portal = 1 - p;
    }

    if (phase === "closing") {
      cast = 1;
      angle = 0.32 + (closed - 0.32) * p;
    }

    if (phase === "settling") {
      cast = 1;
      angle = closed;
      lay = p;
      land = p;
    }

    if (phase === "zooming") {
      cast = 1;
      angle = closed;
      lay = 1;
      land = 1;
      zoom = p;
    }

    if (phase === "opening") {
      cast = 1;
      angle = closed + (read - closed) * p;
      lay = 1 - p;
      land = 1;
      zoom = 1;
    }

    if (
      phase === "reading" ||
      phase === "turn-framing" ||
      phase === "turning"
    ) {
      angle = read;
      land = 1;
      zoom = 1;
      flip = phase === "turning" ? p : 0;
    }

    if (phase === "exit-closing") {
      angle = this.exitAngle + (closed - this.exitAngle) * p;
      zoom = this.exitZoom;
      lay = this.exitLay + (1 - this.exitLay) * p;
      land = 1;
    }

    if (phase === "exit-zoom") {
      angle = closed;
      zoom = this.exitZoom * (1 - p);
      lay = 1;
      land = 1;
      cast = p;
    }

    if (phase === "exit-reopen") {
      angle = closed + (rest - closed) * p;
      lay = 1 - p;
      land = 1 - p;
      cast = 1;
    }

    if (phase === "exit-release") {
      angle = rest;
      cast = 1;
      release = p;
    }

    if (phase === "exit-opening") {
      angle = rest;
      release = 1;
      cast = 1 - p;
    }

    return {
      phase,
      p,
      linear,
      angle,
      zoom,
      portal,
      charge,
      lay,
      land,
      release,
      flip,
      cast,
    };
  }
}
