import * as go from 'gojs';
import { defineStore } from 'pinia';
import { ref, shallowRef, triggerRef } from 'vue';
import { positionPeopleAtSeats } from './gojs/functions';
import { useObjectUrl } from '@vueuse/core';

export const useEditorStore = defineStore('editor', () => {
  const open = ref<boolean>(false);
  const part = shallowRef<go.Part | null>(null);
  return { open, part };
});

export const useGoStore = defineStore('go', () => {
  const diagram = shallowRef<go.Diagram | null>(null);
  const guests = shallowRef<go.Diagram | null>(null);

  function createNodeData(data: go.ObjectData, isGuests = false) {
    const model = isGuests ? guests.value?.model : diagram.value?.model;
    if (!model) return;
    model.commit((m) => {
      m.addNodeData(data);
    }, 'create node data');
  }

  function updateNodeData(key: go.Key, data: go.ObjectData, isGuests = false) {
    const dia = isGuests ? guests.value : diagram.value;
    const model = dia?.model;
    if (!model) return;
    const node = dia.findNodeForKey(key);
    if (!node) return;
    model.commit((m) => {
      m.assignAllDataProperties(node.data, data);
    }, 'update node data');
    // if this is a table, ensure guests are positioned properly as seats could have changed
    if (!isGuests && node.category) dia.commit(() => positionPeopleAtSeats(node), null);
  }

  function deleteNodeData(key: go.Key, isGuests = false) {
    const model = isGuests ? guests.value?.model : diagram.value?.model;
    if (!model) return;
    const nd = model.findNodeDataForKey(key);
    if (!nd) return;
    model.commit((m) => {
      m.removeNodeData(nd);
    }, 'delete node data');
  }

  function importGuestList(data: string[][]) {
    const model = diagram.value?.model;
    const guestsModel = guests.value?.model;
    if (!model || !guestsModel) return;

    // clear all guests from both models, but leave tables intact
    const mnda = model.nodeDataArray.filter((nd) => !!nd.category);
    const gnda: go.ObjectData[] = [];
    // just take the first entry from each line of the file
    for (const arr of data) {
      if (arr[0]) gnda.push({ name: arr[0] });
    }
    model.commit((m) => (m.nodeDataArray = mnda), 'replace node data array');
    guestsModel.commit((m) => (m.nodeDataArray = gnda), 'replace node data array');
  }

  function toggleReadOnly() {
    if (!diagram.value) return;
    diagram.value.commit((d) => {
      d.isReadOnly = !d.isReadOnly;
    }, null);
    triggerRef(diagram);
  }

  function importJson(file: File) {
    const model = diagram.value?.model;
    const guestsModel = guests.value?.model;
    if (!model || !guestsModel) return;

    // Read the file
    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      if (!json) return;
      // parse JSON file, update model arrays, position seated guests
      const { diagram: mnda, guests: gnda } = JSON.parse(json);
      model.commit((m) => (m.nodeDataArray = mnda), null);
      guestsModel.commit((m) => (m.nodeDataArray = gnda), null);
      diagram.value?.commit((d) => {
        d.nodes.each((n) => {
          if (!!n.category) positionPeopleAtSeats(n);
        });
      }, null);
      diagram.value?.zoomToFit();
    };
    reader.onerror = () => {
      console.error('Error reading the file. Please try again.', 'error');
    };
    reader.readAsText(file);
  }

  function exportJson() {
    const model = diagram.value?.model;
    const guestsModel = guests.value?.model;
    if (!model || !guestsModel) return;

    // pull out just the node data arrays from model JSON
    let json = model.toJson();
    const mnda = JSON.parse(json).nodeDataArray;
    json = guestsModel.toJson();
    const gnda = JSON.parse(json).nodeDataArray;

    // download as a JSON file
    const blob = new Blob(
      [
        JSON.stringify({
          diagram: mnda,
          guests: gnda
        })
      ],
      { type: 'application/json' }
    );
    const url = useObjectUrl(blob);
    if (url.value === undefined) return;

    const a = document.createElement('a');
    a.download = 'seatingChart';
    a.href = url.value;
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
  }

  return {
    diagram,
    guests,
    createNodeData,
    updateNodeData,
    deleteNodeData,
    importGuestList,
    toggleReadOnly,
    importJson,
    exportJson
  };
});
