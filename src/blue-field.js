// Saturated inks seen through the panels, from the left edge to the right.
const inks = [
  [0, 17, 51, 213],
  [.15, 19, 80, 225],
  [.31, 13, 129, 244],
  [.47, 0, 188, 244],
  [.55, 13, 189, 246],
  [.73, 12, 124, 244],
  [1, 35, 66, 224],
]

const grainSize = 256
const grain = new Float32Array(grainSize * grainSize)
let seed = 27
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}
for (let i = 0; i < grain.length; i++) grain[i] = random() + random() - 1

function sampleInk(x) {
  const right = inks.findIndex(stop => stop[0] >= x)
  if (right <= 0) return (right === 0 ? inks[0] : inks.at(-1)).slice(1)
  const a = inks[right - 1]
  const b = inks[right]
  const t = (x - a[0]) / (b[0] - a[0])
  return a.slice(1).map((value, i) => value + (b[i + 1] - value) * t)
}

function softFalloff(distance) {
  const t = Math.min(1, distance)
  return 1 - t * t * (3 - 2 * t)
}

// Heights change at panel seams. The two glass flutes within each panel
// bend the diagonal strip of white light toward their polished edges.
function describeColumn(x, panelCount) {
  const panel = Math.min(panelCount - 1, Math.floor(x * panelCount))
  const middle = (panelCount - 1) / 2
  const step = Math.abs(panel - middle) / middle
  const phase = (x * panelCount * 2) % 1
  const refraction = Math.sin((phase - .44) * Math.PI) * .018
  const glint = Math.exp(-(((phase - .88) / .13) ** 2))
  const shade = (1 - phase) ** 4
  return {
    upper: .076 + step * .438,
    lower: .088 + step * .456,
    sampledX: x + refraction,
    facet: .15 * glint - .12 * shade + .024 * Math.sin(phase * Math.PI),
    ink: sampleInk(x + refraction),
  }
}

export function drawBlueField(canvas) {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  const scale = Math.min(window.devicePixelRatio || 1, 2, 2560 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  if (canvas.width === w && canvas.height === h && canvas.dataset.ready) return

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return
  canvas.width = w
  canvas.height = h
  const pixels = context.createImageData(w, h)
  const portrait = width <= height
  const horizon = portrait ? .368 : .405
  const columns = Array.from({ length: w }, (_, i) => describeColumn((i + .5) / w, portrait ? 11 : 13))

  for (let row = 0; row < h; row++) {
    const y = (row + .5) / h
    const dy = y - horizon
    const lightX = .412 + y * .21
    const axis = Math.exp(-Math.abs(dy) / .018)
    const grainRow = (row % grainSize) * grainSize
    for (let col = 0; col < w; col++) {
      const { upper, lower, sampledX, facet, ink } = columns[col]
      const x = (col + .5) / w
      const edge = (2 * x - 1) ** 2
      const wash = softFalloff(Math.abs(dy) / (dy < 0 ? upper : lower))
      const luminosity = Math.exp(-(((sampledX - lightX) / .048) ** 2))
      const light = Math.max(0, .47 * luminosity + facet)
      const shadow = Math.min(0, facet) * 1.5
      const density = wash * (.87 + .13 * axis)
      const paperR = 235 - 16 * edge - 11 * y
      const paperG = 249 - 11 * edge - 9 * y
      const paperB = 253 - 2 * edge
      const toneR = ink[0] * (1 + shadow) + (210 - ink[0]) * light
      const toneG = ink[1] * (1 + shadow) + (250 - ink[1]) * light
      const toneB = ink[2] * (1 + shadow * .5) + (255 - ink[2]) * light
      const dust = grain[grainRow + col % grainSize] * (7 + 13 * wash)
      const index = (row * w + col) * 4
      pixels.data[index] = paperR + (toneR - paperR) * density + dust
      pixels.data[index + 1] = paperG + (toneG - paperG) * density + dust
      pixels.data[index + 2] = paperB + (toneB - paperB) * density + dust * .85
      pixels.data[index + 3] = 255
    }
  }
  context.putImageData(pixels, 0, 0)
  canvas.dataset.ready = 'true'
}
