<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import FacadeCover from './FacadeCover.vue'

const previews = {
  imprint: defineAsyncComponent(() => import('./ImprintCover.vue')),
  link: defineAsyncComponent(() => import('./studies/LinkStudy.vue')),
  type: defineAsyncComponent(() => import('./studies/TypeStudy.vue')),
}
const requested = new URLSearchParams(window.location.search).get('study')
const edition = Object.hasOwn(previews, requested) ? requested : 'facade'
const Cover = previews[edition] ?? FacadeCover

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
  <article class="cover" :class="edition" aria-label="채용연계형 직무교육과정">
    <component :is="Cover" />

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
  background: #080e0c;
  color: #eff6ff;
  font-family: "Noto Sans KR Cover", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.fullscreen-button {
  position: absolute;
  z-index: 1;
  top: max(3.6cqh, env(safe-area-inset-top));
  right: max(2.8cqw, env(safe-area-inset-right));
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #d9edff;
  cursor: pointer;
}
.imprint .fullscreen-button { color: #102870; }
.facade .fullscreen-button { color: #dce6ce; }
.fullscreen-button svg { width: 19px; height: 19px; stroke-width: 1.65; }
.fullscreen-button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }

@media (max-aspect-ratio: 1/1) {
  .type .fullscreen-button { color: #102870; }
  .fullscreen-button { top: max(16px, env(safe-area-inset-top)); right: max(16px, env(safe-area-inset-right)); }
}
</style>
