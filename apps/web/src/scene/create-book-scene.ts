import * as THREE from 'three'
import {
  Complex,
  damp,
  orbitPosition,
  rotatePoint3D,
  zoomRadius,
  GROUPS,
  SemanticIndex,
  type Paper,
  type SemanticSnapshot,
  type Point3,
} from '@paper-galaxy/core'
import { createEnchantingTable } from './enchanting-table'
import { BookRitual, similarityStrength, similarityTone, smooth, type Phase } from './ritual'
import { createPageTexture, readingPages, type BookPage } from './book-pages'
import { createAtmosphere } from './atmosphere'
import { toLibraryPoint, readingCamera, PAGE_WIDTH_SCALE, type PageFocus } from './spatial-layout'
import { launchDelay, flightProgress, arcPoint, orderLetters } from './letter-flight'
import { createKnowledgePortal } from './knowledge-portal'
import { sparseSemanticLinks, type SemanticLink } from './semantic-links'

/* ===== Sửa lỗi dấu tiếng Việt khi vẽ chữ lên trang sách (canvas) =====
 * Phông chữ gốc thiếu một số chữ có hai dấu (ế, ố, ằ...) nên dấu bị rời ra. Đoạn này:
 *  1) đổi MỌI họ phông (có chân / không chân) sang bộ phông đủ tiếng Việt, giữ nguyên cỡ, đậm, nghiêng;
 *  2) chuẩn hoá chữ về dạng NFC trước khi vẽ;
 *  3) áp dụng cho cả canvas thường và OffscreenCanvas.
 * Có thể xoá khi đã sửa phông trực tiếp trong book-pages.ts.
 * Kiểm tra: mở DevTools > Console, gõ document.documentElement.dataset.vnCanvasFont → phải ra "on". */
;(() => {
  const SERIF = '"Times New Roman","Noto Serif","DejaVu Serif",Georgia,serif',
    SANS = '"Segoe UI",Arial,"Noto Sans","DejaVu Sans",sans-serif'
  const fixFont = (value: string) => {
    const m =
      /^(.*?\b\d+(?:\.\d+)?(?:px|pt|em|rem)(?:\s*\/\s*[\d.]+(?:px|pt|em|rem)?)?)\s+(.+)$/.exec(
        value
      )
    if (!m) return value
    const family = m[2]!
    if (/mono/i.test(family)) return value
    return `${m[1]} ${/sans-serif|system-ui|-apple-system|segoe|arial|helvetica|verdana|tahoma|calibri|roboto|\binter\b/i.test(family) ? SANS : SERIF}`
  }
  const patch = (proto: object | undefined) => {
    if (!proto) return
    const target = proto as Record<string, unknown> & { __vnFont?: boolean }
    if (target.__vnFont) return
    target.__vnFont = true
    const desc = Object.getOwnPropertyDescriptor(proto, 'font')
    if (desc?.get && desc.set) {
      const getFont = desc.get,
        setFont = desc.set
      Object.defineProperty(proto, 'font', {
        configurable: true,
        enumerable: desc.enumerable,
        get(this: unknown) {
          return getFont.call(this)
        },
        set(this: unknown, value: string) {
          setFont.call(this, typeof value === 'string' ? fixFont(value) : value)
        },
      })
    }
    for (const name of ['fillText', 'strokeText', 'measureText']) {
      const original = target[name] as
        | ((this: unknown, text: string, ...rest: number[]) => unknown)
        | undefined
      if (typeof original === 'function')
        target[name] = function (this: unknown, text: string, ...rest: number[]) {
          return original.call(
            this,
            typeof text === 'string' ? text.normalize('NFC') : text,
            ...rest
          )
        }
    }
  }
  if (typeof CanvasRenderingContext2D !== 'undefined') patch(CanvasRenderingContext2D.prototype)
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined')
    patch(OffscreenCanvasRenderingContext2D.prototype)
  if (typeof document !== 'undefined') document.documentElement.dataset.vnCanvasFont = 'on'
})()

/* ===== Kế hoạch lan tỏa tri thức (đã gộp vào file này) ===== */
/**
 * Kế hoạch "lan tỏa tri thức": bài giống câu hỏi nhất xuất hiện đầu tiên, rồi các đường nối
 * được vẽ dần sang những bài tiếp theo. Toàn bộ là hàm thuần (không đụng tới Three.js) để
 * kiểm tra được bằng test.
 */
export type SpreadStep = { id: string; parent: string | null; score: number }

/** Thời gian (giây) của hiệu ứng. Chỉnh ở đây để đổi nhịp lan tỏa. */
export const SPREAD = {
  rootAt: 1.1, // bài số 1 hiện ra sau khi đốm sáng bay từ sách tới nơi
  linkDur: 0.7, // thời gian một đường nối được vẽ xong
  popDur: 0.55, // thời gian một đốm sáng nở ra
  minStep: 0.06, // khoảng cách tối thiểu giữa hai bài liên tiếp
  maxStep: 0.22, // khoảng cách tối đa
  budget: 4.2, // tổng thời gian lan tỏa mong muốn (giây)
} as const

function spreadStep(n: number) {
  return Math.max(SPREAD.minStep, Math.min(SPREAD.maxStep, SPREAD.budget / Math.max(1, n - 1)))
}

/** Lúc đường nối dẫn tới bài thứ i bắt đầu được vẽ (i >= 1). */
export function linkStartAt(i: number, n: number) {
  return SPREAD.rootAt + (i - 1) * spreadStep(n)
}

/** Lúc bài thứ i bắt đầu hiện ra (đường nối vừa chạm tới). */
export function appearAt(i: number, n: number) {
  return i === 0 ? SPREAD.rootAt : linkStartAt(i, n) + SPREAD.linkDur * 0.85
}

/** Tổng thời gian của cả đợt lan tỏa. */
export function spreadDuration(n: number) {
  return appearAt(Math.max(0, n - 1), n) + SPREAD.popDur + 0.4
}

/** 0 → 1 với một chút "nảy" ở cuối (đỉnh khoảng 1.1). */
export function popCurve(x: number) {
  if (!Number.isFinite(x) || x <= 0) return 0
  if (x >= 1) return 1
  return 1 - Math.pow(1 - x, 3) + Math.sin(x * Math.PI) * 0.12
}

/**
 * Lan tỏa kiểu Prim: bắt đầu từ bài điểm cao nhất, mỗi bước thêm bài "gần" nhất với tập đã
 * chạm tới (cosine thật giữa hai bài), ưu tiên bài có điểm cao với câu hỏi.
 *
 * @param rows    láng giềng cosine của từng bài
 * @param scores  điểm của từng bài so với câu hỏi (hoặc bài đang chọn)
 * @param visible các bài đang hiển thị (sau khi lọc)
 * @param limit   số bài tối đa tham gia lan tỏa
 */
function planSpread(
  rows: { id: string; neighbors: { id: string; score: number }[] }[],
  scores: ReadonlyMap<string, number>,
  visible: ReadonlySet<string>,
  limit = 60
): SpreadStep[] {
  const candidates = [...scores]
    .filter(([id, s]) => visible.has(id) && Number.isFinite(s))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
  if (candidates.length === 0) return []

  const ids = new Set(candidates.map(([id]) => id))
  const score = new Map(candidates)
  const sim = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!ids.has(row.id)) continue
    const m = new Map<string, number>()
    for (const nb of row.neighbors)
      if (ids.has(nb.id) && Number.isFinite(nb.score)) m.set(nb.id, nb.score)
    sim.set(row.id, m)
  }

  const root = candidates[0]![0]
  const steps: SpreadStep[] = [{ id: root, parent: null, score: score.get(root)! }]
  const reached = [root]
  const left = new Set(ids)
  left.delete(root)

  while (left.size) {
    let best: { id: string; parent: string; link: number; priority: number } | null = null
    for (const u of left) {
      let parent: string | null = null
      let link = -Infinity
      for (const v of reached) {
        const s = sim.get(u)?.get(v) ?? sim.get(v)?.get(u)
        if (s !== undefined && s > link) {
          link = s
          parent = v
        }
      }
      if (parent === null) continue
      const priority = link + 0.5 * score.get(u)!
      if (!best || priority > best.priority || (priority === best.priority && u < best.id)) {
        best = { id: u, parent, link, priority }
      }
    }
    if (!best) {
      // không có số đo cosine giữa bài này và tập đã chạm tới: nối thẳng vào bài số 1
      const u = [...left].sort()[0]!
      best = { id: u, parent: root, link: score.get(u)!, priority: 0 }
    }
    steps.push({ id: best.id, parent: best.parent, score: best.link })
    reached.push(best.id)
    left.delete(best.id)
  }
  return steps
}

