<script setup lang="ts">
import * as go from 'gojs';
import { onMounted, useTemplateRef } from 'vue';

import { initGuests } from '@/gojs/diagramInits';
import { isPerson, isTable, unassignSeat } from '@/gojs/functions';
import { useGoStore } from '@/store';

const emit = defineEmits(['selectionChanged']);

const diagram = useTemplateRef('myGuests');
const goStore = useGoStore();

onMounted(() => {
  if (diagram.value === null) return;

  const myGuests = (goStore.guests = initGuests(diagram.value));

  myGuests.addDiagramListener('ChangedSelection', (e) => emit('selectionChanged', e));

  // To simulate a "move" from the main diagram back to the Guests diagram, the source Node must be deleted.
  myGuests.addDiagramListener('ExternalObjectsDropped', (e) => {
    const myDiagram = goStore.diagram as go.Diagram;
    if (!myDiagram) return;
    // e.subject is the myGuests.selection collection
    // if the user dragged a Table to the myGuests diagram, cancel the drag
    if (e.subject.any(isTable)) {
      myDiagram.currentTool.doCancel();
      myGuests.currentTool.doCancel();
      return;
    }
    myDiagram.selection.each((n) => {
      if (isPerson(n)) unassignSeat(myDiagram, n.data);
    });
    (myDiagram as go.ObjectData)['_disableSelectionDeleted'] = true;
    myDiagram.commandHandler.deleteSelection();
    (myDiagram as go.ObjectData)['_disableSelectionDeleted'] = false;
    myGuests.selection.each((n) => {
      if (isPerson(n)) unassignSeat(myGuests, n.data);
    });
  });
});
</script>

<template>
  <div class="flex w-full h-full flex-col">
    <div class="font-medium border-b border-(--ui-border-accented) px-3">Guests</div>
    <div class="w-full flex-1 flex-grow">
      <div id="myGuests" ref="myGuests" class="w-full h-full" />
    </div>
  </div>
</template>

<style>
/* no focus outline */
#myGuests canvas {
  outline: none;
}
</style>
