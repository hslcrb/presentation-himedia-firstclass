<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createGlassRenderer } from './glass-renderer.js'

const canvas = ref(null)
const rendered = ref(false)
let material
let observer

// Extents and optical tints for the CSS version on devices without WebGL.
const panes = [
  [35, -15, 37, 36, '#435e38'],
  [58, 69, 31, 45, '#8b923d'],
  [-6, 64, 49, 45, '#788c39'],
  [22, 16, 59, 63, '#304a29'],
  [40, 79, 22, 37, '#5e7335'],
  [67, -15, 44, 46, '#486131'],
  [80, 29, 30, 42, '#718c43'],
  [-10, 19.5, 34, 44, '#86ab36'],
  [-6, -15, 44, 38, '#d3ea65'],
  [69.5, 66.5, 39, 45, '#e2d460'],
]

function draw() {
  if (!material || !canvas.value) return
  material.draw(canvas.value.clientWidth, canvas.value.clientHeight)
  rendered.value = true
}

function initialize() {
  material?.dispose()
  material = createGlassRenderer(canvas.value)
  draw()
}

function lost(event) {
  event.preventDefault()
  material = null
  rendered.value = false
}

onMounted(() => {
  initialize()
  observer = new ResizeObserver(draw)
  observer.observe(canvas.value)
  canvas.value.addEventListener('webglcontextlost', lost)
  canvas.value.addEventListener('webglcontextrestored', initialize)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  canvas.value?.removeEventListener('webglcontextlost', lost)
  canvas.value?.removeEventListener('webglcontextrestored', initialize)
  material?.dispose()
})
</script>

<template>
  <div class="glass-field" aria-hidden="true">
    <div v-if="!rendered" class="glass-fallback">
      <i v-for="([left, top, width, height, tint], index) in panes" :key="index"
        :style="{ left: left + '%', top: top + '%', width: width + '%', height: height + '%', '--tint': tint }" />
    </div>
    <canvas ref="canvas" :class="{ visible: rendered }"></canvas>
  </div>
</template>

<style scoped>
.glass-field, .glass-fallback, canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.glass-field {
  overflow: hidden;
  isolation: isolate;
  background: #0a1b10;
}
canvas { display: block; opacity: 0; }
canvas.visible { opacity: 1; }
.glass-fallback {
  background:
    radial-gradient(ellipse 29% 23% at 8% 14%, #c3dc36, transparent 95%),
    radial-gradient(ellipse 34% 34% at 95% 85%, #d6cc3d, transparent 95%),
    radial-gradient(ellipse 32% 25% at 17% 99%, #34471d, transparent),
    #0b1b0e;
}
.glass-fallback i {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--tint);
  border-radius: 2.2vmax;
  background: linear-gradient(155deg, #e3f1a207, #00180b10 55%, #09270809);
  box-shadow:
    inset 3px 2px 4px #ffffcb63,
    inset -3px -4px 5px #000c,
    inset 6px 7px 3px #032108aa,
    inset 10px 13px 5px color-mix(in srgb, var(--tint) 38%, transparent),
    inset -9px -7px 2px color-mix(in srgb, var(--tint) 50%, transparent),
    inset 15px 14px 21px #14290c90,
    4px 6px 17px #031107c9;
}
</style>
