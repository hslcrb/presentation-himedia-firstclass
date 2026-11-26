// Two 3-D edges of the formed sheet, followed by the camber of its cross
// section. The large rolled return lifts one face over the opposite face.
const stations = [
  [1900, -790, 130, 2680, -360, 20, 95],
  [1325, -120, 150, 2260, 42, 70, 130],
  [1030, 115, 95, 1960, 224, 40, 205],
  [928, 231, 15, 1795, 297, -65, 218],
  [974, 338, -62, 1735, 313, -180, 135],
  [1118, 432, -90, 1692, 305, -225, 52],
  [1405, 481, -78, 1705, 320, -220, -95],
  [1703, 520, 45, 1760, 360, -155, -155],
  [1950, 563, 78, 1805, 429, -102, -120],
  [2070, 664, 112, 1725, 503, -155, -124],
  [1950, 793, 45, 1480, 563, -180, -160],
  [1695, 939, 10, 1202, 646, -85, -195],
  [1520, 1055, -45, 1040, 782, -35, -125],
  [1485, 1200, -10, 1040, 925, 65, -45],
  [1680, 1510, 120, 1280, 1230, 96, 115],
]

const front = [
  'ff9906',
  'ff8117',
  'ff4015',
  'ea1847',
  'b21d9e',
  '392ba0',
  '2935ba',
  '6251d1',
  'a873cb',
  'e46295',
]
const reverse = [
  'ffac30',
  'ff6016',
  'f9283d',
  'c72174',
  '762a90',
  '352591',
  '383fbd',
  '6556ce',
  '8e65c4',
  'e7628c',
]
const toRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const frontColors = front.map(toRgb)
const reverseColors = reverse.map(toRgb)
const clamp = (n) => Math.max(0, Math.min(1, n))
const mix = (a, b, t) => a + (b - a) * t
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (a) => {
  const l = Math.hypot(...a) || 1
  return a.map((n) => n / l)
}
const bell = (v, w) => Math.exp(-(v * v) / (w * w))

function interpolate(t) {
  const end = stations.length - 1
  const n = clamp(t) * end
  const i = Math.min(Math.floor(n), end - 1),
    f = n - i
  const a = stations[Math.max(0, i - 1)],
    b = stations[i]
  const c = stations[i + 1],
    d = stations[Math.min(end, i + 2)]
  return b.map(
    (v, k) =>
      v +
      0.5 *
        f *
        (c[k] -
          a[k] +
          f * (2 * a[k] - 5 * v + 4 * c[k] - d[k] + f * (3 * v - 3 * c[k] + d[k] - a[k]))),
  )
}

function profile(t) {
  const c = interpolate(t)
  return (u) => {
    const v = (u + 1) / 2,
      curve = 1 - u * u
    return [
      mix(c[0], c[3], v) + c[6] * curve * 0.17,
      mix(c[1], c[4], v) - c[6] * curve * 0.32,
      mix(c[2], c[5], v) + c[6] * curve * (1 + 0.65 * u),
    ]
  }
}

function palette(stops, t) {
  const n = clamp(t) * (stops.length - 1),
    i = Math.min(Math.floor(n), stops.length - 2)
  const f = n - i
  return stops[i].map((v, k) => mix(v, stops[i + 1][k], f * f * (3 - 2 * f)))
}

