<script lang="ts">
  // Palette component that manages the furniture pallette and its model
  import { browser } from '$app/environment';
  import { paletteNodeTemplateMap } from '$lib/gojs/FurnitureTemplates';
  import go from 'gojs';
  import { onMount } from 'svelte';
  let myPalette;
  let diagramDiv: HTMLDivElement | undefined = $state();

  const paletteModel = [
    {
      // key: 'generic',
      key: 'pal1',
      caption: 'Generic Object',
      type: 'Round Table',
      shape: 'Rectangle',
      width: 64,
      height: 64,
      notes: ''
    },
    {
      // key: 'roundTable',
      key: 'pal2',
      caption: 'Round Table',
      type: 'Round Table',
      shape: 'Ellipse',
      width: 61,
      height: 61,
      notes: ''
    },
    {
      // key: 'armChair',
      key: 'pal3',
      caption: 'Arm Chair',
      type: 'Arm Chair',
      geoType: 'armChair',
      width: 45,
      height: 45,
      notes: ''
    },
    {
      // key: 'sofaMedium',
      key: 'pal4',
      caption: 'Sofa',
      type: 'Sofa',
      geoType: 'sofaMedium',
      height: 45,
      width: 90,
      notes: ''
    },
    {
      // key: 'sink',
      key: 'pal5',
      caption: 'Sink',
      type: 'Sink',
      geoType: 'sink',
      width: 27,
      height: 27,
      notes: ''
    },
    {
      // key: 'doubleSink',
      key: 'pal6',
      caption: 'Double Sink',
      type: 'Double Sink',
      geoType: 'doubleSink',
      height: 25,
      width: 45,
      notes: ''
    },
    {
      // key: 'toilet',
      key: 'pal7',
      caption: 'Toilet',
      type: 'Toilet',
      geoType: 'toilet',
      width: 25,
      height: 35,
      notes: ''
    },
    {
      // key: 'shower',
      key: 'pal8',
      caption: 'Shower/Tub',
      type: 'Shower/Tub',
      geoType: 'shower',
      width: 45,
      height: 75,
      notes: ''
    },
    {
      // key: 'bed',
      key: 'pal9',
      caption: 'Bed',
      type: 'Bed',
      geoType: 'bed',
      width: 76.2,
      height: 101.6,
      notes: ''
    },
    {
      // key: 'stove',
      key: 'pal10',
      caption: 'Stove',
      type: 'Stove',
      geoType: 'stove',
      width: 50,
      height: 50,
      notes: ''
    },
    {
      // key: 'diningTable',
      key: 'pal11',
      caption: 'Dining Table',
      type: 'Dining Table',
      geoType: 'diningTable',
      width: 125,
      height: 62.5,
      notes: ''
    },
    {
      // key: 'stairs',
      key: 'pal12',
      caption: 'Stairs',
      type: 'Stairs',
      geoType: 'stairs',
      width: 60,
      height: 120,
      notes: ''
    }
  ];

  onMount(() => {
    // go.Diagram.licenseKey = ...
    myPalette = new go.Palette(diagramDiv, {
      'animationManager.isEnabled': false,
      scale: 0.65,
      nodeTemplateMap: paletteNodeTemplateMap,
      model: new go.GraphLinksModel(paletteModel),
      layout: new go.GridLayout({
        wrappingColumn: 2,
        spacing: new go.Size(10, 20)
      })
    });
    // attached only for debug and demonstration:
    if (browser) (window as any).myPalette = myPalette;
  });
</script>

<div class="h-full overflow-hidden">
  <div class="h-full w-full rounded border px-1 py-4">
    <div class="bg-fp-beige h-full w-full" bind:this={diagramDiv}></div>
  </div>
</div>
