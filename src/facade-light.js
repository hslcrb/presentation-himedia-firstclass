// The supplied symbol uses a 27-unit grid: a three-unit beam, a five-unit
// opening below it, and six one-unit posts. Depth is added behind the face.
const unit = .16
const halfWidth = 13.5 * unit
const beam = [-halfWidth, halfWidth, 24 * unit, 27 * unit, -.50, .12]
const pieces = [beam, ...[0, 2, 4, 22, 24, 26].map(start => [
  start * unit - halfWidth, (start + 1) * unit - halfWidth, 0, 19 * unit, -.22, .10,
])]
const azimuth = .305
const elevation = .307
const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth)
const cosE = Math.cos(elevation), sinE = Math.sin(elevation)
const dx = -sinA / cosA
const dy = sinE / (cosA * cosE)
const clamp = n => Math.min(1, Math.max(0, n))

// Interpolate a Gaussian from a small table; the light integrator takes
// several samples per pixel, and the field is stationary.
const falloff = Float32Array.from({ length: 1025 }, (_, i) => Math.exp(-((i / 256) ** 2)))
function glow(x) {
  const t = Math.abs(x) * 256
  if (t >= 1024) return 0
  const i = t | 0
  return falloff[i] + (falloff[i + 1] - falloff[i]) * (t - i)
}

function slit(distance, penumbra) {
  const edge = clamp((.071 + penumbra - Math.abs(distance)) / (2 * penumbra))
  return edge * edge * (3 - 2 * edge)
}

// Back-project a sample to the facade plane. Both the haze and the floor
// use the same openings, so the bright stripes begin at the actual jambs.
function aperture(gateX, blur) {
  if (gateX < .1 || gateX > 2.1) return 0
  const gaps = slit(gateX - 12 * unit, blur) + slit(gateX - 10 * unit, blur)
  // A wider wash grazes the inner lip of each triplet.
  const opening = clamp(.5 + (8.5 * unit - gateX) / (2.6 * blur))
  const inner = opening * opening * (3 - 2 * opening) * glow((gateX - 1.16) / .33) * .53
  return gaps + inner
}

function transmittedLight(x, y, z) {
  if (z < 0 || y < 0) return 0
  const spread = 1 + z / 1.52
  const gateY = .81 + (y - .81) / spread
  if (gateY > 3.1) return 0
  const blur = .015 + .039 * (1 - 1 / spread)
  const west = aperture(1.14 - (x + 1.14) / spread, blur)
  const east = aperture(1.37 + (x - 1.37) / spread, blur)
  const brightness = (1.16 * west + .84 * east) * glow((gateY - .62) / 1.52)
  return brightness * clamp((3.1 - gateY) / .2) / (1 + z * (.20 + .15 * z))
}

function surfaceAt(x, y, z, bounds, face, isBeam) {
  const [x1, x2, y1, y2, z1, z2] = bounds
  const edgeDistance = face === 'front'
    ? Math.min(x - x1, x2 - x, y - y1, y2 - y)
    : face === 'top' ? Math.min(x - x1, x2 - x, z - z1, z2 - z)
      : Math.min(z - z1, z2 - z, y - y1, y2 - y)
  const polish = glow(Math.max(0, edgeDistance) / .009)
  const sky = .44 + .56 * glow((x + .72) / 1.43)
  const bounce = isBeam ? .12 : .41 * glow(y / 1.2)
  if (face === 'top') return .085 + .24 * sky + polish * .25
  if (face === 'side') return .08 + .19 * (z2 - z) / (z2 - z1) + bounce + .48 * polish * sky
  const strip = .32 + 2.7 * glow((x - .48) / .68)
  const lowerLip = isBeam ? strip * glow((y - y1) / .029) : .015
  return .008 + sky * .019 + bounce * .12 + polish * (.1 + sky * .28) + lowerLip
}

// A recessed strip just behind the lintel grazes the air in the opening.
// Its broad, off-axis falloff leaves the opposite side of the stage in shadow.
function lintelWash(x, y) {
  const drop = beam[2] - y
  if (drop < -.12) return 0
  const reach = Math.max(0, drop)
  const center = .48 - .58 * reach
  const hot = glow((x - center) / (.74 + .18 * reach))
  const edge = glow((x - center - .48) / (.14 + .14 * reach))
  return (hot + .52 * edge) * Math.exp(-1.07 * reach) * glow(Math.min(drop, 0) / .052)
}

