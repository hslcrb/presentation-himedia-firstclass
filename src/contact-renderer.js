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
    Math.max(0, 1 - 0.32 * Math.hypot(phaseStep, dWeightBdy * phaseAB + dWeightCdy * phaseAC)) * 8.5
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

const TAU = 2 * Math.PI
const sweepSteps = 288
const sectionSteps = 56
const stride = sectionSteps + 1
const clamp = value => Math.min(1, Math.max(0, value))
const bell = (distance, width) => Math.exp(-((distance / width) ** 2))
const signedPower = (value, exponent) => Math.sign(value) * Math.abs(value) ** exponent

function rotateX([x, y, z], angle) {
  return [x, y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle)]
}

function pose([x, y, z]) {
  // A single view of both pieces preserves their point of contact.
  const [, tiltedY, tiltedZ] = rotateX([x, y, z], -.925)
  const turnedX = x * .777 + tiltedZ * .629
  return [
    turnedX * .743 - tiltedY * .669,
    turnedX * .669 + tiltedY * .743,
    -x * .629 + tiltedZ * .777,
  ]
}

function polishedBlue(normal, u, v, backLink, clearance) {
  const [nx, ny, nz] = normal
  const facing = Math.abs(nz)
  const rx = 2 * nz * nx
  const ry = 2 * nz * ny
  const rz = 2 * nz * nz - 1
  const grazing = (1 - facing) ** 2
  const innerWall = Math.max(0, -Math.cos(v))
  const exposure = clamp(.49 - .19 * nx + .34 * ny + .11 * Math.cos(u - .46) - .21 * innerWall)
  const dark = backLink ? [.016, .075, .31] : [.035, .19, .43]
  const bright = backLink ? [.13, .55, 1] : [.65, .88, 1]
  const softbox = bell(rx - .28 * ry + .23, .27) * (.48 + .52 * clamp(ry + .52))
  const longStrip = bell(ry + .39 * rx - .63, .12) * (.54 + .46 * clamp(rz + .65))
  const fineEdge = bell(rx + .26 * ry - .88, .058)
  const reflection = clamp(.46 * softbox + .53 * longStrip + .43 * fineEdge + .17 * grazing)
  const occlusion = 1 - .41 * bell(Math.max(clearance, 0), .24)
  return dark.map((low, index) => {
    const body = low + (bright[index] - low) * exposure
    return clamp((body + ([.9, .96, 1][index] - body) * reflection) * occlusion)
  })
}

function buildLink(backLink) {
  const tilt = backLink ? Math.PI * .53 : 0
  const center = backLink ? .61 : -.49
  const radius = backLink ? .89 : .98
  const rimWidth = backLink ? .215 : .27
  const rimDepth = backLink ? .17 : .19
  const positions = []
  const colors = []
  for (let i = 0; i <= sweepSteps; i++) {
    const u = TAU * i / sweepSteps
    const cu = Math.cos(u)
    const su = Math.sin(u)
    for (let j = 0; j <= sectionSteps; j++) {
      const v = TAU * j / sectionSteps
      const cv = Math.cos(v)
      const sv = Math.sin(v)
      const radial = radius + rimWidth * signedPower(cv, .67)
      const point = rotateX([radial * cu, radial * su, rimDepth * signedPower(sv, .67)], tilt)
      point[0] += center
      const normalR = signedPower(cv, 1.33) / rimWidth
      const normalZ = signedPower(sv, 1.33) / rimDepth
      const length = Math.hypot(normalR, normalZ)
      const normal = rotateX([cu * normalR / length, su * normalR / length, normalZ / length], tilt)
      const other = rotateX([point[0] - (backLink ? -.49 : .61), point[1], point[2]], backLink ? 0 : -Math.PI * .53)
      const clearance = Math.hypot(Math.hypot(other[0], other[1]) - (backLink ? .98 : .89), other[2]) - .21
      // One piece is finely fluted across its sweep. The other has concentric tooling marks.
      const phase = backLink ? v * 18 : u * 188 + .56 * Math.sin(v)
      positions.push([...pose(point), phase])
      colors.push(polishedBlue(pose(normal), u, v, backLink, clearance))
    }
  }
  return { positions, colors }
}

let links
export function drawConnection(canvas) {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  const density = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1), 2480 / Math.max(width, height))
  const w = Math.round(width * density)
  const h = Math.round(height * density)
  if (canvas.width === w && canvas.height === h && canvas.dataset.ready) return
  const context = canvas.getContext('2d')
  if (!context) return
  canvas.width = w
  canvas.height = h
  const image = context.createImageData(w, h)
  const depth = new Float32Array(w * h).fill(-Infinity)
  links ??= [buildLink(false), buildLink(true)]
  const portrait = w <= h
  const scale = portrait ? Math.min(w * .435, h * .29) : Math.min(w * .24, h * .42)
  const centerX = w * (portrait ? .55 : .762)
  const centerY = h * (portrait ? .39 : .365)
  for (const { positions, colors } of links) {
    const points = positions.map(([x, y, z, phase]) => [centerX + x * scale, centerY - y * scale, z, phase])
    function draw(a, b, c) {
      rasterizeTriangle(points[a], points[b], points[c], colors[a], colors[b], colors[c], w, h, image.data, depth)
    }
    for (let i = 0; i < sweepSteps; i++) {
      for (let j = 0; j < sectionSteps; j++) {
        const a = i * stride + j
        const b = a + stride
        draw(a, b, b + 1)
        draw(a, b + 1, a + 1)
      }
    }
  }
  context.putImageData(image, 0, 0)
  canvas.dataset.ready = 'true'
}
