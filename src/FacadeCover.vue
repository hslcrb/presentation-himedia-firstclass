<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { drawFacade } from './facade-light.js'

const surface = ref(null)
let observer
onMounted(() => {
  drawFacade(surface.value)
  observer = new ResizeObserver(() => drawFacade(surface.value))
  observer.observe(surface.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="facade-cover">
    <canvas ref="surface" aria-hidden="true"></canvas>
    <h1>
      <span>채용연계형</span> <strong>직무교육과정</strong>
    </h1>
  </div>
</template>

<style scoped>
.facade-cover, canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.facade-cover { background: #040b20; overflow: hidden; }
canvas { display: block; pointer-events: none; }
h1 {
  position: absolute;
  left: 6.1%;
  top: 51.5%;
  transform: translateY(-50%);
  margin: 0;
  color: #f3f7ff;
  line-height: 1.12;
  letter-spacing: -.072em;
}
h1 span, h1 strong { display: block; white-space: nowrap; }
h1 span {
  margin-bottom: .33em;
  color: #c3d6f8;
  font-size: min(3.55cqw, 8.5cqh);
  font-weight: 455;
}
h1 strong { font-size: min(6.85cqw, 15.5cqh); font-weight: 720; }
@media (max-aspect-ratio: 1/1) {
  h1 { left: 7%; top: auto; bottom: 9.4%; transform: none; }
  h1 span { font-size: min(6.8cqw, 5.8cqh); }
  h1 strong { font-size: min(13.2cqw, 10.5cqh); }
}
</style>