const fogDepth = [0.12, .34, .67, 1.14, 1.78, 2.64, 3.8, 5.28]
const fogWeight = [.14, .21, .25, .24, .22, .175, .11, .065]
function haze(x0, y0, nearZ) {
  let light = 0
  for (let i = 0; i < fogDepth.length; i++) {
    const z = fogDepth[i]
    if (z < nearZ) continue
    const y = y0 + dy * z
    light += transmittedLight(x0 + dx * z, y, z) * fogWeight[i]
  }
  return light
}

export function drawFacade(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight
  if (!width || !height) return
  const density = Math.min(window.devicePixelRatio || 1, 1.65, 2048 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * density)), h = Math.max(1, Math.round(height * density))
  if (canvas.width === w && canvas.height === h && canvas.dataset.ready) return
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return
  canvas.width = w
  canvas.height = h
  const portrait = w <= h
  const scale = portrait ? Math.min(.176 * w, .11 * h) : Math.min(.125 * w, .16 * h)
  const squareFrame = clamp((w / h - .55) / .45)
  const centerX = w * (portrait ? .52 + .025 * squareFrame : .7)
  const centerY = h * (portrait ? .385 - .05 * squareFrame : .431)
  const image = ctx.createImageData(w, h)
  const data = image.data

  for (let col = 0; col < w; col++) {
    const x0 = (col + .5 - centerX) / (scale * cosA)
    // Only prisms whose projected widths cover this column can be visible.
    const candidates = []
    for (const bounds of pieces) {
      const far = Math.max(bounds[4], (bounds[1] - x0) / dx)
      const near = Math.min(bounds[5], (bounds[0] - x0) / dx)
      if (far < near) candidates.push({ bounds, far, near })
    }
    for (let row = 0; row < h; row++) {
      const y0 = 2.02 + ((centerY - row - .5) / scale - sinE * sinA * x0) / cosE
      const floorZ = -y0 / dy
      let nearZ = floorZ
      let solid = 0
      let hit = false
      for (const candidate of candidates) {
        const b = candidate.bounds
        const farY = (b[2] - y0) / dy, nearY = (b[3] - y0) / dy
        const z = Math.min(candidate.near, nearY)
        if (Math.max(candidate.far, farY) >= z || z <= nearZ) continue
        nearZ = z
        hit = true
        const face = z === nearY ? 'top' : z === b[5] ? 'front' : 'side'
        solid = surfaceAt(x0 + dx * z, y0 + dy * z, z, b, face, b === beam)
      }
      const floorX = x0 + dx * floorZ
      const localX = Math.abs(x0)
      const air = .31 * glow((x0 - .12) / 3.9) * glow((y0 - 1) / 2.95)
      const wing = glow((localX - 1.73) / .52)
      const foot = glow((y0 - .02) / .42)
      let light = 0
      if (!hit) {
        // Backstage spill has a cold white core at the floor line. A separate,
        // broad blue bounce carries into the open middle of the stage.
        light = .96 * wing * glow((y0 - .77) / 1.48) + 3.8 * wing * foot + lintelWash(x0, y0)
        if (floorZ > 0) {
          const contact = clamp(floorZ / .42)
          light += contact * (3.85 * transmittedLight(floorX, 0, floorZ) +
            .43 * glow((Math.abs(floorX) - 1.54) / 1.18) * glow(floorZ / 2.73))
        }
      }
      light += .66 * haze(x0, y0, nearZ)
      // On upright frames the title sits on the apron, beyond the pool of light.
      if (portrait && !hit && floorZ > 1.4) {
        light /= 1 + .32 * (floorZ - 1.4) ** 2
      }
      const backdrop = hit ? .012 : air
      const grain = ((Math.imul((row * w + col) ^ (row << 6), 0x27d4eb2d) >>> 24) / 255 - .5) * (3 + 3 * clamp(light))
      const index = (row * w + col) * 4
      // Blue light saturates the deepest shadows first. The high exposures
      // at the aperture approach ice-white without a hard clipped contour.
      const energy = light + solid
      data[index] = 3 + 13 * backdrop + 248 * (1 - Math.exp(-.27 * energy)) + grain
      data[index + 1] = 9 + 42 * backdrop + 245 * (1 - Math.exp(-.64 * energy)) + grain
      data[index + 2] = 26 + 170 * backdrop + (229 - 165 * backdrop) * (1 - Math.exp(-1.95 * energy)) + grain
      data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  canvas.dataset.ready = 'true'
}
