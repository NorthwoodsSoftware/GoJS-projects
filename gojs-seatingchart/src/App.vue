<script setup lang="ts">
import * as go from 'gojs';
import * as Papa from 'papaparse';
import { onMounted, ref } from 'vue';

import MetaTags from './components/MetaTags.vue';
import initialChart from '@/assets/seatingChart.json';
import Diagram from '@/components/Diagram.vue';
import FileModal from '@/components/FileModal.vue';
import Guests from '@/components/Guests.vue';
import EditorSlideover from '@/components/EditorSlideover.vue';
import GuestCreator from '@/components/GuestCreator.vue';
import TableEditor from '@/components/TableEditor.vue';
import ThemeSwapper from '@/components/ThemeSwapper.vue';
import Toolbar from '@/components/Toolbar.vue';
import { useEditorStore, useGoStore } from '@/store';
import { positionPeopleAtSeats } from '@/gojs/functions';

const editorStore = useEditorStore();
const goStore = useGoStore();

// Keyboard shortcuts
defineShortcuts({
  e: () => {
    if (editorStore.part !== null) editorStore.open = !editorStore.open;
  },
  ctrl_o: () => {
    jsonModalOpen.value = true;
  },
  ctrl_s: () => {
    goStore.exportJson();
  },
  '=': () => {
    goStore.diagram?.commandHandler.increaseZoom();
  },
  '-': () => {
    goStore.diagram?.commandHandler.decreaseZoom();
  },
  0: () => {
    goStore.diagram?.commandHandler.zoomToFit();
  },
  l: () => {
    goStore.toggleReadOnly();
  }
});

// Selection editor
function selectionChanged(e: go.DiagramEvent) {
  editorStore.$patch((state) => {
    if (e.subject.first() === null) state.open = false;
    state.part = e.subject.first();
  });
}

// Add guests modal
const guestModalOpen = ref(false);
function addGuests(names: { name: string }[]) {
  for (const n of names) {
    if (n.name) goStore.createNodeData(n, true);
  }
  guestModalOpen.value = false;
}

// Add table modal
const tableModalOpen = ref(false);
let tableLoc = '0 0';
function diagramDoubleClicked(e: go.InputEvent) {
  tableLoc = go.Point.stringify(e.documentPoint);
  tableModalOpen.value = true;
}

function addTable(table: { category: string; name: string; seats: number }) {
  goStore.createNodeData({ ...table, loc: tableLoc });
  tableModalOpen.value = false;
}

// Import guest list modal
const importGuestsModalOpen = ref(false);
function onGuestFileSelected(files: File[] | null) {
  if (!files) return;
  Papa.parse(files[0], {
    complete: (results: { data: string[][]; meta: { aborted: boolean } }) => {
      goStore.importGuestList(results.data);
      if (!results.meta.aborted) importGuestsModalOpen.value = false;
    }
  });
}

// Import JSON modal
const jsonModalOpen = ref(false);
function onJsonFileSelected(files: File[] | null) {
  if (!files) return;
  goStore.importJson(files[0]);
  jsonModalOpen.value = false;
}

// add inital data to models, position seated guests
onMounted(() => {
  const model = goStore.diagram?.model;
  const guestsModel = goStore.guests?.model;
  if (!model || !guestsModel) return;

  const { diagram: mnda, guests: gnda } = initialChart;
  model.commit((m) => (m.nodeDataArray = mnda), null);
  guestsModel.commit((m) => (m.nodeDataArray = gnda), null);
  goStore.diagram?.commit((d) => {
    d.nodes.each((n) => {
      if (!!n.category) positionPeopleAtSeats(n);
    });
  }, null);
  goStore.diagram?.zoomToFit();
});
</script>

