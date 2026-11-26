import symbol from '../세종문화회관심볼.svg?raw'

// The extrusions and the optical apertures share the symbol's 27-unit grid.
// The original SVG supplies the front faces, rendered at display resolution.
const unit = .16
const halfWidth = 13.5 * unit
const frontZ = .10
const lintel = [-halfWidth, halfWidth, 24 * unit, 27 * unit, -.32, frontZ]
const prisms = [lintel, ...[0, 2, 4, 22, 24, 26].map(column => [
  column * unit - halfWidth, (column + 1) * unit - halfWidth, 0, 19 * unit, -.14, frontZ,
])]
const azimuth = .435, elevation = .39
const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth)
const cosE = Math.cos(elevation), sinE = Math.sin(elevation)
const rayX = -sinA / cosA, rayY = sinE / (cosA * cosE)
const clamp = value => Math.min(1, Math.max(0, value))
const scatteringDepths = [.38, 1.32]

const grainTile = new Float32Array(128 * 128)
let grainSeed = 0x1f7c34d3
for (let i = 0; i < grainTile.length; i++) {
  grainSeed = (Math.imul(1664525, grainSeed) + 1013904223) >>> 0
  grainTile[i] = grainSeed / 4294967296 - .5
}

const gaussians = Float32Array.from({ length: 1025 }, (_, i) => Math.exp(-((i / 256) ** 2)))
function g(value) {
  const t = Math.abs(value) * 256
  if (t >= 1024) return 0
  const i = t | 0
  return gaussians[i] + (gaussians[i + 1] - gaussians[i]) * (t - i)
}

function windowAt(delta, width, softness) {
  const t = clamp((width + softness - Math.abs(delta)) / (2 * softness))
  return t * t * (3 - 2 * t)
}

// A wide green source and a smaller, offset gold source sit behind the wall.
// Each footprint is projected back to the same slit that cast it.
function aperture(x, depth, west) {
  if (depth < 0) return 0
  const origin = west ? 1.02 : 1.41
  const spread = 1 + depth / (west ? 1.09 : 1.72)
  const gate = origin + ((west ? -x : x) - origin) / spread
  if (gate < -1.5 || gate > 2.22) return 0
  const penumbra = .018 + (west ? .062 : .125) * (1 - 1 / spread)
  const outerSlit = windowAt(gate - 12 * unit, .074, penumbra)
  const innerSlit = windowAt(gate - 10 * unit, .074, penumbra)
  const innerEdge = clamp(.5 + (8.5 * unit - gate) / (2.4 * penumbra))
  const spill = innerEdge * g((gate - (west ? 1.17 : 1.03)) / (west ? .28 : .58))
  return (outerSlit * (west ? .22 : .55) + innerSlit + spill * .7) / (1 + depth * (.23 + .14 * depth))
}

function material(x, y, z, bounds, face) {
  const [left, right, bottom, top, back, front] = bounds
  const side = Math.min(x - left, right - x)
  const vertical = Math.min(y - bottom, top - y)
  const thickness = Math.min(z - back, front - z)
  const edge = face === 'front' ? Math.min(side, vertical) :
    face === 'top' ? Math.min(side, thickness) : Math.min(thickness, vertical)
  const lip = g(Math.max(edge, 0) / .007)
  const litEnd = g((x + 1.52) / .58)
  const low = g((y - .18) / 1.26)
  if (face === 'top') return .035 + .13 * litEnd + .05 * (x / halfWidth + 1) + .25 * lip
  if (face === 'side') return .048 + .15 * (front - z) / (front - back) + .52 * low * litEnd + .28 * lip
  const skim = bounds === lintel ? (.22 + .94 * g((x - .99) / .8)) * g((y - bottom) / .022) : 0
  return .014 + .045 * low * litEnd + (.08 + .22 * litEnd) * lip + skim
}

const shoulders = Float32Array.from({ length: 2049 }, (_, i) => 1 - Math.exp(-i / 256))
function expose(radiance) {
  const t = Math.min(2047, Math.max(0, radiance * 256))
  const i = t | 0
  return shoulders[i] + (shoulders[i + 1] - shoulders[i]) * (t - i)
}

