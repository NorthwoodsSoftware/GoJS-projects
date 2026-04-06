<script setup lang="ts">
import * as go from 'gojs';
import { onMounted, useTemplateRef } from 'vue';

import { isPerson, isTable, unassignAllSeats, unassignSeat } from '@/gojs/functions';
import { useGoStore } from '@/store';
import { initDiagram } from '@/gojs/diagramInits';

const emit = defineEmits(['selectionChanged', 'doubleClicked']);

const diagram = useTemplateRef('myDiagram');
const goStore = useGoStore();

onMounted(() => {
  if (diagram.value === null) return;

  // go.Diagram.licenseKey = ...
  const myDiagram = (goStore.diagram = initDiagram(diagram.value));

  myDiagram.doubleClick = (e) => emit('doubleClicked', e);
  myDiagram.addDiagramListener('ChangedSelection', (e) => emit('selectionChanged', e));

  // to simulate a "move" from the Guests diagram, the source Node must be deleted.
  myDiagram.addDiagramListener('ExternalObjectsDropped', (e) => {
    // if any Tables were dropped, don't delete from Guests
    if (!e.subject.any(isTable)) {
      goStore.deleteNodeData(e.subject.first().key, true);
    }
  });

  // put deleted people back in the Guests diagram
  myDiagram.addDiagramListener('SelectionDeleted', (e) => {
    // no-op if deleted by Guests' ExternalObjectsDropped listener
    if ((e.diagram as go.ObjectData)['_disableSelectionDeleted']) return;
    // e.subject is the myDiagram.selection collection
    e.subject.each((n: go.Part) => {
      if (isTable(n)) {
        unassignAllSeats(e.diagram, n.data.guests);
      } else if (isPerson(n)) {
        unassignSeat(e.diagram, n.data);
        const nd = goStore.guests?.model.copyNodeData(n.data);
        if (nd) goStore.createNodeData(nd, true);
      }
    });
  });
});
</script>

<template>
  <div class="h-full w-full p-[1px]">
    <div id="myDiagram" ref="myDiagram" class="h-full w-full select-none"></div>
  </div>
</template>

<style>
/* no focus outline */
#myDiagram canvas {
  outline: none;
}
</style>
