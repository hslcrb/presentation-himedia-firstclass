<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { drawRibbon } from './ribbon-renderer.js'

const surface = ref(null)
let observer
function redraw() {
  const canvas = surface.value
  if (canvas) drawRibbon(canvas, canvas.clientWidth, canvas.clientHeight)
}
onMounted(() => {
  redraw()
  observer = new ResizeObserver(redraw)
  observer.observe(surface.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <canvas ref="surface" class="ribbon-art" aria-hidden="true"></canvas>
</template>

<style scoped>
.ribbon-art {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
