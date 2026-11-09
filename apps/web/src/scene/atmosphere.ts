import * as THREE from 'three'
import { Complex } from '@paper-galaxy/core'
/** All coordinates, ribbons, halos and dust are generated with TypeScript math. */
export function createAtmosphere(scene: THREE.Scene) {
  const group = new THREE.Group()
  scene.add(group)
  const ribbons: THREE.Mesh[] = []
  const hazeCanvas = document.createElement('canvas')
  hazeCanvas.width = hazeCanvas.height = 128
  const ctx = hazeCanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas không khả dụng.')
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  const hazeMap = new THREE.CanvasTexture(hazeCanvas)
  const hazes = ['#a63cff', '#15d9ef', '#ff4bba', '#ffaf4b'].map((color, i) => {
    const haze = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: hazeMap,
        color,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      })
    )
    haze.scale.setScalar(18)
    haze.position.set((i - 1.5) * 7, 3, -10)
    group.add(haze)
    return haze
  })
  for (let band = 0; band < 6; band++) {
    const vertices = new Float32Array(181 * 3 * 3),
      colors = new Float32Array(181 * 3 * 3),
      indices: number[] = []
    for (let i = 0; i <= 180; i++)
      for (let row = 0; row < 3; row++)
        for (let axis = 0; axis < 3; axis++) colors[(i * 3 + row) * 3 + axis] = row === 1 ? 1 : 0
    for (let i = 0; i < 180; i++)
      for (let row = 0; row < 2; row++) {
        const a = i * 3 + row
        indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3)
      }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color:
          ['#b444ff', '#ff54c6', '#45dfff', '#ffc57d', '#58ffd5', '#7188ff'][band] ?? '#b444ff',
        vertexColors: true,
        transparent: true,
        opacity: 0.33,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    )
    mesh.frustumCulled = false
    group.add(mesh)
    ribbons.push(mesh)
  }
  const positions = new Float32Array(420 * 3)
  for (let i = 0; i < 420; i++) {
    positions[i * 3] = Math.sin(i * 127.1) * 16
    positions[i * 3 + 1] = Math.sin(i * 311.7) * 10
    positions[i * 3 + 2] = Math.cos(i * 78.2) * 16
  }
  const dustColors = new Float32Array(420 * 3)
  for (let i = 0; i < 420; i++) {
    const c = new THREE.Color(['#f59dff', '#74eaff', '#ffc986'][i % 3]!)
    dustColors[i * 3] = c.r
    dustColors[i * 3 + 1] = c.g
    dustColors[i * 3 + 2] = c.b
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3))
  const dust = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.035,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      toneMapped: false,
    })
  )
  group.add(dust)
  const halos: THREE.LineLoop[] = []
  for (let j = 0; j < 4; j++) {
    const ring = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 241 }, (_, i) => {
        const p = new Complex(3.5 + j * 0.22, 0).rotate((i / 240) * Math.PI * 2)
        return new THREE.Vector3(p.re, -2.1, p.im)
      })
    )
    const halo = new THREE.LineLoop(
      ring,
      new THREE.LineBasicMaterial({
        color: j % 2 ? '#91c8c6' : '#bea6ed',
        transparent: true,
        opacity: 0.12 - j * 0.02,
      })
    )
    group.add(halo)
    halos.push(halo)
  }
  return {
    update(time: number, energy: number) {
      hazes.forEach((haze, i) => {
        haze.position.y = 3 + Math.sin(time * 0.12 + i * 2) * 1.5
        ;(haze.material as THREE.SpriteMaterial).opacity = 0.3 + Math.sin(time * 0.18 + i) * 0.08
      })
      ribbons.forEach((mesh, band) => {
        const position = mesh.geometry.getAttribute('position')
        for (let i = 0; i <= 180; i++)
          for (let edge = 0; edge < 3; edge++) {
            const t = (i / 180) * Math.PI * 2
            const p = new Complex(9 + band * 0.9, 0).rotate(t + time * 0.025 * (band % 2 ? -1 : 1))
            const y =
              1.5 +
              Math.sin(t * 2 + time * 0.2 + band) * 2 +
              Math.sin(t * 5 - time * 0.11) * 0.5 +
              (edge - 1) * (1.0 + Math.sin(t * 3 + band) * 0.65)
            position.setXYZ(i * 3 + edge, p.re, y, p.im)
          }
        position.needsUpdate = true
      })
      dust.rotation.y = time * 0.009
      dust.position.y = Math.sin(time * 0.15) * 0.25
      halos.forEach((halo, i) => {
        halo.rotation.y = time * 0.04 * (i % 2 ? -1 : 1)
        ;(halo.material as THREE.LineBasicMaterial).opacity = (0.1 - i * 0.015) * (1 + energy * 2)
      })
    },
  }
}
