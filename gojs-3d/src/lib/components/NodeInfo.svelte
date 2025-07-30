<script lang="ts">
  import go from 'gojs';
  import type { NodeData } from '$lib/types';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  interface Props {
    selection: string | null;
    model: go.GraphLinksModel;
  }

  let { selection, model }: Props = $props();

  let selectedData = writable<go.ObjectData | null>(null);

  let selectionEntries = $derived.by(() => {
    if ($selectedData !== null) {
      return Object.entries($selectedData);
    } else {
      return [];
    }
  });

  // update model data property
  function propertyChanged(event: Event, data: go.ObjectData, prop: string) {
    if (!model) return;

    model.startTransaction("infoChange");
    model.setDataProperty(data, prop, (event?.target as HTMLInputElement).value);
    model.commitTransaction("infoChange");
  }

  // update model data of an element in an array
  function propertyChangedArray(event: Event, data: go.ObjectData, prop: string, index: number) {
    if (!model) return;

    model.startTransaction("infoChange");

    const newVal = (event?.target as HTMLInputElement).value;
    const arr = [... data[prop]];
    arr[index] = typeof arr[index] == 'number' ? parseFloat(newVal) : newVal;

    model.setDataProperty(data, prop, arr);
    model.commitTransaction("infoChange");
  }

  onMount(() => {
    // console.log(model);
    const listenProps = new Set(['loc', 'size', 'color', 'nodeDataArray', 'FinishedUndo', 'FinishedRedo']);

    model?.addChangedListener((e: go.ChangedEvent) => {
      const prop = e.propertyName as string;
      const data = e.object as NodeData;
      if (!listenProps.has(prop) || !data) return;

      if (selection) {
        selectedData.set(model.findNodeDataForKey(selection) ?? {});
      }
    });
  });

  $effect(() => {
    if (!selection) selectedData.set(null);
    else selectedData.set(model.findNodeDataForKey(selection));
  });
</script>

<div class="flex h-full flex-col">
  <div class="border-b-2 bg-blue-300 border-blue-400 px-1 font-mono text-xs py-2 text-center">Selected Node Information</div>

  <div class="mx-2 mt-3">
    <div class="mx-2 font-mono text-sm grid grid-flow-row grid-cols-[auto_1fr] gap-y-5 gap-x-2">
      {#each selectionEntries as [key, value]}
        {#if key == "color"}
          <div>{key}</div>
          <input {value} onchange={(event) => propertyChanged(event, $selectedData!, key)}/>
        {:else if (Array.isArray(value)) && (value?.length >= 3)}
          <div>{key}</div>
          <div class="flex flex-wrap gap-1">
            {#each value as v, i}
              <div class="flex items-center">
                {['X', 'Y', 'Z'][i]}
                <input class=" ml-1 min-w-[30px]" value={v} onchange={(event) => propertyChangedArray(event, $selectedData!, key, i)}/>
              </div>
            {/each}
          </div>
        {:else}
          <div>{key}</div>
          <input disabled {value} />
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  input {
    border: 2px solid slateblue;
    border-radius: 6px;
    padding-left: 6px;
    width: 100%;
  }

  input:disabled {
    background-color: rgba(0,0,0,0.15);
  }
</style>