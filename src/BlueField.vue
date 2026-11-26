<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { drawBlueField } from './blue-field.js'

const canvas = ref(null)
let observer

onMounted(() => {
  drawBlueField(canvas.value)
  observer = new ResizeObserver(() => drawBlueField(canvas.value))
  observer.observe(canvas.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="blue-field" aria-hidden="true">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.blue-field, canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.blue-field {
  background:
    linear-gradient(180deg, #e8f8fe, transparent 40%, #e0f1fc 93%),
    repeating-linear-gradient(90deg, #326de7 0%, #4298fa 3.6%, #2964dd 3.85%);
}
canvas { display: block; opacity: 0; }
canvas[data-ready] { opacity: 1; }
</style>
