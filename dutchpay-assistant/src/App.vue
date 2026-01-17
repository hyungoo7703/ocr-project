<template>
  <div id="app-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
/* Global layout handled in base.css */
#app-container {
  min-height: 100vh;
  position: relative;
}
</style>
