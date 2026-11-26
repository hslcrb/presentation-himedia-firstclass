// The backlight and the glass are drawn once at the display resolution.
// Coordinates are in millimetre-like design units on the 1920 × 1080 cover.
const vertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform vec4 frame;

float gaussian(vec2 p, vec2 center, vec2 radius) {
  vec2 d = (p - center) / radius;
  return exp(-dot(d, d));
}

// Two long strips of light behind the stack. Their reflections appear again
// at different scales in the curved perimeter of each pane.
vec3 backlight(vec2 p) {
  vec2 t = p / vec2(1920., 1080.);
  vec3 light = vec3(.014, .033, .019);
  light += vec3(.042, .105, .039) * gaussian(t, vec2(.51,.45), vec2(.85,.85));
  light += vec3(.22, .34, .043) * gaussian(t, vec2(.02,.075), vec2(.37,.28));
  light += vec3(.38, .57, .035) * gaussian(t, vec2(.11,.17), vec2(.235,.17));
  light += vec3(.26, .26, .018) * gaussian(t, vec2(.97,.77), vec2(.30,.35));
  light += vec3(.61, .53, .046) * gaussian(t, vec2(.915,.895), vec2(.23,.20));
  light += vec3(.018, .11, .031) * gaussian(t, vec2(.97,.25), vec2(.20,.22));
  light += vec3(.111, .17, .015) * gaussian(t, vec2(.20,.96), vec2(.33,.19));
  float leftStrip = t.y - (.21 - .23*t.x + .035*sin(t.x*14.));
  light += vec3(.27,.31,.065) * exp(-leftStrip*leftStrip/.0015)
         * gaussian(t, vec2(.09,.18), vec2(.27,.5));
  float rightStrip = t.y - (.87 - .17*t.x + .065*cos(8.*t.x));
  light += vec3(.40,.34,.082) * exp(-rightStrip*rightStrip/.0029)
         * gaussian(t, vec2(.94,.74), vec2(.245,.36));
  // Narrow folds of the two softboxes focus into arcs inside the glass.
  float rippleL = t.y - (.205 - .13*t.x + .028*sin(19.*t.x));
  float rippleR = t.y - (.805 - .27*(t.x-.8) + .033*sin(24.*t.x+1.));
  float leftBeam = gaussian(t,vec2(.10,.18),vec2(.18,.14));
  float rightBeam = gaussian(t,vec2(.93,.79),vec2(.18,.12));
  light += vec3(.24,.20,.13)*leftBeam*
      (.36*exp(-abs(rippleL)*107.) + .62*exp(-abs(rippleL)*325.));
  light += vec3(.29,.23,.16)*rightBeam*
      (.44*exp(-abs(rippleR)*61.) + .50*exp(-abs(rippleR)*242.));
  return light;
}

float line(float d, float at, float width) {
  float x = (d - at) / width;
  return exp(-x*x);
}

