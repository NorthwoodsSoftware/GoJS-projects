<script setup lang="ts">
import { useGoStore } from '@/store';

const goStore = useGoStore();

function zoomIn() {
  goStore.diagram?.commandHandler.increaseZoom();
}

function zoomOut() {
  goStore.diagram?.commandHandler.decreaseZoom();
}

function zoomFit() {
  goStore.diagram?.commandHandler.zoomToFit();
}
</script>

<template>
  <UButtonGroup size="lg">
    <UTooltip text="Zoom in" :kbds="['=']" :ui="{ kbdsSize: 'md' }">
      <UButton color="neutral" variant="subtle" icon="i-lucide-zoom-in" @click="zoomIn" />
    </UTooltip>
    <UTooltip text="Zoom out" :kbds="['-']" :ui="{ kbdsSize: 'md' }">
      <UButton color="neutral" variant="subtle" icon="i-lucide-zoom-out" @click="zoomOut" />
    </UTooltip>
    <UTooltip text="Zoom to fit" :kbds="['0']" :ui="{ kbdsSize: 'md' }">
      <UButton color="neutral" variant="subtle" icon="i-lucide-scan-search" @click="zoomFit" />
    </UTooltip>
    <UTooltip text="Toggle readonly" :kbds="['L']" :ui="{ kbdsSize: 'md' }">
      <UButton
        color="neutral"
        variant="subtle"
        :icon="goStore.diagram?.isReadOnly ? 'i-lucide-lock' : 'i-lucide-lock-open'"
        @click="goStore.toggleReadOnly" />
    </UTooltip>
  </UButtonGroup>
</template>