function pigment(t, u, normal) {
  const flipped = normal[2] < 0
  const n = flipped ? normal.map((v) => -v) : normal
  const r = [2 * n[0] * n[2], 2 * n[1] * n[2], 2 * n[2] * n[2] - 1]
  const base = palette(
    flipped ? reverseColors : frontColors,
    t + 0.14 * u + 0.02 * Math.sin(t * 13),
  )
  const lighting = 0.6 + 0.37 * n[2] - 0.06 * n[0] - 0.07 * n[1]
  const studio = bell(r[0] + 0.48 * r[1] - 0.6, 0.22) * (0.28 + 0.72 * clamp((r[2] + 1) * 0.77))
  const broad = bell(r[1] - 0.4 * r[0] + 0.84, 0.4)
  const sheen =
    bell(u - 0.64 + 0.18 * Math.sin(t * 19), 0.22) * (0.43 + 0.57 * bell(t - 0.77, 0.15))
  const pearl = Math.min(
    0.88,
    0.45 * studio + 0.18 * broad + 0.37 * sheen + 0.06 * Math.pow(1 - n[2], 2),
  )
  const light = t < 0.44 ? [1, 0.91, 0.7] : [0.84, 1, 0.966]
  // The upper flap shields the tucked-in reverse face from the softbox.
  const tucked = flipped ? bell(t - 0.615, 0.07) * clamp((u + 0.05) * 1.5) : 0
  return base.map((v, k) =>
    clamp(mix(v * lighting * (1 - 0.17 * tucked), light[k], pearl * (1 - 0.9 * tucked))),
  )
}

// The poster is static. Gouraud shading a modest mesh into a depth buffer
// keeps the folds identical on integrated GPUs and software-only browsers.
const rows = 245,
  columns = 72
let sculpture
function buildSculpture() {
  if (sculpture) return sculpture
  const positions = [],
    colors = []
  for (let j = 0; j <= rows; j++) {
    const section = profile(j / rows)
    for (let i = 0; i <= columns; i++) positions.push(section((i / columns) * 2 - 1))
  }
  const stride = columns + 1
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const a = positions[j * stride + Math.max(i - 1, 0)]
      const b = positions[j * stride + Math.min(i + 1, columns)]
      const c = positions[Math.max(j - 1, 0) * stride + i]
      const d = positions[Math.min(j + 1, rows) * stride + i]
      const across = b.map((v, k) => v - a[k]),
        along = d.map((v, k) => v - c[k])
      const normal = unit(cross(across, along))
      colors.push(pigment(j / rows, (i / columns) * 2 - 1, normal))
    }
  }
  sculpture = { positions, colors }
  return sculpture
}

