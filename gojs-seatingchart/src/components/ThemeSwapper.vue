<script setup lang="ts">
import { onUpdated } from 'vue';
import { useColorMode } from '@vueuse/core';
import { themeManager } from '@/gojs/sharedManagers';

const mode = useColorMode();
themeManager.updateDiagrams();

function themeChange() {
  const isDark = mode.value === 'dark';
  mode.value = isDark ? 'light' : 'dark';
}

// use onUpdated to update GoJS theme after page has rerendered with new CSS
onUpdated(() => {
  themeManager.updateDiagrams();
});
</script>

<template>
  <UButton
    :icon="mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
    color="neutral"
    variant="ghost"
    @click="themeChange" />
</template>