void pane(inout vec3 color, vec2 p, vec4 extent, float radius, float thickness,
          float transmission, float seed) {
  vec2 metric = vec2(1., resolution.y*frame.z/(resolution.x*frame.w));
  vec2 center = (extent.xy + extent.zw)*.5;
  vec2 halfSize = (extent.zw - extent.xy)*.5*metric;
  vec2 centered = (p-center)*metric;
  vec2 corner = abs(centered) - halfSize + radius;
  vec2 outer = max(corner, 0.);
  float d = length(outer) + min(max(corner.x,corner.y),0.) - radius;
  if (d > 45.) return;

  float shade = exp(-max(d,0.) / (thickness*.69)) * (1.-smoothstep(22.,45.,d));
  color *= 1. - shade * .65;
  if (d > 1.5) return;
  vec2 normal = length(outer) > .01 ? normalize(outer) :
      (corner.x > corner.y ? vec2(1.,0.) : vec2(0.,1.));
  normal *= sign(centered);
  float depth = max(-d,0.);
  float along = dot(p,vec2(.91,1.07));
  float variation = .5 + .24*sin(along*.009+seed) + .15*sin(along*.026-seed*3.)
                         + .09*cos(along*.054 + .9*seed);
  float rimDepth = thickness * (.9+.24*variation);
  float bevel = exp(-depth/rimDepth);
  float rollover = sin(min(depth/(rimDepth*1.9),1.)*3.14159);
  vec2 sampleAt = p + normal/metric*rimDepth*(2.6*bevel - 3.8*rollover)
                     + vec2(16.+16.*sin(seed),9.-19.*cos(seed));
  vec3 light = backlight(sampleAt);
  vec3 face = light * transmission * vec3(.95,1.,.86);
  // Gentle lensing near the polished wall compresses the broad strip lights.
  face *= .91 + .15*exp(-depth/(rimDepth*5.));
  float wall = line(depth, rimDepth*.36, rimDepth*.27) +
               .40*line(depth, rimDepth*.91, rimDepth*.16);
  face *= 1. - .76*wall;

  vec3 reflected = backlight(p + normal*vec2(350.,250.));
  vec3 spectrum = mix(vec3(.51,.64,.29), vec3(.93,.91,.52),
                      smoothstep(650.,1720.,p.x));
  float grazing = .25 + .75*abs(dot(normal,normalize(vec2(-.7,-1.))));
  float brilliance = (.23+.77*variation)*grazing;
  vec3 rim = (spectrum*.33 + reflected*.8) * brilliance;
  float edge = line(depth,1.4,1.05) + .50*line(depth,4.,.76);
  float caustic = line(depth,rimDepth*(.62+.12*variation),1.1+1.7*variation);
  float lip = line(depth,rimDepth*(1.12+.12*variation),1.3) * .42;
  face += rim*(edge*1.08 + caustic*.93 + lip);
  face += spectrum*line(depth,rimDepth*.63,rimDepth*.22) * brilliance*.103;

  // Fluid ridges around cast corners have a wider soft reflection.
  float turned = 2.*abs(normal.x*normal.y);
  face += rim * turned * (.42*bevel + .63*caustic);
  color = mix(color,face,1.-smoothstep(-.8,1.4,d));
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
  vec2 p = frame.xy + uv*frame.zw;
  vec3 color = backlight(p)*.47;
  pane(color,p,vec4(676.,-170.,1388.,226.),34.,17.,.85,1.5);
  pane(color,p,vec4(1112.,760.,1680.,1230.),37.,21.,.94,3.1);
  pane(color,p,vec4(-104.,692.,834.,1188.),45.,25.,.79,.8);
  pane(color,p,vec4(430.,172.,1547.,850.),49.,21.,.87,2.7);
  pane(color,p,vec4(767.,854.,1194.,1260.),39.,20.,.94,4.);
  pane(color,p,vec4(1285.,-165.,2090.,335.),42.,22.,.95,4.8);
  pane(color,p,vec4(1533.,316.,2110.,756.),48.,27.,.92,3.4);
  pane(color,p,vec4(-190.,210.,457.,686.),40.,27.,.99,1.2);
  pane(color,p,vec4(-110.,-160.,721.,245.),45.,27.,1.04,5.);
  pane(color,p,vec4(1334.,719.,2080.,1195.),48.,27.,1.07,2.05);
  // The upper and lower crop fall away from the two studio lights.
  color *= 1. - .48*gaussian(uv,vec2(.042,.045),vec2(.21,.118))
              - .56*gaussian(uv,vec2(.989,.994),vec2(.23,.15));
  // A stationary micro-grain also dithers the low-light green gradients.
  float noise = fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
  color += (noise-.5)*.011;
  gl_FragColor = vec4(color,1.);
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Cannot create a glass shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    throw new Error('The glass material is unsupported on this device')
  }
  return shader
}

export function createGlassRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
  if (!gl) return null
  let program
  let vertices
  const shaders = []
  function dispose() {
    if (vertices) gl.deleteBuffer(vertices)
    if (program) gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
  }
  try {
    shaders.push(compile(gl, gl.VERTEX_SHADER, vertexSource))
    shaders.push(compile(gl, gl.FRAGMENT_SHADER, fragmentSource))
    program = gl.createProgram()
    shaders.forEach(shader => gl.attachShader(program, shader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Cannot link glass material')
    gl.useProgram(program)
    vertices = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'resolution')
    const frame = gl.getUniformLocation(program, 'frame')
    return {
      draw(width, height) {
        if (width < 1 || height < 1) return
        const scale = Math.min(window.devicePixelRatio || 1, 2, 2880 / Math.max(width, height))
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.uniform2f(resolution, canvas.width, canvas.height)
        // A shorter view retains both diagonal light sources while the poster
        // crops vertically at broad cinema aspect ratios.
        const sceneHeight = Math.min(1080, 1920 * height / width)
        gl.uniform4f(frame, 0, (1080 - sceneHeight) * .5, 1920, sceneHeight)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      },
      dispose,
    }
  } catch {
    dispose()
    return null
  }
}
