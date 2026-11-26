<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import GlassBackdrop from './GlassBackdrop.vue'

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
    <GlassBackdrop />

    <header class="masthead">
      <div class="identity" aria-label="하이미디어 아카데미" lang="en">
        <svg class="identity-mark" viewBox="0 0 41 38" aria-hidden="true">
          <path fill="currentColor" d="M10 2h10l-3.8 13.5h10L30 2h10l-9.5 34h-10L24 23.5H14L10.5 36H.5z"/>
        </svg>
        <span class="wordmark"><strong>HIMEDIA</strong><span>ACADEMY</span></span>
      </div>
      <button
        v-if="supportsFullscreen"
        type="button"
        class="fullscreen-button"
        :aria-label="fullscreenLabel"
        :aria-pressed="fullscreen"
        @click="toggleFullscreen"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path v-if="fullscreen" d="M7 2v5H2m11-5v5h5M7 18v-5H2m11 5v-5h5"/>
          <path v-else d="M2.5 7V2.5H7m6 0h4.5V7m0 6v4.5H13m-6 0H2.5V13"/>
        </svg>
        <span>{{ fullscreenLabel }}</span>
      </button>
    </header>

    <div class="title-block">
      <p class="program-label" lang="en">
        <span class="label-rule" aria-hidden="true"></span>Career-linked program<span class="label-rule" aria-hidden="true"></span>
      </p>
      <h1 id="cover-title">
        <span class="sr-only">2026 </span>
        <svg class="year" viewBox="0 0 596 182" aria-hidden="true">
          <defs>
            <linearGradient id="ivory" x2=".14" y2="1" gradientUnits="objectBoundingBox">
              <stop stop-color="#ffffeb"/><stop offset=".6" stop-color="#f6f8dc"/><stop offset="1" stop-color="#dce5bb"/>
            </linearGradient>
            <path id="numeral-two" d="M7 57C10 23 34 6 68 6c36 0 60 22 60 52 0 25-12 40-37 61l-67 56h109"/>
          </defs>
          <g fill="none" stroke="url(#ivory)" stroke-width="9.5" stroke-linecap="square" stroke-linejoin="miter">
            <use href="#numeral-two"/>
            <ellipse cx="220" cy="90.5" rx="75" ry="84.5"/>
            <use href="#numeral-two" x="304"/>
            <path d="M556 7l-76 91c-13 16-20 28-16 44 5 23 27 34 55 34 36 0 65-23 65-54 0-28-22-48-54-48-24 0-43 11-59 37"/>
          </g>
        </svg>
        <span class="course-title">채용연계형 직무교육과정</span>
      </h1>
    </div>

    <footer class="folio">
      <div class="chapter-caption" lang="en">
        <span class="chapter-mark" aria-hidden="true"></span>
        <p>Course<br/>Overview</p>
      </div>
      <div class="page-count" aria-label="1페이지, 전체 1페이지">
        <span class="page-current">01</span><span class="page-divider" aria-hidden="true"></span><span>01</span>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.cover {
  --paper: #f4f6e7;
  --accent: #e3f58c;
  --inset-x: clamp(25px, 4.4vw, 98px);
  --inset-y: clamp(25px, 5.6vh, 68px);
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0f1a0d;
  color: var(--paper);
  font-family: Inter, "Helvetica Neue", Arial, "Malgun Gothic", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.masthead, .folio {
  position: absolute;
  z-index: 1;
  left: var(--inset-x);
  right: var(--inset-x);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.masthead { top: var(--inset-y); }
.identity { display: inline-flex; align-items: center; gap: clamp(9px, .7vw, 15px); }
.identity-mark { color: var(--accent); width: clamp(32px, 2.5vw, 50px); }
.wordmark { display: flex; flex-direction: column; align-items: flex-start; }
.wordmark strong { font-size: clamp(18px, 1.43vw, 29px); line-height: .98; font-weight: 700; letter-spacing: -.065em; }
.wordmark > span { font-size: clamp(8px, .61vw, 13px); letter-spacing: .325em; line-height: 1; margin-top: .43em; padding-left: .12em; }
.fullscreen-button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: .7em; min-height: 42px; padding: .73em 1.25em;
  font-family: inherit; font-weight: 500; font-size: clamp(12px, .77vw, 16px); line-height: 1.3; letter-spacing: -.035em;
  background: rgba(13, 21, 10, .46); border: 1px solid rgba(222, 234, 191, .35);
  color: var(--paper); border-radius: 40px; cursor: pointer;
}
.fullscreen-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 5px; }
.fullscreen-button svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 1.5; }
.title-block {
  position: absolute; z-index: 1; left: 50%; top: 49.8%; transform: translate(-50%, -50%);
  width: 80%; text-align: center;
}
.program-label {
  margin: 0 0 clamp(20px, 3.1vh, 40px);
  display: flex; align-items: center; justify-content: center; gap: 1.15em;
  font-size: clamp(10px, .72vw, 15px); font-weight: 600; line-height: 1.1;
  text-transform: uppercase; letter-spacing: .235em; color: var(--accent);
}
.label-rule { width: 2em; height: 1px; background: currentColor; opacity: .7; }
h1 { margin: 0; font-weight: 500; }
.year { display: block; width: min(45vw, 83vh); height: auto; margin: 0 auto; overflow: visible; }
.course-title {
  display: block; margin-top: clamp(16px, 2.4vh, 34px);
  font-size: clamp(21px, 1.85vw, 40px); font-weight: 500; letter-spacing: -.065em; line-height: 1.4;
}
.folio { bottom: var(--inset-y); align-items: flex-end; }
.chapter-caption { display: flex; flex-direction: column; align-items: flex-start; gap: clamp(12px, 1.6vh, 20px); }
.chapter-caption p { margin: 0; font-size: clamp(20px, 1.7vw, 35px); font-weight: 400; line-height: .98; letter-spacing: -.06em; }
.chapter-mark { width: clamp(27px, 2.2vw, 43px); height: 3px; background: var(--accent); }
.page-count { display: flex; align-items: baseline; gap: .7em; font-size: clamp(12px, .77vw, 16px); font-variant-numeric: tabular-nums; }
.page-current { font-size: 1.85em; letter-spacing: -.07em; }
.page-divider { width: clamp(22px, 2vw, 40px); height: 1px; align-self: center; background: currentColor; opacity: .65; }
.sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
@media (max-aspect-ratio: 1/1) {
  .cover { --inset-y: clamp(26px, 4.4vh, 48px); }
  .title-block { width: 93%; }
  .year { width: min(79vw, 560px); }
  .course-title { margin-top: 19px; font-size: clamp(20px, 4.7vw, 32px); }
  .chapter-caption p { font-size: clamp(23px, 4vw, 32px); }
}
@media (max-height: 470px) and (min-aspect-ratio: 1/1) {
  .cover { --inset-y: 18px; }
  .year { width: 67vh; }
  .program-label { margin-bottom: 13px; }
  .course-title { margin-top: 9px; font-size: 18px; }
}
</style>
