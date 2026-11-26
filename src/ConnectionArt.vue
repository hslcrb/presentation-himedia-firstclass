<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { drawConnection } from './contact-renderer.js'

const canvas = ref(null)
let observer
onMounted(() => {
  drawConnection(canvas.value)
  observer = new ResizeObserver(() => drawConnection(canvas.value))
  observer.observe(canvas.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="contact-field" aria-hidden="true">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.contact-field, canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.contact-field {
  background:
    radial-gradient(ellipse 61% 78% at 79% 22%, #293fa4 0%, transparent 89%),
    radial-gradient(ellipse 86% 100% at 78% 88%, #17449d 0%, transparent 82%),
    linear-gradient(125deg, #0b2350, #091b40 48%, #0b245d);
}
canvas { display: block; }
@media (max-aspect-ratio: 1/1) {
  .contact-field {
    background: radial-gradient(ellipse 100% 54% at 69% 27%, #324ba4, transparent), #0a214d;
  }
}
</style>
