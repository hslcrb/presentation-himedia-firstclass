<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import $ from 'jquery'
import 'fullpage.js'
import 'fullpage.js/dist/jquery.fullpage.css'
import CoverSlide from './CoverSlide.vue'

const presentation = ref(null)

onMounted(() => {
  $(presentation.value).fullpage({
    verticalCentered: false,
    scrollingSpeed: 0,
    fitToSection: false,
    animateAnchor: false,
    keyboardScrolling: false,
    navigation: false,
  })
  $.fn.fullpage.setAllowScrolling(false)
})

onBeforeUnmount(() => {
  $.fn.fullpage.destroy('all')
})
</script>

<template>
  <main ref="presentation">
    <div class="section">
      <CoverSlide />
    </div>
  </main>
</template>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  background: #040b20;
}
</style>