/** Dữ liệu cảnh 3D chia sẻ cho bản đồ 2D (vị trí màn hình hiện tại, toạ độ PCA, điểm cosine, kế hoạch lan tỏa). */
export type Export2D = {
  width: number
  height: number
  anchorId: string | null
  focusIds: string[]
  nodes: {
    id: string
    visible: boolean
    home: Point3
    score: number | null
    screen: { x: number; y: number } | null
  }[]
  plan: SpreadStep[]
  links: SemanticLink[]
}
export type ReadingState = { phase: Phase; spread: number; spreads: number }
export type SpatialHover = { paper: Paper; score: number | null } | null
export type BookSceneHandle = {
  select: (paper: Paper | null) => void
  startSearch: () => void
  showResults: () => void
  export2D: () => Export2D
  inspect: (paper: Paper | null) => void
  empty: () => void
  turn: (direction: number) => void
  setScores: (scores: { id: string; score: number }[]) => void
  setPaused: (value: boolean) => void
  zoom: (direction: number) => void
  reset: () => void
  focusPage: (focus: PageFocus) => void
  filter: (ids: string[]) => void
  setQuery: (point: Point3 | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  dispose: () => void
}
type Glyph = {
  sprite: THREE.Sprite
  angle: number
  radius: number
  height: number
  speed: number
  phase: number
  paperId: string
  rank: number
  origin: Point3
}
function textTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas không khả dụng.')
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '68px Georgia, serif'
  ctx.fillText(text, 48, 48, 88)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
function setMathematicalRotation(object: THREE.Object3D, angles: Point3) {
  const x = rotatePoint3D({ x: 1, y: 0, z: 0 }, angles),
    y = rotatePoint3D({ x: 0, y: 1, z: 0 }, angles),
    z = rotatePoint3D({ x: 0, y: 0, z: 1 }, angles)
  object.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3(x.x, x.y, x.z),
      new THREE.Vector3(y.x, y.y, y.z),
      new THREE.Vector3(z.x, z.y, z.z)
    )
  )
}
export function createBookScene(
  canvas: HTMLCanvasElement,
  onStatus: (label: string) => void,
  snapshot: SemanticSnapshot,
  papers: Paper[],
  onSelect: (paper: Paper) => void,
  onReading: (state: ReadingState) => void,
  onHover: (hover: SpatialHover) => void
): BookSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
  renderer.setClearColor('#101729')
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#101729', 0.028)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  scene.add(new THREE.AmbientLight('#d7d9ff', 2.1))
  const key = new THREE.DirectionalLight('#fff4dd', 3)
  key.position.set(3, 7, 4)
  scene.add(key)
  const light = new THREE.PointLight('#a697ff', 30, 18)
  light.position.set(-3, 3, -2)
  scene.add(light)
  const glow = new THREE.PointLight('#a9ede1', 10, 8)
  glow.position.set(0, 0.7, 0)
  scene.add(glow)
  const beforeAtmosphere = new Set<THREE.Object3D>(scene.children)
  const atmosphere = createAtmosphere(scene)
  const atmosphereObjects = scene.children.filter((o) => !beforeAtmosphere.has(o))
  const portal = createKnowledgePortal(scene)
  const book = new THREE.Group()
  book.scale.setScalar(1.1)
  scene.add(book)
  const table = createEnchantingTable()
  table.scale.setScalar(0.9)
  table.position.y = -0.25
  scene.add(table)
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.4, 0.12, 96),
    new THREE.MeshStandardMaterial({ color: '#151b2d', metalness: 0.7, roughness: 0.25 })
  )
  floor.position.y = -2.1
  scene.add(floor)
  const leather = new THREE.MeshStandardMaterial({
      color: '#374258',
      roughness: 0.48,
      metalness: 0.38,
    }),
    gold = new THREE.MeshStandardMaterial({ color: '#cfb886', metalness: 0.8, roughness: 0.28 }),
    paperMaterial = new THREE.MeshStandardMaterial({ color: '#e6dac1', roughness: 0.9 })
  // Printed ink keeps its contrast independently of the nearby magic light.
  const pageMaps = [createPageTexture(null), createPageTexture(null)]
  const pageMaterials = pageMaps.map(
    (map) =>
      new THREE.MeshBasicMaterial({
        map,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
      })
  )
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 2.65), leather)
  book.add(spine)
  for (const z of [-0.9, 0, 0.9]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.085), gold)
    band.position.z = z
    book.add(band)
  }
  const halves = [new THREE.Group(), new THREE.Group()]
  halves.forEach((half, i) => {
    const side = i === 0 ? -1 : 1
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 2.72), leather)
    cover.position.set(side * 0.8, -0.12, 0)
    half.add(cover)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.115, 2.65), gold)
    edge.position.set(side * 0.8, -0.115, 0)
    half.add(edge)
    const inset = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.122, 2.57), leather)
    inset.position.set(side * 0.8, -0.112, 0)
    half.add(inset)
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.2, 2.5), paperMaterial)
    block.position.set(side * 0.78, 0.04, 0)
    half.add(block)
    for (let j = 0; j < 7; j++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.475, 0.006, 2.51),
        new THREE.MeshStandardMaterial({ color: j % 2 ? '#d0bd99' : '#f4e5c8' })
      )
      line.position.set(side * 0.78, -0.035 + j * 0.023, 0)
      half.add(line)
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 2.5), pageMaterials[i])
    top.renderOrder = 10
    setMathematicalRotation(top, { x: -Math.PI / 2, y: 0, z: 0 })
    top.position.set(side * 0.78, 0.145, 0)
    half.add(top)
    for (const z of [-1.2, 1.2]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.145, 0.2), gold)
      corner.position.set(side * 1.43, -0.08, z)
      half.add(corner)
    }
    book.add(half)
  })
  // Each vertex bends around the spine as the flexible leaf turns.
  const leafGeometry = new THREE.PlaneGeometry(1.46, 2.5, 24, 1),
    leafBase = Float32Array.from(leafGeometry.getAttribute('position').array)
  const leafMaterial = new THREE.MeshBasicMaterial({
      side: THREE.FrontSide,
      toneMapped: false,
      transparent: true,
      depthTest: false,
    }),
    leafBackMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      toneMapped: false,
      transparent: true,
      depthTest: false,
    })
  const leaf = new THREE.Mesh(leafGeometry, leafMaterial),
    leafBack = new THREE.Mesh(leafGeometry, leafBackMaterial)
  leaf.renderOrder = leafBack.renderOrder = 12
  leaf.visible = leafBack.visible = false
  book.add(leaf, leafBack)
  let turnFrontTexture: THREE.Texture | null = null,
    turnBackTexture: THREE.Texture | null = null
  const glyphTextures: THREE.Texture[] = [],
    textureCache = new Map<string, THREE.Texture>(),
    glyphs: Glyph[] = []
  for (let i = 0; i < 144; i++) {
    const paper = papers[i % papers.length]!,
      characters = Array.from(paper.title.replace(/[^\p{L}\p{N}]/gu, '')),
      character = characters[Math.floor(i / papers.length) % characters.length] ?? '∑'
    let texture = textureCache.get(character)
    if (!texture) {
      texture = textTexture(character)
      textureCache.set(character, texture)
      glyphTextures.push(texture)
    }
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: '#d1d5ef',
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        toneMapped: false,
      })
    )
    sprite.scale.setScalar(0.23 + (i % 4) * 0.012)
    scene.add(sprite)
    glyphs.push({
      sprite,
      angle: i * 2.39996,
      radius: 2.1 + ((i % 19) / 19) * 2.1,
      height: 0.3 + ((i % 13) / 13) * 3.4,
      speed: 0.13 + (i % 7) * 0.024,
      phase: i * 0.83,
      paperId: paper.id,
      rank: -1,
      origin: { x: 0, y: 0, z: 0 },
    })
  }
  const map = new THREE.Group()
  scene.add(map)
  const mapNodes = new Map<string, THREE.Mesh>(),
    mapPaper = new Map(papers.map((p) => [p.id, p])),
    halos = new Map<string, THREE.Sprite>()
  const semanticIndex = new SemanticIndex(
    { version: snapshot.corpusVersion, title: '', fetchedAt: '', papers },
    snapshot
  )
  const haloCanvas = document.createElement('canvas')
  haloCanvas.width = haloCanvas.height = 64
  const haloContext = haloCanvas.getContext('2d')!
  const haloWash = haloContext.createRadialGradient(32, 32, 0, 32, 32, 32)
  haloWash.addColorStop(0, '#ffffff')
  haloWash.addColorStop(0.18, '#ffffffa0')
  haloWash.addColorStop(1, '#ffffff00')
  haloContext.fillStyle = haloWash
  haloContext.fillRect(0, 0, 64, 64)
  const haloTexture = new THREE.CanvasTexture(haloCanvas)
  for (const embedding of snapshot.papers) {
    const paper = mapPaper.get(embedding.paperId)
    if (!paper) continue
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 16, 12),
      new THREE.MeshBasicMaterial({
        color: GROUPS[paper.group].color,
        toneMapped: false,
        transparent: true,
        opacity: 0.55,
      })
    )
    const p = toLibraryPoint(embedding.point)
    mesh.position.set(p.x, p.y, p.z)
    mesh.userData.paperId = paper.id
    map.add(mesh)
    mapNodes.set(paper.id, mesh)
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color: GROUPS[paper.group].color,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    )
    halo.position.copy(mesh.position)
    halo.scale.setScalar(0.4)
    map.add(halo)
    halos.set(paper.id, halo)
  }
  const queryNode = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12),
    new THREE.MeshBasicMaterial({ color: '#fff3ad', wireframe: true })
  )
  queryNode.visible = false
  map.add(queryNode)
  let edgeGeometry = new THREE.BufferGeometry()
  const edges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({
      color: '#79f6dc',
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
    })
  )
  map.add(edges)
  const beamGeometry = new THREE.BufferGeometry(),
    beamMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  const beams = new THREE.LineSegments(beamGeometry, beamMaterial)
  beams.frustumCulled = false
  scene.add(beams)
  const networkMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
    network = new THREE.LineSegments(new THREE.BufferGeometry(), networkMaterial),
    linkLights = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.07,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        depthWrite: false,
      })
    )
  linkLights.frustumCulled = false
  map.add(network, linkLights)
  let links: SemanticLink[] = []
  const neighborRows = papers.map((paper) => ({
    id: paper.id,
    neighbors: semanticIndex
      .neighbors(paper, papers.length - 1)
      .map((hit) => ({ id: hit.paper.id, score: hit.score })),
  }))
  function updateNetwork() {
    const visible = new Set([...mapNodes].filter(([, node]) => node.visible).map(([id]) => id))
    rebuildPlan(visible)
    links =
      plan.length > 1
        ? plan.slice(1).map((step) => ({ a: step.parent!, b: step.id, score: step.score }))
        : sparseSemanticLinks(neighborRows, visible)
    const lightColors: number[] = []
    for (const link of links) {
      const color = baseColors.get(link.a) ?? tint('#a9cfff')
      lightColors.push(color.r, color.g, color.b)
    }
    network.geometry.dispose()
    network.geometry = new THREE.BufferGeometry()
    network.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(links.length * CURVE_SEG * 6), 3)
    )
    network.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(new Float32Array(links.length * CURVE_SEG * 6), 3)
    )
    linkLights.geometry.dispose()
    linkLights.geometry = new THREE.BufferGeometry()
    linkLights.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(links.length * 3), 3)
    )
    linkLights.geometry.setAttribute('color', new THREE.Float32BufferAttribute(lightColors, 3))
    canvas.dataset.networkEdges = String(links.length)
    writeNetwork(spreadClock())
  }
  function updateEdges(paper: Paper | null) {
    const points: THREE.Vector3[] = []
    if (paper) {
      const source = mapNodes.get(paper.id)
      if (source)
        for (const neighbor of semanticIndex.neighbors(paper, 5)) {
          const target = mapNodes.get(neighbor.paper.id)
          if (target && target.visible) curveSegments(source.position, target.position, points)
        }
    }
    edgeGeometry.dispose()
    edgeGeometry = new THREE.BufferGeometry().setFromPoints(points)
    edges.geometry = edgeGeometry
    canvas.dataset.relatedEdges = String(points.length / 2 / CURVE_SEG)
  }
  const ritual = new BookRitual(),
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let selected: Paper | null = null,
    focus: PageFocus = 'auto',
    paused = false,
    disposed = false,
    elapsed = 0,
    last = 0,
    frame = 0,
    spread = 0,
    pendingSpread = 0,
    pages: BookPage[] = [],
    notified = '',
    hoverId = '',
    lastProjection = 0,
    activeLetterCount = 0,
    activeTargets: string[] = [],
    pendingScores: { id: string; score: number }[] | null = null,
    currentPageAngle = 0.72
  const scoreValues = new Map<string, number>(),
    worldNodes = new Map<string, Point3>(),
    neutralInk = new THREE.Color('#d1d5ef'),
    baseColors = new Map<string, THREE.Color>()
  /* ===== THEME SÁNG / TỐI ===== */
  let isLight = false
  /** Ở chế độ sáng: giảm độ sáng màu neon để đọc được trên nền sáng. */
  const tint = (hex: string) => {
    const c = new THREE.Color(hex)
    if (isLight) {
      const hsl = { h: 0, s: 0, l: 0 }
      c.getHSL(hsl)
      c.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.min(hsl.l, 0.38))
    }
    return c
  }
  const blendTargets: THREE.Material[] = [
    networkMaterial,
    beamMaterial,
    linkLights.material as THREE.Material,
    ...[...halos.values()].map((h) => h.material),
  ]
  const atmosphereMats = new Map<THREE.Material, { blending: THREE.Blending; opacity: number }>()
  atmosphereObjects.forEach((o) =>
    o.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      for (const x of Array.isArray(m) ? m : [m])
        atmosphereMats.set(x, { blending: x.blending, opacity: x.opacity })
    })
  )
  const darkMats = new Map<THREE.MeshStandardMaterial, THREE.Color>()
  for (const root of [table, floor])
    root.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      for (const x of Array.isArray(m) ? m : [m])
        if (x instanceof THREE.MeshStandardMaterial) {
          const hsl = { h: 0, s: 0, l: 0 }
          x.color.getHSL(hsl)
          if (hsl.l < 0.14) darkMats.set(x, x.color.clone())
        }
    })
  function applyTheme(next: 'light' | 'dark') {
    isLight = next === 'light'
    const bg = isLight ? '#eceffc' : '#101729',
      fog = scene.fog as THREE.FogExp2
    renderer.setClearColor(bg)
    fog.color.set(bg)
    fog.density = isLight ? 0.016 : 0.028
    neutralInk.set(isLight ? '#3a4172' : '#d1d5ef')
    queryGlow.material.color.set(isLight ? '#f59e0b' : '#fff3ad')
    ;(queryNode.material as THREE.MeshBasicMaterial).color.set(isLight ? '#d97706' : '#fff3ad')
    ;(edges.material as THREE.LineBasicMaterial).color.set(isLight ? '#0d9488' : '#79f6dc')
    const blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending
    for (const m of blendTargets) {
      m.blending = blending
      m.needsUpdate = true
    }
    for (const [m, o] of atmosphereMats) {
      m.blending = isLight ? THREE.NormalBlending : o.blending
      m.opacity = isLight ? o.opacity * 0.45 : o.opacity
      m.needsUpdate = true
    }
    for (const [m, original] of darkMats) {
      m.color.copy(original)
      if (isLight) m.color.lerp(new THREE.Color('#b4badb'), 0.72)
    }
    for (const [id, node] of mapNodes) {
      const base = scoreValues.has(id)
          ? similarityTone(scoreValues.get(id)!).color
          : GROUPS[mapPaper.get(id)!.group].color,
        c = tint(base)
      if (scoreValues.size) baseColors.set(id, c)
      ;(node.material as THREE.MeshBasicMaterial).color.copy(c)
      halos.get(id)!.material.color.copy(c)
    }
    updateNetwork()
  }

  /* ===== LAN TỎA TRI THỨC: bài số 1 → các bài liên quan, đường nối vẽ dần theo độ tương đồng ===== */
  let plan: SpreadStep[] = [],
    revealMode: 'idle' | 'hold' | 'run' = 'idle',
    spreadStart = 0
  const planIndex = new Map<string, number>()
  /** Bài giống nhất được neo ở đây (toạ độ thế giới, trên quyển sách). Đổi ANCHOR để dời vị trí. */
  const ANCHOR = { x: 0, y: 3.3, z: -1.8 },
    anchorTarget = new THREE.Vector3()
  let anchorId: string | null = null,
    anchorBlend = 0,
    focusId = '',
    focusSet = new Set<string>()
  const spark = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: '#9ff3e6',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  )
  spark.visible = false
  scene.add(spark)
  blendTargets.push(spark.material)
  const queryGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: '#fff3ad',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  )
  queryGlow.scale.setScalar(1.1)
  queryNode.add(queryGlow)
  blendTargets.push(queryGlow.material)
  /** Giây kể từ lúc bắt đầu lan tỏa; -1 khi đang chờ; Infinity khi đã xong. */
  const spreadClock = () =>
    revealMode === 'run' ? elapsed - spreadStart : revealMode === 'hold' ? -1 : Infinity
  function rebuildPlan(visible: ReadonlySet<string>) {
    plan = scoreValues.size ? planSpread(neighborRows, scoreValues, visible) : []
    planIndex.clear()
    plan.forEach((step, i) => planIndex.set(step.id, i))
    if (!plan.length) {
      anchorId = null
      galaxyOn = false
    }
    if (galaxyOn) computeGalaxy()
    else cloudCenter.set(0, 4.1, -4.2)
  }
  function linkDone(link: SemanticLink) {
    const i = planIndex.get(link.b)
    if (i === undefined || revealMode === 'idle') return true
    return spreadClock() >= linkStartAt(i, plan.length) + SPREAD.linkDur
  }
  /** Vẽ lại các đường nối theo thời gian T: đầu đường nối trượt dần từ bài cha tới bài con, độ đậm theo cosine. */
  function writeNetwork(T: number) {
    const pos = network.geometry.getAttribute('position') as THREE.BufferAttribute | undefined,
      col = network.geometry.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!pos || !col || pos.count !== links.length * CURVE_SEG * 2) return
    const bg = new THREE.Color('#eceffc'),
      ca = new THREE.Color(),
      cb = new THREE.Color(),
      c = new THREE.Color(),
      ctrl = new THREE.Vector3(),
      p0 = new THREE.Vector3(),
      p1 = new THREE.Vector3()
    links.forEach((link, j) => {
      const na = mapNodes.get(link.a),
        nb = mapNodes.get(link.b)
      if (!na || !nb) return
      const a = na.position,
        b = nb.position,
        i = planIndex.get(link.b),
        p =
          i === undefined || T === Infinity
            ? 1
            : Math.max(0, Math.min(1, (T - linkStartAt(i, plan.length)) / SPREAD.linkDur)),
        e = smooth(p)
      let k = (0.22 + 0.78 * similarityStrength(link.score)) * (p > 0 ? 1 : 0)
      if (focusId) k *= link.a === focusId || link.b === focusId ? 1.7 : 0.3
      else if (anchorId && scoreValues.size && link.a === anchorId) k *= 1.5
      linkCtrl(a, b, ctrl)
      ca.copy(baseColors.get(link.a) ?? tint(GROUPS[mapPaper.get(link.a)!.group].color))
      cb.copy(baseColors.get(link.b) ?? tint(GROUPS[mapPaper.get(link.b)!.group].color))
      for (let s = 0; s < CURVE_SEG; s++) {
        const t0 = s / CURVE_SEG,
          t1 = (s + 1) / CURVE_SEG
        bez(a, ctrl, b, Math.min(t0, e), p0)
        bez(a, ctrl, b, Math.min(t1, e), p1)
        const o = (j * CURVE_SEG + s) * 2
        pos.setXYZ(o, p0.x, p0.y, p0.z)
        pos.setXYZ(o + 1, p1.x, p1.y, p1.z)
        for (let v = 0; v < 2; v++) {
          c.copy(ca).lerp(cb, v ? t1 : t0)
          if (isLight) c.lerp(bg, 1 - Math.min(1, k))
          else c.multiplyScalar(k)
          col.setXYZ(o + v, c.r, c.g, c.b)
        }
      }
    })
    pos.needsUpdate = true
    col.needsUpdate = true
  }
  /** Mức "đã hiện" của một đốm sáng: 0 = mờ nền, 1 = sáng đủ (có thể vọt lên ~1.1 khi nở). */
  function appearOf(id: string) {
    if (revealMode === 'idle' || !scoreValues.size) return 1
    const i = planIndex.get(id)
    if (i === undefined || revealMode === 'hold') return 0
    return popCurve((elapsed - spreadStart - appearAt(i, plan.length)) / SPREAD.popDur)
  }
  function holdSpread() {
    if (reduced.matches) return
    revealMode = 'hold'
    writeNetwork(-1)
  }
  function endSpread() {
    revealMode = 'idle'
    writeNetwork(Infinity)
  }
  function startSpread() {
    if (plan.length) anchorId = plan[0]!.id
    if (reduced.matches || plan.length < 1) {
      endSpread()
      return
    }
    revealMode = 'run'
    spreadStart = elapsed
    spark.material.color.copy(tint(similarityTone(scoreValues.get(plan[0]!.id) ?? null).color))
  }
  function tickSpread() {
    canvas.dataset.reveal = revealMode
    queryGlow.visible = queryNode.visible
    queryGlow.material.opacity = 0.42 + 0.2 * Math.sin(elapsed * 2.4)
    spark.visible = false
    if (revealMode !== 'run') return
    const T = elapsed - spreadStart,
      n = plan.length
    if (T > spreadDuration(n)) {
      endSpread()
      return
    }
    writeNetwork(T)
    if (T < SPREAD.rootAt + 0.35) {
      const target = worldNodes.get(plan[0]!.id)
      if (target) {
        const k = smooth(T / SPREAD.rootAt),
          at = arcPoint({ x: 0, y: book.position.y + 0.9, z: 0 }, target, k, 1.1)
        spark.position.set(at.x, at.y, at.z)
        spark.visible = true
        spark.scale.setScalar(0.55 * (1 - 0.35 * k) + 0.18 * Math.sin(T * 18) ** 2)
        spark.material.opacity =
          T < SPREAD.rootAt ? 0.95 : Math.max(0, 0.95 * (1 - (T - SPREAD.rootAt) / 0.35))
      }
    }
  }

  /* ===== BỐ CỤC THIÊN HÀ + ĐƯỜNG CONG + CAMERA FOCUS ===== */
  /** Chỉnh nhanh: bán kính vòng gần/xa nhất quanh bài số 1, độ zoom khi focus (nhỏ hơn = zoom gần hơn). */
  const GALAXY = { inner: 1.4, outer: 4.4, flatten: 0.55, minGap: 0.95 },
    AUTO_ZOOM = 0.72,
    NODE_ZOOM = 0.6
  /** Độ đậm của quầng sáng quanh mỗi đốm: 1 = như cũ, 0.5 = nhạt hơn, 0 = tắt hẳn quầng sáng. */
  const HALO_STRENGTH = 2
  const CURVE_SEG = 14,
    _up = new THREE.Vector3(0, 1, 0),
    _m = new THREE.Vector3(),
    _t = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _p = new THREE.Vector3(),
    cloudCenter = new THREE.Vector3(0, 4.1, -4.2)
  const homePos = new Map<string, THREE.Vector3>()
  mapNodes.forEach((n, id) => homePos.set(id, n.position.clone()))
  const galaxyTarget = new Map<string, THREE.Vector3>()
  let galaxyOn = false,
    layoutBlend = 0,
    layoutApplied = false,
    camFocusId: string | null = null,
    camZoomTarget = 1,
    camZoom = 1
  const camOff = { x: 0, y: 0, z: 0 }
  /** Điểm điều khiển của đường cong: lệch ngang theo hướng xoáy quanh tâm, tạo các "nhánh" như thiên hà. */
  function linkCtrl(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3) {
    _m.addVectors(a, b).multiplyScalar(0.5)
    const len = a.distanceTo(b)
    _t.copy(_m).sub(cloudCenter)
    _t.crossVectors(_up, _t)
    if (_t.lengthSq() < 1e-6) {
      _t.subVectors(b, a)
      _t.crossVectors(_up, _t)
    }
    if (_t.lengthSq() < 1e-9) _t.set(1, 0, 0)
    _t.normalize().multiplyScalar(len * 0.2)
    out.copy(_m).add(_t)
    out.y += len * 0.05
    return out
  }
  function bez(
    a: THREE.Vector3,
    c: THREE.Vector3,
    b: THREE.Vector3,
    t: number,
    out: THREE.Vector3
  ) {
    const u = 1 - t
    return out.set(
      u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      u * u * a.z + 2 * u * t * c.z + t * t * b.z
    )
  }
  function curveSegments(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3[]) {
    linkCtrl(a, b, _c)
    let prev = a.clone()
    for (let i = 1; i <= CURVE_SEG; i++) {
      const next = bez(a, _c, b, i / CURVE_SEG, new THREE.Vector3())
      out.push(prev, next)
      prev = next
    }
  }
  /**
   * Bố cục thiên hà: bài số 1 ở tâm; các bài khác nằm trên các vòng quanh tâm, bán kính tăng dần khi điểm cosine
   * thật giảm dần. Hướng của mỗi bài lấy từ toạ độ PCA (so với trọng tâm) nên các bài cùng chủ đề vẫn gần nhau.
   */
  function computeGalaxy() {
    galaxyTarget.clear()
    if (plan.length < 2) {
      cloudCenter.set(0, 4.1, -4.2)
      return
    }
    const root = homePos.get(plan[0]!.id)!,
      centroid = new THREE.Vector3()
    for (const step of plan) centroid.add(homePos.get(step.id)!)
    centroid.multiplyScalar(1 / plan.length)
    const top = scoreValues.get(plan[0]!.id) ?? 1,
      low = Math.min(...plan.slice(1).map((step) => scoreValues.get(step.id) ?? top)),
      span = Math.max(1e-6, top - low)
    const radii: number[] = [0],
      pts: THREE.Vector3[] = [new THREE.Vector3()]
    plan.forEach((step, i) => {
      if (i === 0) return
      const d = homePos.get(step.id)!.clone().sub(centroid)
      d.y *= GALAXY.flatten
      if (d.lengthSq() < 1e-6) d.set(Math.cos(i * 2.4), 0, Math.sin(i * 2.4))
      d.normalize()
      const t = Math.max(0, Math.min(1, (top - (scoreValues.get(step.id) ?? low)) / span)),
        r = GALAXY.inner + Math.pow(t, 0.85) * (GALAXY.outer - GALAXY.inner)
      radii.push(r)
      pts.push(d.multiplyScalar(r))
    })
    for (let it = 0; it < 40; it++) {
      for (let i = 1; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const diff = pts[i]!.clone().sub(pts[j]!),
            dist = diff.length()
          if (dist < GALAXY.minGap) {
            if (dist < 1e-4) diff.set(Math.cos(i + j), 0.2, Math.sin(i + j))
            diff.normalize().multiplyScalar((GALAXY.minGap - dist) / 2)
            pts[i]!.add(diff)
            pts[j]!.sub(diff)
          }
        }
      for (let i = 1; i < pts.length; i++) {
        const l = pts[i]!.length() || 1
        pts[i]!.multiplyScalar(radii[i]! / l)
      }
    }
    plan.forEach((step, i) => {
      if (i > 0) galaxyTarget.set(step.id, root.clone().add(pts[i]!))
    })
    cloudCenter.copy(root)
  }

  let yaw = Math.PI / 2,
    targetYaw = Math.PI / 2,
    pitch = 0.43,
    targetPitch = 0.43,
    radius = 16,
    targetRadius = 12,
    centerY = 2.8,
    centerX = 0,
    centerZ = -1.8
  function publish() {
    const signature = `${ritual.phase}:${spread}:${pages.length}`
    if (signature !== notified) {
      notified = signature
      onReading({ phase: ritual.phase, spread, spreads: Math.max(1, pages.length / 2) })
    }
  }
  function paintPage(side: number, index: number) {
    const material = pageMaterials[side]!
    material.map?.dispose()
    material.map = createPageTexture(pages[index] ?? null, index)
    material.userData.pageIndex = index
    material.needsUpdate = true
  }
  function paintPages() {
    pageMaterials.forEach((_, i) => paintPage(i, spread * 2 + i))
    canvas.dataset.spread = String(spread)
    canvas.dataset.pageText = pages
      .slice(spread * 2, spread * 2 + 2)
      .map((p) => p.lines.join(' '))
      .join(' ')
  }
  function clearLeaf() {
    leafMaterial.map = leafBackMaterial.map = null
    turnFrontTexture?.dispose()
    turnBackTexture?.dispose()
    turnFrontTexture = turnBackTexture = null
    leaf.visible = leafBack.visible = false
  }
  function planLetters() {
    const plan = orderLetters(
      glyphs.map((g) => g.paperId),
      scoreValues,
      new Set([...mapNodes].filter(([, n]) => n.visible).map(([id]) => id))
    )
    activeTargets = plan.targets
    activeLetterCount = plan.indices.length
    glyphs.forEach((g) => (g.rank = -1))
    plan.indices.forEach((index, rank) => (glyphs[index]!.rank = rank))
    const positions = new Float32Array(activeTargets.length * 6),
      colors = new Float32Array(activeTargets.length * 6)
    activeTargets.forEach((id, i) => {
      const c = new THREE.Color(similarityTone(scoreValues.get(id) ?? null).color)
      for (let end = 0; end < 2; end++) {
        colors[i * 6 + end * 3] = c.r
        colors[i * 6 + end * 3 + 1] = c.g
        colors[i * 6 + end * 3 + 2] = c.b
      }
    })
    beams.geometry.dispose()
    beams.geometry = new THREE.BufferGeometry()
    beams.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    beams.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    canvas.dataset.routedLetters = String(activeLetterCount)
    canvas.dataset.routeTargets = JSON.stringify(activeTargets)
  }
  function colorScores(scores: { id: string; score: number }[]) {
    if (ritual.phase.startsWith('exit-')) {
      pendingScores = scores
      return
    }
    scoreValues.clear()
    scores.forEach((s) => scoreValues.set(s.id, s.score))
    for (const [id, node] of mapNodes) {
      const color = scoreValues.has(id)
        ? similarityTone(scoreValues.get(id)!).color
        : GROUPS[mapPaper.get(id)!.group].color
      baseColors.set(id, tint(color))
      ;(node.material as THREE.MeshBasicMaterial).color.copy(tint(color))
      halos.get(id)!.material.color.copy(tint(color))
    }
    planLetters()
    updateNetwork()
    canvas.dataset.colorBasis = scores.length ? 'cosine-384d' : 'neutral'
  }
  const resize = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width && rect.height) {
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
  })
  resize.observe(canvas)
  let drag: { x: number; y: number } | undefined,
    clickStart = { x: 0, y: 0 }
  const raycaster = new THREE.Raycaster()
  function down(e: PointerEvent) {
    if (e.button !== 0) return
    drag = { x: e.clientX, y: e.clientY }
    clickStart = { ...drag }
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
  }
  function pickPaper(x: number, y: number) {
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        (-(y - rect.top) / rect.height) * 2 + 1
      ),
      camera
    )
    if (ritual.sample().zoom > 0.9 && raycaster.intersectObject(book, true).length) return undefined
    const hit = raycaster.intersectObjects(
      [book, table, ...[...mapNodes.values()].filter((n) => n.visible)],
      true
    )[0]
    return hit ? mapPaper.get(String(hit.object.userData.paperId)) : undefined
  }
  function move(e: PointerEvent) {
    if (!drag) {
      const paper = pickPaper(e.clientX, e.clientY),
        id = paper?.id ?? ''
      canvas.style.cursor = paper ? 'pointer' : 'grab'
      if (id !== hoverId) {
        hoverId = id
        updateEdges(paper ?? selected)
        onHover(paper ? { paper, score: scoreValues.get(id) ?? null } : null)
      }
      return
    }
    targetYaw -= (e.clientX - drag.x) * 0.008
    targetPitch = Math.max(0.12, Math.min(1.2, targetPitch + (e.clientY - drag.y) * 0.006))
    drag = { x: e.clientX, y: e.clientY }
  }
  function up(e: PointerEvent) {
    drag = undefined
    canvas.style.cursor = 'grab'
    if (Math.hypot(e.clientX - clickStart.x, e.clientY - clickStart.y) > 5) return
    const paper = pickPaper(e.clientX, e.clientY)
    if (paper) onSelect(paper)
  }
  function cancel() {
    drag = undefined
    canvas.style.cursor = 'grab'
  }
  function wheel(e: WheelEvent) {
    e.preventDefault()
    targetRadius = zoomRadius(targetRadius, e.deltaY * 0.01)
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  canvas.addEventListener('wheel', wheel, { passive: false })
  function resetCamera() {
    targetYaw = Math.PI / 2
    targetPitch = 0.43
    targetRadius = 12
    camFocusId = null
    camZoomTarget = 1
  }
  updateEdges(null)
  updateNetwork()
  const repaintOnFonts = () => {
    if (!disposed) paintPages()
  }
  if (typeof document !== 'undefined' && document.fonts) {
    void document.fonts.ready.then(repaintOnFonts)
    document.fonts.addEventListener?.('loadingdone', repaintOnFonts)
  }
  function animate(now: number) {
    if (disposed) return
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const motion = !paused && !reduced.matches
    if (motion) elapsed += dt
    const previous = ritual.phase
    if (!paused) ritual.tick(dt, reduced.matches)
    if (previous === 'turn-framing' && ritual.phase === 'turning') {
      const side = pendingSpread > spread ? 1 : 0
      paintPage(side, pendingSpread * 2 + side)
    }
    if (
      (previous === 'turning' || previous === 'turn-framing') &&
      ritual.phase !== 'turning' &&
      ritual.phase !== 'turn-framing'
    ) {
      if (ritual.phase === 'reading') {
        spread = pendingSpread
        paintPages()
      }
      clearLeaf()
    }
    if (previous !== ritual.phase && ritual.phase === 'vortex')
      for (const g of glyphs)
        g.origin = { x: g.sprite.position.x, y: g.sprite.position.y, z: g.sprite.position.z }
    if (previous !== 'idle' && ritual.phase === 'idle' && !selected) {
      pages = []
      spread = 0
      paintPages()
      canvas.dataset.paper = ''
      if (pendingScores) {
        const scores = pendingScores
        pendingScores = null
        colorScores(scores)
      }
    }
    if (revealMode === 'hold' && ritual.phase === 'idle') endSpread()
    const state = ritual.sample()
    publish()
    const blend = state.zoom,
      turnView = state.phase === 'turn-framing' || state.phase === 'turning',
      reading = readingCamera(camera.aspect, turnView ? 'both' : focus),
      compact = camera.aspect < 0.8
    const foldFrame =
      state.phase === 'zooming' || state.phase === 'turn-framing'
        ? 1
        : state.phase === 'opening' || state.phase === 'turning'
          ? 1 - smooth((state.p - 0.7) / 0.3)
          : 0
    const protectInk = (state.phase === 'reading' || turnView) && currentPageAngle < 0.22
    for (const material of pageMaterials) {
      material.depthTest = !protectInk
      if (material.transparent !== protectInk) {
        material.transparent = protectInk
        material.needsUpdate = true
      }
    }
    let filmYaw = Math.PI / 2 + (1.35 - Math.PI / 2) * state.cast,
      filmPitch = 0.43 + (0.36 - 0.43) * state.cast,
      filmRadius = 16 + 1.5 * state.cast,
      filmCenter = 2.8 + 0.2 * state.cast
    if (state.phase === 'channeling') {
      filmYaw = 1.35 + 0.5 * state.p
      filmPitch = 0.36 + 0.27 * state.p
      filmRadius = 17.5 - 3.5 * state.p
      filmCenter = 3 - 1.2 * state.p
    }
    if (state.phase === 'sealing' || state.phase === 'closing') {
      filmYaw = 1.9
      filmPitch = 0.63
      filmRadius = 14
      filmCenter = 1.8
    }
    if (state.phase === 'settling' || state.phase === 'zooming' || state.phase === 'opening') {
      filmYaw = 1.9 - 0.3 * state.land
      filmPitch = 0.63 + 0.17 * state.land
      filmRadius = 11.8 - 1.8 * state.land
      filmCenter = 1 - state.land
    }
    if (compact) filmRadius += state.cast * 4
    yaw = damp(
      yaw,
      filmYaw * (1 - blend) + (Math.PI / 2) * blend + (targetYaw - Math.PI / 2),
      7,
      dt
    )
    pitch = damp(
      pitch,
      Math.max(0.12, Math.min(1.25, filmPitch * (1 - blend) + 1.02 * blend + (targetPitch - 0.43))),
      7,
      dt
    )
    radius = damp(
      radius,
      (targetRadius / 12) *
        (filmRadius * (1 - blend) + reading.distance * (1 + 0.36 * foldFrame) * blend),
      4,
      dt
    )
    centerY = damp(centerY, filmCenter * (1 - blend) + (-0.27 + 0.65 * foldFrame) * blend, 6, dt)
    centerX = damp(centerX, reading.centerX * blend, 6, dt)
    centerZ = damp(centerZ, -1.8 * (1 - blend), 6, dt)
    const fw = camFocusId && 1 - blend > 0.5 ? worldNodes.get(camFocusId) : undefined
    camOff.x = damp(camOff.x, fw ? fw.x - centerX : 0, 3.2, dt)
    camOff.y = damp(camOff.y, fw ? fw.y - centerY : 0, 3.2, dt)
    camOff.z = damp(camOff.z, fw ? fw.z - centerZ : 0, 3.2, dt)
    camZoom = damp(camZoom, fw ? camZoomTarget : 1, 2.8, dt)
    const vx = centerX + camOff.x,
      vy = centerY + camOff.y,
      vz = centerZ + camOff.z
    const pos = orbitPosition(radius * camZoom, yaw, pitch, { x: vx, y: vy, z: vz })
    camera.position.set(pos.x, pos.y, pos.z)
    camera.lookAt(vx, vy, vz)
    const bookScale = 1.2 + 0.4 * blend
    book.scale.set(bookScale * PAGE_WIDTH_SCALE, bookScale, bookScale)
    const landing = state.phase === 'settling' ? state.linear * state.linear : state.land
    book.position.y = damp(
      book.position.y,
      -0.48 * landing +
        (Math.sin(elapsed * 0.9) * 0.095 + Math.sin(elapsed * 1.7) * 0.025) * (1 - landing),
      8,
      dt
    )
    book.position.x = damp(book.position.x, -0.78 * book.scale.y * state.lay, 8, dt)
    const breathing = Math.sin(elapsed * 1.25) * 0.055 * (state.phase === 'idle' ? 1 : 0)
    currentPageAngle = reduced.matches
      ? state.angle
      : damp(currentPageAngle, state.angle + breathing, 10, dt)
    halves.forEach((half, i) =>
      setMathematicalRotation(half, { x: 0, y: 0, z: (i === 0 ? -1 : 1) * currentPageAngle })
    )
    const bookRoll = ['opening', 'reading', 'turn-framing', 'turning', 'exit-closing'].includes(
      state.phase
    )
      ? 0.1 - currentPageAngle
      : -(1.54 - 0.1) * state.lay
    setMathematicalRotation(book, {
      x: Math.sin(elapsed * 0.6) * 0.018 * (1 - landing),
      y: Math.sin(elapsed * 0.28) * 0.075 * (1 - landing),
      z: bookRoll + Math.sin(elapsed * 0.7) * 0.025 * (1 - landing),
    })
    const wantLayout = galaxyOn ? 1 : 0
    layoutBlend += (wantLayout - layoutBlend) * (1 - Math.exp(-dt * 2.2))
    if (Math.abs(wantLayout - layoutBlend) < 0.002) layoutBlend = wantLayout
    if (layoutBlend > 0 || layoutApplied) {
      const le = smooth(layoutBlend)
      for (const [id, node] of mapNodes) {
        const h = homePos.get(id)!,
          g = galaxyTarget.get(id)
        if (g && le > 0) node.position.lerpVectors(h, g, le)
        else node.position.copy(h)
      }
      layoutApplied = layoutBlend > 0
    }
    if (galaxyOn && anchorId) {
      const r = homePos.get(anchorId)
      if (r) queryNode.position.set(r.x, r.y + 0.9, r.z)
    }
    const cloudAngle = Math.sin(elapsed * 0.18) * 0.12 + elapsed * 0.018,
      cloudScale = compact ? 0.7 : 1
    map.rotation.y = cloudAngle
    map.scale.setScalar(cloudScale)
    map.position.set(
      4.2 * cloudScale * Math.sin(cloudAngle),
      Math.sin(elapsed * 0.55) * 0.12,
      -4.2 * cloudScale + 4.2 * cloudScale * Math.cos(cloudAngle)
    )
    const anchorNode = anchorId ? mapNodes.get(anchorId) : undefined
    anchorBlend += ((anchorNode ? 1 : 0) - anchorBlend) * (1 - Math.exp(-dt * 2.8))
    if (anchorNode && anchorBlend > 0.002) {
      const sn = Math.sin(cloudAngle),
        cs = Math.cos(cloudAngle),
        lx = anchorNode.position.x * cloudScale,
        ly = anchorNode.position.y * cloudScale,
        lz = anchorNode.position.z * cloudScale
      anchorTarget.set(
        ANCHOR.x * cloudScale - (lx * cs + lz * sn),
        ANCHOR.y * cloudScale - ly + Math.sin(elapsed * 0.55) * 0.1,
        ANCHOR.z * cloudScale - (-lx * sn + lz * cs)
      )
      map.position.lerp(anchorTarget, Math.min(1, anchorBlend))
    }
    worldNodes.clear()
    for (const [id, node] of mapNodes) {
      const point = node.getWorldPosition(new THREE.Vector3())
      worldNodes.set(id, { x: point.x, y: point.y, z: point.z })
    }
    portal.group.position.set(0, book.position.y + 0.85, 0)
    portal.update(state.portal, elapsed, state.phase === 'sealing' ? state.p : 0)
    leaf.visible = leafBack.visible = state.phase === 'turning'
    if (leaf.visible) {
      const forward = pendingSpread > spread,
        attr = leafGeometry.getAttribute('position')
      for (let i = 0; i < attr.count; i++) {
        const x = (leafBase[i * 3] ?? 0) + 0.78,
          z = leafBase[i * 3 + 1] ?? 0,
          angle = 0.1 + (forward ? state.flip : 1 - state.flip) * (Math.PI - 0.2)
        const bend = Math.sin(((x - 0.05) / 1.46) * Math.PI) * Math.sin(state.flip * Math.PI) * 0.18
        const p = new Complex(x, bend).rotate(angle)
        attr.setXYZ(i, p.re, 0.15 + p.im, -z)
      }
      attr.needsUpdate = true
      leafGeometry.computeVertexNormals()
    }
    let arrived = 0,
      inTransit = 0,
      neutralGlyphs = 0,
      coloredGlyphs = 0
    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i]!,
        orbit = new Complex(g.radius, 0).rotate(g.angle + elapsed * g.speed),
        ambient = {
          x: orbit.re,
          y: g.height + Math.sin(elapsed * 0.8 + g.phase) * 0.18,
          z: orbit.im,
        },
        node = worldNodes.get(g.paperId),
        material = g.sprite.material as THREE.SpriteMaterial
      let position = ambient,
        visible =
          state.phase === 'idle' || state.phase === 'waiting' || state.phase === 'exit-opening',
        opacity = 0.55 + 0.18 * Math.sin(elapsed + g.phase),
        colorMix = 0
      if (state.phase === 'vortex') {
        visible = true
        if (g.rank >= 0 && node) {
          const t = flightProgress(ritual.age, g.rank, activeLetterCount)
          position = arcPoint(g.origin, node, t, 1)
          visible = t < 0.995
          opacity = 0.95
          if (t >= 0.995) arrived++
          else if (ritual.age >= launchDelay(g.rank, activeLetterCount)) {
            inTransit++
            colorMix = 1
          }
        } else opacity = 0.15
      }
      if (state.phase === 'charging') {
        visible = g.rank < 0
        opacity = 0.12
        arrived = activeLetterCount
      }
      if (state.phase === 'channeling' && g.rank >= 0 && node) {
        const delay = (g.rank / Math.max(1, activeLetterCount)) * 1.0,
          local = (ritual.age - delay) % 1.6,
          t = local / 1.3
        visible = ritual.age >= delay && t >= 0 && t <= 1
        if (visible) {
          const p = arcPoint(node, portal.group.position, smooth(t), 0.8),
            swirl = new Complex(0.35 * Math.sin(t * Math.PI) * (1 - t), 0).rotate(
              t * Math.PI * 6 + g.phase
            )
          position = { x: p.x + swirl.re, y: p.y, z: p.z + swirl.im }
          opacity = 0.98
          colorMix = 1
          inTransit++
        }
      }
      if (
        state.phase === 'exit-release' &&
        currentPageAngle < 0.82 &&
        node &&
        mapNodes.get(g.paperId)?.visible
      ) {
        const delay = launchDelay(i, glyphs.length) * 0.3,
          t = smooth((ritual.age - delay) / 1.4)
        position =
          t < 0.55
            ? arcPoint({ x: book.position.x, y: book.position.y + 0.5, z: 0 }, node, t / 0.55, 0.9)
            : arcPoint(node, ambient, (t - 0.55) / 0.45, 0.5)
        visible = ritual.age >= delay
        opacity = 0.95
        colorMix = 1 - smooth((t - 0.55) / 0.45)
        if (visible) inTransit++
      }
      g.sprite.position.set(position.x, position.y, position.z)
      g.sprite.visible = visible
      material.opacity = opacity
      material.color.copy(neutralInk)
      const ink = baseColors.get(g.paperId)
      if (ink && colorMix > 0) material.color.lerp(ink, colorMix)
      material.rotation = Math.sin(elapsed * 0.4 + g.phase) * 0.1
      if (visible) {
        if (colorMix > 0) coloredGlyphs++
        else neutralGlyphs++
      }
    }
    tickSpread()
    const focusedId = selected?.id ?? focusId
    let haloIndex = 0
    for (const [id, halo] of halos) {
      const node = mapNodes.get(id)!,
        active = activeTargets.includes(id),
        pulse = active ? state.charge : 0,
        base = scoreValues.has(id)
          ? similarityTone(scoreValues.get(id)!).color
          : GROUPS[mapPaper.get(id)!.group].color,
        emphasis =
          focusId && !selected
            ? focusSet.has(id)
              ? 1
              : 0.2
            : scoreValues.size === 0
              ? 0.95
              : active
                ? 1
                : 0.5,
        ap = appearOf(id),
        isRoot = id === anchorId && scoreValues.size > 0,
        apc = Math.min(1, ap),
        strength = scoreValues.has(id) ? similarityStrength(scoreValues.get(id)!) : 0.6
      halo.visible = node.visible && HALO_STRENGTH > 0
      halo.position.copy(node.position)
      halo.scale.setScalar(
        (id === focusedId ? 0.7 : isRoot ? 0.62 : 0.43) *
          (1 + 0.06 * Math.sin(elapsed * 0.9 + haloIndex++) + pulse * 0.65) *
          (0.55 + 0.45 * ap) *
          (0.8 + 0.45 * strength)
      )
      halo.material.opacity =
        ((active ? 0.4 : 0.24) * (0.45 + 0.9 * strength) + pulse * 0.4) *
        (0.12 + 0.88 * apc) *
        (isRoot ? 1.5 : 1) *
        HALO_STRENGTH
      node.scale.setScalar(
        (id === focusedId ? 1.5 : isRoot ? 1.55 : 1) *
          (1 + pulse * 0.12) *
          (0.5 + 0.5 * ap) *
          (0.85 + 0.3 * strength)
      )
      const material = node.material as THREE.MeshBasicMaterial
      material.color.copy(tint(base)).multiplyScalar(1 + pulse * 0.2 + (isRoot ? 0.25 : 0))
      material.opacity = emphasis * (0.14 + 0.86 * apc)
      node.rotation.y = elapsed * 0.12
    }
    networkMaterial.opacity = blend > 0.9 ? 0.14 : focusId ? 0.18 : 0.42
    const lightPositions = linkLights.geometry.getAttribute('position')
    if (lightPositions) {
      links.forEach((link, i) => {
        const a = mapNodes.get(link.a)!.position,
          b = mapNodes.get(link.b)!.position,
          t = linkDone(link) ? (elapsed * 0.23 + i * 0.381) % 1 : 0
        linkCtrl(a, b, _c)
        bez(a, _c, b, t, _p)
        lightPositions.setXYZ(i, _p.x, _p.y, _p.z)
      })
      lightPositions.needsUpdate = true
    }
    ;(linkLights.material as THREE.PointsMaterial).opacity = blend > 0.9 ? 0.3 : 0.95
    edges.visible =
      (selected !== null || hoverId !== '') &&
      !['reading', 'turn-framing', 'turning', 'opening', 'zooming', 'settling', 'closing'].includes(
        state.phase
      )
    beams.visible = state.phase === 'channeling' && state.portal > 0.1
    const beamPositions = beams.geometry.getAttribute('position')
    if (beams.visible && beamPositions) {
      activeTargets.forEach((id, i) => {
        const point = worldNodes.get(id)!
        beamPositions.setXYZ(i * 2, point.x, point.y, point.z)
        beamPositions.setXYZ(
          i * 2 + 1,
          portal.group.position.x,
          portal.group.position.y,
          portal.group.position.z
        )
      })
      beamPositions.needsUpdate = true
      beamMaterial.opacity = 0.15 + 0.15 * Math.sin(elapsed * 5) ** 2
    }
    glow.intensity = 8 + state.portal * 9 + state.charge * 5
    atmosphere.update(elapsed, state.charge)
    canvas.dataset.state =
      state.phase === 'reading' || state.phase === 'turning'
        ? 'open'
        : state.phase === 'idle'
          ? 'idle'
          : 'opening'
    canvas.dataset.phase = state.phase
    canvas.dataset.phaseAge = ritual.age.toFixed(2)
    canvas.dataset.portal = state.portal.toFixed(3)
    canvas.dataset.charge = state.charge.toFixed(3)
    canvas.dataset.landed = state.land.toFixed(3)
    canvas.dataset.lettersArrived = String(arrived)
    canvas.dataset.lettersInTransit = String(inTransit)
    canvas.dataset.yaw = yaw.toFixed(3)
    canvas.dataset.radius = radius.toFixed(3)
    canvas.dataset.paused = String(paused)
    canvas.dataset.mode = 'unified'
    canvas.dataset.nodes = String([...mapNodes.values()].filter((n) => n.visible).length)
    canvas.dataset.projection = 'pca'
    canvas.dataset.pageAngle = currentPageAngle.toFixed(4)
    canvas.dataset.pageFocus = reading.single ? (reading.centerX > 0 ? 'right' : 'left') : 'both'
    canvas.dataset.bookScale = book.scale.y.toFixed(2)
    canvas.dataset.pageWidthScale = String(PAGE_WIDTH_SCALE)
    canvas.dataset.neutralGlyphs = String(neutralGlyphs)
    canvas.dataset.coloredGlyphs = String(coloredGlyphs)
    canvas.dataset.printedPages = JSON.stringify(
      pageMaterials.map((material) => material.userData.pageIndex ?? null)
    )
    if (now - lastProjection > 200) {
      lastProjection = now
      scene.updateMatrixWorld()
      camera.updateMatrixWorld()
      canvas.dataset.nodeScreens = JSON.stringify(
        [...mapNodes]
          .filter(([, node]) => node.visible)
          .map(([id, node]) => {
            const p = node.getWorldPosition(new THREE.Vector3()).project(camera)
            return { id, x: p.x, y: p.y, z: p.z }
          })
      )
    }
    renderer.render(scene, camera)
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)
  onStatus('ready')
  return {
    startSearch() {
      holdSpread()
      focusId = ''
      focusSet = new Set<string>()
      clearLeaf()
      selected = null
      pendingScores = null
      ritual.start()
      updateEdges(null)
      resetCamera()
      canvas.dataset.paper = ''
      hoverId = ''
      onHover(null)
      publish()
    },
    empty() {
      if (!selected) ritual.close()
      if (revealMode === 'hold') endSpread()
    },
    showResults() {
      if (!selected && ritual.phase === 'waiting') ritual.close()
      if (plan.length < 1) {
        galaxyOn = false
        anchorId = null
        camFocusId = null
        if (revealMode === 'hold') endSpread()
        return
      }
      if (plan.length > 1) {
        galaxyOn = true
        computeGalaxy()
      }
      camFocusId = plan[0]!.id
      camZoomTarget = AUTO_ZOOM
      startSpread()
    },
    export2D() {
      const w = canvas.clientWidth || 1,
        h = canvas.clientHeight || 1,
        v = new THREE.Vector3()
      return {
        width: w,
        height: h,
        anchorId,
        focusIds: [...focusSet],
        nodes: [...mapNodes].map(([id, node]) => {
          const wp = worldNodes.get(id),
            home = homePos.get(id)!
          let screen: { x: number; y: number } | null = null
          if (wp) {
            v.set(wp.x, wp.y, wp.z).project(camera)
            if (v.z > -1 && v.z < 1) screen = { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }
          }
          return {
            id,
            visible: node.visible,
            home: { x: home.x, y: home.y, z: home.z },
            score: scoreValues.get(id) ?? null,
            screen,
          }
        }),
        plan: plan.map((step) => ({ ...step })),
        links: links.map((link) => ({ ...link })),
      }
    },
    inspect(paper) {
      focusId = paper?.id ?? ''
      focusSet = paper
        ? new Set([paper.id, ...semanticIndex.neighbors(paper, 5).map((n) => n.paper.id)])
        : new Set<string>()
      updateEdges(paper)
      if (paper) {
        camFocusId = paper.id
        camZoomTarget = NODE_ZOOM
      } else {
        camFocusId = revealMode !== 'hold' && galaxyOn && anchorId ? anchorId : null
        camZoomTarget = AUTO_ZOOM
      }
      writeNetwork(spreadClock())
      canvas.dataset.focus = focusId
    },
    select(paper) {
      if (!paper) {
        if (selected) {
          selected = null
          ritual.close()
          updateEdges(null)
        }
        return
      }
      if (selected?.id === paper.id) return
      if (selected || ritual.phase === 'idle' || ritual.phase.startsWith('exit-')) {
        ritual.start()
        pendingScores = null
      }
      selected = paper
      pages = readingPages(paper)
      spread = 0
      pendingSpread = 0
      paintPages()
      updateEdges(paper)
      ritual.resolve()
      resetCamera()
      hoverId = ''
      onHover(null)
      canvas.dataset.paper = paper.id
      publish()
    },
    turn(direction) {
      const next = Math.max(0, Math.min(pages.length / 2 - 1, spread + Math.sign(direction)))
      if (next !== spread && ritual.turn()) {
        pendingSpread = next
        clearLeaf()
        const forward = next > spread,
          frontIndex = forward ? spread * 2 + 1 : next * 2 + 1,
          backIndex = forward ? next * 2 : spread * 2
        turnFrontTexture = createPageTexture(pages[frontIndex] ?? null, frontIndex)
        turnBackTexture = createPageTexture(pages[backIndex] ?? null, backIndex)
        turnBackTexture.repeat.x = -1
        turnBackTexture.offset.x = 1
        leafMaterial.map = turnFrontTexture
        leafBackMaterial.map = turnBackTexture
        leafMaterial.needsUpdate = leafBackMaterial.needsUpdate = true
        publish()
      }
    },
    setScores: colorScores,
    setPaused(value) {
      paused = value
    },
    zoom(direction) {
      targetRadius = zoomRadius(targetRadius, direction)
    },
    reset: resetCamera,
    focusPage(value) {
      focus = value
    },
    setTheme: applyTheme,
    filter(ids) {
      const visible = new Set(ids)
      for (const [id, node] of mapNodes) node.visible = visible.has(id)
      updateEdges(selected)
      updateNetwork()
      if (!ritual.phase.startsWith('exit-')) planLetters()
    },
    setQuery(point) {
      queryNode.visible = point !== null
      if (point) {
        const p = toLibraryPoint(point)
        queryNode.position.set(p.x, p.y, p.z)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      document.fonts?.removeEventListener?.('loadingdone', repaintOnFonts)
      cancelAnimationFrame(frame)
      resize.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('wheel', wheel)
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>(glyphTextures)
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          geometries.add(object.geometry)
          for (const m of Array.isArray(object.material) ? object.material : [object.material])
            materials.add(m)
        } else if (object instanceof THREE.Sprite) materials.add(object.material)
      })
      for (const m of materials)
        if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map)
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      renderer.dispose()
    },
  }
}
