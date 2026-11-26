<script setup>
import ConnectionArt from '../ConnectionArt.vue'
</script>

<template>
  <ConnectionArt />
  <h1 id="cover-title" class="cover-title">
    <span>채용연계형</span> <span>직무교육과정</span>
  </h1>
</template>

<style scoped>
.cover-title {
  position: absolute;
  left: max(6.1cqw, env(safe-area-inset-left));
  bottom: max(9.3cqh, env(safe-area-inset-bottom));
  margin: 0;
  line-height: 1.1;
  letter-spacing: -.08em;
}
.cover-title span {
  display: block;
  white-space: nowrap;
}
.cover-title span:first-child {
  margin-bottom: .38em;
  color: #c2e1ff;
  font-size: min(3.4cqw, 8.4cqh);
  font-weight: 475;
}
.cover-title span:last-child {
  font-size: min(7.8cqw, 18cqh);
  font-weight: 740;
}
@media (max-aspect-ratio: 1/1) {
  .cover-title { left: 7cqw; bottom: max(10cqh, env(safe-area-inset-bottom)); }
  .cover-title span:first-child { font-size: 6.6cqw; }
  .cover-title span:last-child { font-size: 13.6cqw; }
}
</style>
