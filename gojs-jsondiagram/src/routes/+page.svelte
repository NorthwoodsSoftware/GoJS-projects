<script lang="ts">
  import Diagram from '$lib/components/Diagram.svelte';
  import JSONInfo from '$lib/components/JSONInfo.svelte';
  import TopMenuBar from '$lib/components/TopMenuBar.svelte';
  import ObjectModal from '$lib/components/ObjectModal.svelte';
  import { DataManager } from '$lib/dataManager.svelte';
  import type { KeyArray } from '$lib/types';
  import { onMount } from 'svelte';

  const dataManager = new DataManager();
  let selectedKeys: Array<string | number> | null = [];
  let saveDiagramAs: Function;

  let selectionChangedListener: (keys: KeyArray | null) => void = () => {};
  const selectionChanged = (keys: Array<string | number> | null) => {
    // check if it has really changed, but allow null
    if (keys?.length === selectedKeys?.length && keys && selectedKeys) {
      let nEqual = 0;
      for (let i in keys) {
        if (keys[i] === selectedKeys[i]) nEqual++;
        else break;
      }

      if (nEqual === keys.length) return;
    }

    selectedKeys = keys;
    selectionChangedListener(selectedKeys);
  };

  let openModal = () => {};
  let closeModal = () => {};
</script>

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@200..900&display=swap"
  rel="stylesheet"
/>

<ObjectModal bind:openModal onClose={closeModal} />

<div class="flex h-full flex-col">
  <!-- main -->
  <div id="appContainer" class="flex h-[100vh] flex-col">
    <!-- top bar -->
    <TopMenuBar {dataManager} {saveDiagramAs} />
    <!-- rest of page -->
    <div class="flex grow flex-row items-stretch">
      <div class="bg-ui-primary grid grid-rows-[1fr] gap-2">
        <JSONInfo {dataManager} {selectionChanged} />
      </div>
      <div class="grow">
        <Diagram
          bind:selectionChangedListener
          {dataManager}
          {openModal}
          bind:closeModal
          bind:saveDiagramAs
        ></Diagram>
      </div>
    </div>
  </div>
</div>