let frontFace
function finishFaces(ctx, layout) {
  frontFace ??= new Path2D(new DOMParser().parseFromString(symbol, 'image/svg+xml').querySelector('path').getAttribute('d'))
  const { centerX, centerY, scale } = layout
  const svgScale = 2 * halfWidth / 251
  const x = centerX + scale * (-halfWidth * cosA + frontZ * sinA)
  const y = centerY - scale * (-halfWidth * sinE * sinA + (2 * halfWidth - 2.02) * cosE - frontZ * sinE * cosA)
  ctx.save()
  ctx.transform(scale * cosA * svgScale, -scale * sinE * sinA * svgScale, 0, scale * cosE * svgScale, x, y)
  const satin = ctx.createLinearGradient(0, 0, 251, 126)
  satin.addColorStop(0, 'rgba(17, 25, 14, .59)')
  satin.addColorStop(.29, 'rgba(35, 41, 20, .33)')
  satin.addColorStop(.60, 'rgba(5, 17, 12, .50)')
  satin.addColorStop(1, 'rgba(10, 22, 17, .45)')
  ctx.fillStyle = satin
  ctx.fill(frontFace)
  ctx.restore()
}

function frame(w, h) {
  const portrait = w <= h
  const square = clamp((w / h - .55) / .45)
  return {
    portrait,
    scale: portrait ? Math.min(.185 * w, .115 * h) : Math.min(.139 * w, .155 * h),
    centerX: w * (portrait ? .51 + .042 * square : .705),
    centerY: h * (portrait ? .374 - .061 * square : .438),
  }
}

