<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useFileSelection } from '@/composables/useFileSelection';

const open = defineModel<boolean>();
const { dataTypes, description, title } = defineProps<{
  dataTypes: string[];
  description?: string;
  title?: string;
}>();

const emit = defineEmits(['fileChosen']);
const dropZoneRef = useTemplateRef('dropZoneRef');
const { chooseFiles, isOverDropZone } = useFileSelection({
  dropzone: dropZoneRef,
  onFiles: (files: File[] | null) => emit('fileChosen', files),
  allowedDataTypes: dataTypes,
  multiple: false
});
</script>

<template>
  <UModal v-model:open="open" :title :description class="z-50">
    <template #body>
      <div
        ref="dropZoneRef"
        class="flex h-32 justify-center items-center rounded-[calc(var(--ui-radius)*1.5)] border-2 border-(--ui-border)"
        :class="{ 'border-(--ui-success)': isOverDropZone }">
        <div class="flex items-center gap-2 font-bold" :class="{ 'text-(--ui-success)': isOverDropZone }">
          <UIcon name="i-lucide-file" class="size-5" />
          Drop a file here
        </div>
      </div>
      <UButton class="w-fit mt-2" @click="chooseFiles()">Choose a file...</UButton>
    </template>
    <template #footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </template>
  </UModal>
</template>