<template>
  <MetaTags
    title="GoJS Seating Chart (with Vue) | GoJS Diagramming Library"
    description="Demo of a seating chart app using Vue and GoJS. Create and edit custom tables with a simple UI then drag and drop guests into seats."
    project-title="gojs-seatingchart"
    screenshot="seatingchatvue.png"
    application-category="BusinessApplication"
    />
  <UApp>
    <div class="container mx-auto h-dvh flex flex-col p-2">
      <div class="flex items-center justify-between">
        <h1 class="font-medium text-lg">GoJS Seating Chart (in Vue)</h1>
        <div class="flex">
          <UTooltip text="Import seating chart" :kbds="['ctrl', 'o']" :ui="{ kbdsSize: 'md' }">
            <UButton
              label="Import"
              icon="i-lucide-file-up"
              color="secondary"
              variant="ghost"
              class="hidden md:inline-flex"
              @click="jsonModalOpen = true" />
          </UTooltip>
          <UTooltip text="Export seating chart" :kbds="['ctrl', 's']" :ui="{ kbdsSize: 'md' }">
            <UButton
              label="Export"
              icon="i-lucide-file-down"
              color="primary"
              variant="ghost"
              class="hidden md:inline-flex"
              @click="goStore.exportJson" />
          </UTooltip>
          <ThemeSwapper />
          <UTooltip text="View on GitHub">
            <UButton
              to="https://github.com/NorthwoodsSoftware/GoJS"
              target="_blank"
              icon="i-simple-icons:github"
              color="neutral"
              variant="ghost" />
          </UTooltip>
          <UDropdownMenu
            class="inline-flex md:hidden"
            :ui="{ content: 'z-50' }"
            :items="[
              [
                {
                  label: 'Add a table',
                  icon: 'i-lucide-plus',
                  onSelect: () => (tableModalOpen = true)
                },
                {
                  label: 'Add guests',
                  icon: 'i-lucide-user-plus',
                  onSelect: () => (guestModalOpen = true)
                }
              ],
              [
                {
                  label: 'Import guest list',
                  icon: 'i-lucide-users',
                  onSelect: () => (importGuestsModalOpen = true)
                },
                {
                  label: 'Import seating chart',
                  icon: 'i-lucide-file-up',
                  onSelect: () => (jsonModalOpen = true)
                },
                {
                  label: 'Export seating chart',
                  icon: 'i-lucide-file-down',
                  onSelect: () => goStore.exportJson()
                }
              ]
            ]">
            <UButton icon="i-lucide-menu" color="neutral" variant="ghost" />
          </UDropdownMenu>
        </div>
      </div>

      <div class="min-h-96 flex flex-col flex-grow gap-2 md:flex-row">
        <div class="flex flex-row flex-none h-64 w-full gap-2 md:flex-col md:h-full md:w-64">
          <div class="flex-grow border border-(--ui-border-accented) rounded-[calc(var(--ui-radius)*1.5)]">
            <Guests @selection-changed="selectionChanged" />
          </div>
          <UButton
            label="Add a table"
            leading-icon="i-lucide-plus"
            class="hidden md:inline-flex"
            @click="tableModalOpen = true" />
          <UButton
            label="Add guests"
            leading-icon="i-lucide-user-plus"
            class="hidden md:inline-flex"
            @click="guestModalOpen = true" />
          <UButton
            label="Import guest list"
            leading-icon="i-lucide-users"
            class="hidden md:inline-flex"
            @click="importGuestsModalOpen = true" />
        </div>
        <div
          class="relative flex-grow h-full w-full border border-(--ui-border-accented) rounded-[calc(var(--ui-radius)*1.5)]">
          <Diagram @selection-changed="selectionChanged" @double-clicked="diagramDoubleClicked" />
          <Toolbar class="absolute right-4 bottom-4 z-40" />
        </div>
      </div>

      <div class="hidden my-2 p-2 md:block">
        <p>
          This GoJS Seating Chart sample demonstrates the
          <a href="https://gojs.net/latest/index.html" target="_blank">GoJS</a> diagramming library used in a simple Vue
          app. The demo contains:
        </p>
        <ul class="list-disc list-inside">
          <li>A guest diagram to drag and drop guests to the main diagram.</li>
          <li>A double click handler to add tables.</li>
          <li>
            An editor box to make updates to the current selection, opened by pressing <UKbd>E</UKbd> or double clicking
            a table or guest.
          </li>
          <li>Import and export of model JSON.</li>
        </ul>
        <p>
          <a href="https://gojs.net" class="underline">gojs.net</a> -
          <a href="https://gojs.net/latest/samples/" class="underline">see all GoJS samples</a>
        </p>
      </div>
    </div>
    <EditorSlideover />
    <GuestCreator v-model:open="guestModalOpen" @submitted="addGuests" />
    <UModal
      v-model:open="tableModalOpen"
      title="Add a table"
      description="Select table options to add a table to the diagram."
      class="z-50">
      <template #body>
        <TableEditor mode="create" @submitted="addTable" />
      </template>
    </UModal>
    <FileModal
      v-model:open="importGuestsModalOpen"
      title="Import guest list"
      description="Select a .csv, .txt, or .text file to import a new guest list. The file should contain each guest on a separate line."
      :data-types="['text/csv', 'text/plain']"
      @file-chosen="onGuestFileSelected">
      <template #footer>
        <UAlert
          color="warning"
          variant="subtle"
          title="Heads up! This will replace all current guests, seated or not."
          icon="i-lucide-user-x" />
      </template>
    </FileModal>
    <FileModal
      v-model:open="jsonModalOpen"
      title="Import seating chart"
      description="Select a .json file to import a saved seating chart."
      :data-types="['application/json']"
      @file-chosen="onJsonFileSelected" />
  </UApp>
</template>