function paintLight(ctx, w, h) {
  const { portrait, scale, centerX, centerY } = frame(w, h)
  const pixels = ctx.createImageData(w, h)
  const data = pixels.data
  for (let col = 0; col < w; col++) {
    const x = (col + .5 - centerX) / (scale * cosA)
    const candidates = []
    for (const bounds of prisms) {
      const far = Math.max(bounds[4], (bounds[1] - x) / rayX)
      const near = Math.min(bounds[5], (bounds[0] - x) / rayX)
      if (far < near) candidates.push({ bounds, far, near })
    }
    for (let row = 0; row < h; row++) {
      const y = 2.02 + ((centerY - row - .5) / scale - sinE * sinA * x) / cosE
      const floor = -y / rayY
      let nearest = floor, metal = 0, hit = false
      for (const { bounds, far, near } of candidates) {
        const upper = (bounds[3] - y) / rayY
        const z = Math.min(near, upper)
        if (z <= nearest || Math.max(far, (bounds[2] - y) / rayY) >= z) continue
        nearest = z
        hit = true
        const face = z === upper ? 'top' : near === bounds[5] ? 'front' : 'side'
        metal = material(x + rayX * z, y + rayY * z, z, bounds, face)
      }

      let gold = 0, green = 0
      if (!hit) {
        // A bowed sheet of haze catches grazing light. Its lit edge, soft
        // shoulder and varying colour are all functions of the same fold.
        const t = clamp((y + .10) / 4.02)
        const axis = -1.56 + t * (3.84 - 1.07 * t) + .38 * Math.sin(t * 7.4 - .37)
        const waist = .32 + .62 * t + .23 * Math.sin(t * 4.9 - .25)
        const across = (x - axis) / waist
        const height = g((y - 1.50) / 2.62) * clamp((4.09 - y) / .31) * clamp((y + .31) / .50)
        const fold = g((across + .36 - .74 * t) / (.29 + .43 * t))
        const soft = g((across - .40) / 1.67)
        const edge = g((across + .73 - .42 * Math.sin(5.7 * t)) / (.17 + .23 * t))
        const turning = g((t - .45) / .22)
        green += height * (.42 * soft + .69 * fold + .14 * edge) * (.51 + .60 * t)
        gold += height * ((.31 * soft + .78 * fold) * g((t - .24) / .35) + .37 * edge * turning)

        // Negative space remains inside the arch. A soft jade bounce at its
        // far edge and a much tighter warm jamb establish the direction.
        green += .75 * g((x - 1.74 + .16 * y) / .86) * g((y - .66) / 1.71)
        gold += 2.74 * g((x + 1.52) / .39) * g((y - .13) / .57)
        const drop = 24 * unit - y
        if (drop > -.12) {
          const fall = Math.max(0, drop)
          const slit = x - .91 + .41 * fall
          const source = g(slit / (.62 + .22 * fall))
          const focus = .54 - .63 * fall + .14 * fall * fall
          const penumbra = .105 + .21 * Math.abs(fall - .70)
          const convergence = g((slit - focus) / penumbra)
          const diffuse = g(fall / 1.43) * g(Math.min(0, drop) / .062)
          green += (.74 * source + .28 * convergence) * diffuse
          gold += .49 * convergence * diffuse * g((fall - .64) / .75)
        }
        if (floor > 0) {
          const fx = x + rayX * floor
          const contact = clamp(floor / .28)
          const west = aperture(fx, floor, true), east = aperture(fx, floor, false)
          // The refracted caustic widens across the apron as the gold beam
          // crosses the green one. It fades before the portrait title.
          const curl = -1.45 + .38 * floor - .55 * Math.sin(.92 * floor + .31)
          const crossSection = (fx - curl) / (.29 + .10 * floor)
          const caustic = g(crossSection)
          const outerFold = g((crossSection + .88 - .26 * Math.sin(floor)) / (.23 + .04 * floor))
          const pool = g((fx - curl - .48) / (.94 + .27 * floor))
          const fade = 1 / (1 + .18 * floor * floor)
          gold += contact * (2.35 * west + (.61 * caustic + .59 * outerFold + .34 * pool) * fade)
          green += contact * (1.37 * east + (.61 * pool + .28 * caustic) * fade + .15 * west)
        }
      }
      // Two near-field scattering samples soften the apertures without
      // obscuring the face of the metal or duplicating its hard outlines.
      for (const z of scatteringDepths) {
        if (nearest > z) continue
        const sy = y + rayY * z
        if (sy < 0 || sy > 3.16) continue
        const visibility = clamp((z - nearest) / .26) * clamp(sy / .10)
        const weight = .21 * visibility * g((sy - .43) / 1.28) * clamp((3.16 - sy) / .42)
        gold += weight * aperture(x + rayX * z, z, true)
        green += weight * aperture(x + rayX * z, z, false)
      }
      if (portrait && floor > 1.2 && !hit) {
        const shade = 1 / (1 + .64 * (floor - 1.2) ** 2)
        gold *= shade
        green *= shade
      }
      const ambient = hit ? .015 : .28 * g((x - .15) / 3.86) * g((y - 1.08) / 2.76)
      const warmth = .21 + .53 * g((x + 1.4) / .94)
      gold += metal * warmth
      green += metal * (1.07 - warmth)
      const white = Math.max(0, gold - 1.8) ** 2 * .15
      const index = (row * w + col) * 4
      const tooth = grainTile[(row & 127) * 128 + (col & 127)] * (3.2 + 3.5 * clamp(gold + green))
      data[index] = 7 + 13 * ambient + 247 * expose(1.07 * gold + .063 * green + white) + tooth
      data[index + 1] = 13 + 58 * ambient + (241 - 55 * ambient) * expose(.90 * gold + 1.10 * green + white) + tooth
      data[index + 2] = 12 + 42 * ambient + 233 * expose(.075 * gold + .49 * green + white) + tooth * .9
      data[index + 3] = 255
    }
  }
  ctx.putImageData(pixels, 0, 0)
}

export function drawFacade(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight
  if (!width || !height) return
  const density = Math.min(window.devicePixelRatio || 1, 1.75, 2400 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * density)), h = Math.max(1, Math.round(height * density))
  if (canvas.width === w && canvas.height === h && canvas.dataset.ready) return
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  const lightMap = document.createElement('canvas')
  const ratio = Math.min(1, 1440 / Math.max(w, h))
  lightMap.width = Math.max(1, Math.round(w * ratio))
  lightMap.height = Math.max(1, Math.round(h * ratio))
  const lightContext = lightMap.getContext('2d', { alpha: false })
  if (!lightContext) return
  paintLight(lightContext, lightMap.width, lightMap.height)
  canvas.width = w
  canvas.height = h
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(lightMap, 0, 0, w, h)
  finishFaces(ctx, frame(w, h))
  canvas.dataset.ready = 'true'
}
