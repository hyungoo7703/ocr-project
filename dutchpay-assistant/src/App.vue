<template>
  <div id="app">
    <h1>더치페이 도우미</h1>
    <h2>(더드미)</h2>
    <ImageUploader />
  </div>
</template>

<script setup lang="ts">
import ImageUploader from './components/ImageUploader.vue'
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
