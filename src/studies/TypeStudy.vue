<script setup>
// A displaced stack of annuli exposes fine parallel ink lines along both rims.
const counterLayers = Array.from({ length: 33 }, (_, index) => {
  const depth = 32 - index
  return {
    depth,
    transform: `translate(${depth * -2.65} ${depth * 5.1})`,
    color: depth === 0 ? '#1737db' : depth % 2 ? '#a7b9ff' : '#172888',
  }
})
</script>

<template>
  <div class="type-study">
    <svg
      class="counter"
      viewBox="0 0 1480 820"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path
          id="study-counter-ring"
          fill-rule="evenodd"
          d="M -696 0 A 696 352 0 1 0 696 0 A 696 352 0 1 0 -696 0 Z
             M -389 0 A 389 197 0 1 0 389 0 A 389 197 0 1 0 -389 0 Z"
        />
      </defs>
      <g v-for="layer in counterLayers" :key="layer.depth" :transform="layer.transform">
        <use
          href="#study-counter-ring"
          transform="translate(860 270) rotate(-20)"
          :fill="layer.color"
        />
      </g>
    </svg>

    <h1 class="type-title" aria-label="채용연계형 직무교육과정">
      <span class="qualifier" aria-hidden="true">채용연계형</span>
      <span class="subject" aria-hidden="true"><span>직무</span><span>교육과정</span></span>
    </h1>
  </div>
</template>

<style scoped>
.type-study {
  --ink: #172ea7;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #f1f2e9;
  color: var(--ink);
  font-family: 'Noto Sans KR Cover', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

.counter {
  position: absolute;
  top: max(-15.5cqw, -27cqh);
  right: -2.4cqw;
  display: block;
  width: min(89cqw, 159cqh);
  height: auto;
  overflow: visible;
}

.type-title {
  margin: 0;
  font-weight: 900;
  line-height: 1;
}

.qualifier {
  position: absolute;
  top: 7.4cqh;
  left: 5.4cqw;
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: min(4.2cqw, 8.4cqh);
  font-weight: 540;
  line-height: 1;
  letter-spacing: -0.06em;
}

.subject {
  position: absolute;
  right: 4.8cqw;
  bottom: 8cqh;
  left: 4.8cqw;
  display: flex;
  white-space: nowrap;
  font-size: min(17.55cqw, 34cqh);
  line-height: 1;
  letter-spacing: -0.085em;
}

@container (max-aspect-ratio: 6/5) {
  .counter {
    top: -4cqw;
    right: -21cqw;
    width: 124cqw;
  }

  .qualifier {
    top: 5.4cqh;
    left: 6cqw;
    font-size: 6.1cqw;
  }

  .subject {
    right: 5.3cqw;
    bottom: 6.7cqh;
    left: 5.3cqw;
    flex-direction: column;
    font-size: min(25.5cqw, 21cqh);
    line-height: 1.04;
  }
}

@container (max-aspect-ratio: 2/3) {
  .counter {
    top: 15cqh;
    right: -29cqw;
    width: 142cqw;
  }
}
</style>
