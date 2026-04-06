<script setup lang="ts">
import * as go from 'gojs';
import { computed } from 'vue';
import { useWindowSize } from '@vueuse/core';

import TableEditor from '@/components/TableEditor.vue';
import { useEditorStore, useGoStore } from '@/store';

const editorStore = useEditorStore();
const goStore = useGoStore();
const { width } = useWindowSize(); // if window is < 768px, Slideover will come from bottom

const data = computed(() => (editorStore.part ? editorStore.part.data : null));

function modifyData(data: go.ObjectData) {
  if (editorStore.part)
    goStore.updateNodeData(editorStore.part.key, data, editorStore.part.diagram?.div?.id === 'myGuests');
}
</script>

<template>
  <USlideover
    v-model:open="editorStore.open"
    title="Editor"
    :description="`Edit ${data && data.category ? 'table' : 'guest'} properties`"
    :overlay="false"
    :modal="false"
    :side="width < 768 ? 'bottom' : 'right'"
    class="z-50">
    <template #body>
      <TableEditor
        v-if="data && data.category"
        mode="update"
        :type="data.category"
        :name="data.name"
        :seats="data.seats"
        @submitted="modifyData" />
      <GuestEditor v-else-if="data" :name="data.name" @submitted="modifyData" />
    </template>
  </USlideover>
</template>
