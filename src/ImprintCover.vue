<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const surface = ref(null)
let observer
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n))

// The same pressure plate is printed twice, slightly out of register. The
// inner striations are part of the plate; the paper tooth belongs to the page.
const plateA = { x: 1302, y: 398, rx: 550, ry: 312, angle: -0.6 }
const plateB = { x: 1444, y: 613, rx: 547, ry: 314, angle: -0.62 }
const plate = ({ x, y, rx, ry, angle }) => ({
  x,
  y,
  xx: Math.cos(angle) / rx,
  xy: Math.sin(angle) / rx,
  yx: -Math.sin(angle) / ry,
  yy: Math.cos(angle) / ry,
})
const impressions = [plate(plateA), plate(plateB)]
const noise = new Float32Array(128 * 128)
let seed = 13091
for (let i = 0; i < noise.length; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  noise[i] = seed / 0xffffffff
}
function paperNoise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y)
  let fx = x - ix,
    fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = noise[(iy & 127) * 128 + (ix & 127)]
  const b = noise[(iy & 127) * 128 + ((ix + 1) & 127)]
  const c = noise[((iy + 1) & 127) * 128 + (ix & 127)]
  const d = noise[((iy + 1) & 127) * 128 + ((ix + 1) & 127)]
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
}

function inkAt(sheet, x, y, tooth, fiber) {
  const dx = x - sheet.x,
    dy = y - sheet.y
  const u = dx * sheet.xx + dy * sheet.xy,
    v = dx * sheet.yx + dy * sheet.yy
  if (Math.abs(u) > 1.13 || Math.abs(v) > 1.16) return 0

  // The curled pressure plate has one flatter shoulder and a tapered tip.
  const bent = v + 0.135 * (u * u - 0.38) + 0.033 * Math.sin(3.7 * u)
  const radial = Math.sqrt(u * u + bent * bent * (1 + 0.3 * u))
  const edge = 1 - radial + 0.008 * (fiber - 0.5) + 0.004 * (tooth - 0.5)
  if (edge < -0.003) return 0
  const coverage = clamp(edge * 235 + 0.5)

  // Each engraved line follows the paper's curve toward an off-centre core.
  const warp = Math.sin(3 * u + 1.3 * v) * 0.12
  const ring = Math.hypot(u + 0.43 + warp, (bent + 0.16) * 0.87)
  const phase = (ring * 51.5 + 0.74 * Math.sin(7 * ring - 1.8 * u)) * 2 * Math.PI
  const groove = Math.pow(0.5 + 0.5 * Math.cos(phase), 3.1)
  const depth = clamp(0.6 + 0.23 * u - 0.19 * v + 0.32 * (fiber - 0.5))
  const pressure = 0.65 + 0.26 * depth
  const channels =
    0.11 + 0.45 * clamp(0.55 + 0.32 * v - 0.55 * u + 0.26 * Math.sin(3 * u + 2.6 * v))
  const broken = clamp((fiber - 0.13) * 2.4)
  const edgeInk = 0.11 * Math.exp(-Math.max(0, edge) * 57)
  return coverage * clamp(pressure - channels * groove * broken + edgeInk + 0.13 * (tooth - 0.5))
}

function draw() {
  const canvas = surface.value
  if (!canvas) return
  const width = canvas.clientWidth,
    height = canvas.clientHeight
  if (!width || !height) return
  const density = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / Math.max(width, height))
  const w = Math.round(width * density),
    h = Math.round(height * density)
  if (canvas.width === w && canvas.height === h && canvas.dataset.printed) return
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  const img = ctx.createImageData(w, h),
    data = img.data
  const portrait = w <= h
  const scale = portrait ? Math.min(w / 939, h / 1160) : 0.955 * Math.min(w / 1920, h / 1080)
  const xOffset = portrait ? w * 0.54 - 1355 * scale : w * 0.68 - 1330 * scale
  const yOffset = portrait ? h * 0.442 - 510 * scale : h * 0.482 - 505 * scale
  const xCoords = Float32Array.from({ length: w }, (_, x) => (x - xOffset) / scale)
  for (let row = 0; row < h; row++) {
    const y = (row - yOffset) / scale
    for (let col = 0; col < w; col++) {
      const index = row * w + col,
        x = xCoords[col]
      const tooth = (Math.imul(index ^ (index >>> 8), 0x27d4eb2d) >>> 24) / 255
      const fiber = paperNoise(x * 0.017, y * 0.022)
      const a = inkAt(impressions[0], x, y, tooth, fiber)
      const b = inkAt(impressions[1], x, y, tooth, fiber)
      const grain = (tooth - 0.5) * 5 + (fiber - 0.5) * 3
      const i = index * 4
      data[i] = (240 + grain) * (1 - 0.955 * a) * (1 - 0.95 * b)
      data[i + 1] = (245 + grain) * (1 - 0.5 * a) * (1 - 0.79 * b)
      data[i + 2] = (245 + grain) * (1 - 0.14 * a) * (1 - 0.37 * b)
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  canvas.dataset.printed = 'true'
}

onMounted(() => {
  draw()
  observer = new ResizeObserver(draw)
  observer.observe(surface.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="imprint-study">
    <canvas ref="surface" aria-hidden="true"></canvas>
    <h1 id="cover-title" class="imprint-title">
      <span>채용연계형</span> <span>직무교육과정</span>
    </h1>
  </div>
</template>

<style scoped>
.imprint-study,
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.imprint-study {
  overflow: hidden;
  background: #f0f5f5;
  color: #09244c;
  isolation: isolate;
}
canvas {
  display: block;
  pointer-events: none;
}
.imprint-title {
  position: absolute;
  inset: 0;
  margin: 0;
  font-family: 'Noto Sans KR Cover', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  font-weight: 595;
  font-size: min(6.7cqw, 13cqh);
  line-height: 1.05;
  letter-spacing: -0.073em;
}
.imprint-title span {
  position: absolute;
  left: 6.1%;
  bottom: 24%;
  white-space: nowrap;
}
.imprint-title span + span {
  bottom: 8.9%;
  font-weight: 725;
  font-size: 1.16em;
}
@media (max-aspect-ratio: 1/1) {
  .imprint-title {
    font-size: min(11.5cqw, 10.7cqh);
  }
  .imprint-title span {
    bottom: max(16.5%, calc(8.5% + 1.22em));
  }
  .imprint-title span + span {
    bottom: 8.5%;
    font-size: 1.07em;
  }
}
</style>