function rasterizeTriangle(a, b, c, colorA, colorB, colorC, width, height, pixels, depth) {
  if (a[1] > b[1]) {
    ;[a, b] = [b, a]
    ;[colorA, colorB] = [colorB, colorA]
  }
  if (a[1] > c[1]) {
    ;[a, c] = [c, a]
    ;[colorA, colorC] = [colorC, colorA]
  }
  if (b[1] > c[1]) {
    ;[b, c] = [c, b]
    ;[colorB, colorC] = [colorC, colorB]
  }
  const doubleArea = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
  if (Math.abs(doubleArea) < 0.00001 || a[1] >= height || c[1] <= 0) return
  // Barycentric derivatives are constant over a triangle. Step them across
  // each scanline to interpolate depth, colour, and the direction of the ribs.
  const dWeightBdx = (c[1] - a[1]) / doubleArea,
    dWeightCdx = (a[1] - b[1]) / doubleArea
  const dWeightBdy = (a[0] - c[0]) / doubleArea,
    dWeightCdy = (b[0] - a[0]) / doubleArea
  const phaseAB = b[3] - a[3],
    phaseAC = c[3] - a[3],
    phaseStep = dWeightBdx * phaseAB + dWeightCdx * phaseAC
  // Fade out the striations as soon as their period becomes subpixel.
  const ridge =
    Math.max(0, 1 - 0.32 * Math.hypot(phaseStep, dWeightBdy * phaseAB + dWeightCdy * phaseAC)) * 1.9
  const zB = b[2] - a[2],
    zC = c[2] - a[2],
    depthStep = dWeightBdx * zB + dWeightCdx * zC
  const rB = colorB[0] - colorA[0],
    rC = colorC[0] - colorA[0],
    redStep = dWeightBdx * rB + dWeightCdx * rC
  const gB = colorB[1] - colorA[1],
    gC = colorC[1] - colorA[1],
    greenStep = dWeightBdx * gB + dWeightCdx * gC
  const bB = colorB[2] - colorA[2],
    bC = colorC[2] - colorA[2],
    blueStep = dWeightBdx * bB + dWeightCdx * bC
  for (
    let y = Math.max(0, Math.ceil(a[1] - 0.5));
    y < Math.min(height, Math.ceil(c[1] - 0.5));
    y++
  ) {
    const sampleY = y + 0.5
    const start = sampleY < b[1] ? a : b,
      end = sampleY < b[1] ? b : c
    const shortX = start[0] + ((sampleY - start[1]) * (end[0] - start[0])) / (end[1] - start[1])
    const longX = a[0] + ((sampleY - a[1]) * (c[0] - a[0])) / (c[1] - a[1])
    const left = Math.max(0, Math.ceil(Math.min(shortX, longX) - 0.5))
    const right = Math.min(width, Math.ceil(Math.max(shortX, longX) - 0.5))
    const weightB = (left + 0.5 - a[0]) * dWeightBdx + (sampleY - a[1]) * dWeightBdy
    const weightC = (left + 0.5 - a[0]) * dWeightCdx + (sampleY - a[1]) * dWeightCdy
    let z = a[2] + weightB * zB + weightC * zC
    let phase = a[3] + weightB * phaseAB + weightC * phaseAC
    let r = colorA[0] + weightB * rB + weightC * rC,
      g = colorA[1] + weightB * gB + weightC * gC,
      blue = colorA[2] + weightB * bB + weightC * bC
    for (
      let x = left, pixel = y * width + left;
      x < right;
      x++,
        pixel++,
        z += depthStep,
        phase += phaseStep,
        r += redStep,
        g += greenStep,
        blue += blueStep
    ) {
      if (z < depth[pixel]) continue
      depth[pixel] = z
      const grain =
        ((Math.imul(pixel ^ (pixel >>> 9), 0x27d4eb2d) >>> 24) / 255 - 0.5) * 3.8 +
        ridge * Math.sin(phase)
      pixels[pixel * 4] = r * 255 + grain
      pixels[pixel * 4 + 1] = g * 255 + grain
      pixels[pixel * 4 + 2] = blue * 255 + grain
      pixels[pixel * 4 + 3] = 255
    }
  }
}

export function drawRibbon(canvas, width, height) {
  if (width < 1 || height < 1) return
  const density = Math.min(window.devicePixelRatio || 1, 2, 2400 / Math.max(width, height))
  const w = Math.round(width * density),
    h = Math.round(height * density)
  if (canvas.width === w && canvas.height === h && canvas.dataset.drawn) return
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.createImageData(w, h)
  const depth = new Float32Array(w * h)
  depth.fill(-Infinity)
  const { positions, colors } = buildSculpture()
  const portrait = w <= h
  // Portrait rotates the same sculpture so that it enters below the title.
  const points = positions.map(([x, y, z], i) => {
    const t = Math.floor(i / (columns + 1)) / rows,
      u = (i % (columns + 1)) / columns
    const phase = (u + 0.029 * Math.sin(9 * t) + 0.022 * Math.sin(u * 7 + t * 13)) * 980
    if (portrait) {
      const s = Math.min(w / 920, h / 1140)
      const theta = 0.42,
        ax = x - 986,
        ay = y - 220
      return [
        w * 0.16 + s * (ax * Math.cos(theta) - ay * Math.sin(theta)),
        (0.38 + 0.35 * Math.min(1, w / h)) * h + s * (ax * Math.sin(theta) + ay * Math.cos(theta)),
        z,
        phase,
      ]
    }
    return [(x * w) / 1920, (y * h) / 1080, z, phase]
  })
  function triangle(a, b, c) {
    rasterizeTriangle(
      points[a],
      points[b],
      points[c],
      colors[a],
      colors[b],
      colors[c],
      w,
      h,
      image.data,
      depth,
    )
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i,
        c = a + columns + 1
      triangle(a, a + 1, c)
      triangle(a + 1, c + 1, c)
    }
  }
  context.putImageData(image, 0, 0)
  canvas.dataset.drawn = 'true'
}
