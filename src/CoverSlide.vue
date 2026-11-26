<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BlueField from './BlueField.vue'

const fullscreen = ref(false)
const supportsFullscreen = ref(false)
const fullscreenLabel = computed(() => fullscreen.value ? '전체 화면 종료' : '전체 화면')

function syncFullscreen() {
  fullscreen.value = Boolean(document.fullscreenElement)
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    // An embedding page can revoke fullscreen permission after the initial check.
    supportsFullscreen.value = document.fullscreenEnabled
  }
  syncFullscreen()
}

onMounted(() => {
  supportsFullscreen.value = Boolean(document.fullscreenEnabled)
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
})

onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))
</script>

<template>
  <article class="cover" aria-labelledby="cover-title">
    <BlueField />

    <h1 id="cover-title" class="cover-title">
      <span>채용연계형</span> <span>직무교육과정</span>
    </h1>

    <button
      v-if="supportsFullscreen"
      type="button"
      class="fullscreen-button"
      :aria-label="fullscreenLabel"
      :aria-pressed="fullscreen"
      :title="fullscreenLabel"
      @click="toggleFullscreen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path v-if="fullscreen" d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6"/>
        <path v-else d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6"/>
      </svg>
    </button>
  </article>
</template>

<style scoped>
@font-face {
  font-family: "Noto Sans KR Cover";
  src: url("/fonts/course-title.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

.cover {
  position: relative;
  width: 100%;
  height: 100%;
  isolation: isolate;
  container-type: size;
  overflow: hidden;
  background: #d1e3f4;
  color: #0b2549;
  -webkit-font-smoothing: antialiased;
}

.cover-title {
  position: absolute;
  left: max(5.5cqw, env(safe-area-inset-left));
  bottom: max(7.8cqh, env(safe-area-inset-bottom));
  margin: 0;
  font-family: "Noto Sans KR Cover", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  font-size: min(7.2cqw, 19cqh);
  font-weight: 685;
  line-height: 1.12;
  letter-spacing: -.065em;
  word-spacing: .085em;
  word-break: keep-all;
}

.cover-title span {
  white-space: nowrap;
}

.fullscreen-button {
  position: absolute;
  top: max(3.6cqh, env(safe-area-inset-top));
  right: max(2.4cqw, env(safe-area-inset-right));
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #163859;
  cursor: pointer;
}

.fullscreen-button svg {
  width: 19px;
  height: 19px;
  stroke-width: 1.65;
}

.fullscreen-button:focus-visible {
  outline: 2px solid #123965;
  outline-offset: 4px;
}

@media (max-aspect-ratio: 1/1) {
  .cover-title {
    left: max(6.5cqw, env(safe-area-inset-left));
    bottom: max(7cqh, env(safe-area-inset-bottom));
    font-size: min(12.8cqw, 14cqh);
    line-height: 1.12;
  }
  .cover-title span {
    display: block;
  }
  .fullscreen-button {
    top: max(18px, env(safe-area-inset-top));
    right: max(18px, env(safe-area-inset-right));
  }
}
</style>
