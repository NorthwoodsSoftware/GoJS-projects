<!--
  This component creates a vertical list of ObjectEditorRowItems to edit a given list of Pairs.
  This is used by ObjectModal to create the editor. It is also used in ObjectEditorRowItem to make
  the nested and collapsable editors for object/array row items.
-->

<script lang="ts">
  import { onMount } from 'svelte';

  import ObjectEditorRowItem from './ObjectEditorRowItem.svelte';
  import ButtonPopup from './ButtonPopup.svelte';
  import type { Key, KeyInputBinding } from '$lib/types';
  import { getType } from '$lib/utils';
  import { type PairList, Pair } from '$lib/dataManager.svelte';

  interface Props {
    pairList: PairList;
  }

  let { pairList }: Props = $props();

  let containerDiv: HTMLDivElement = $state(document.createElement('div'));

  function addNewProp() {
    let newKey: Key;
    const value = 'value';

    if (getType(pairList) === 'object') {
      newKey = 'key';

      // prevent collision
      if (pairList.findPairByKey(newKey) !== undefined) {
        let n = -1;
        while (pairList.findPairByKey(newKey + (++n + '')));
        newKey += n + '';
      }

      pairList.push(new Pair(newKey, value, pairList));
    } else {
      // array
      pairList.push(new Pair(-1, value, pairList));
    }
  }

  // if more than one input has the same value then highlight them red
  const keyInputs: KeyInputBinding[] = [];
  const keyChanged = () => {
    const keyMap = new Map<Key, KeyInputBinding[]>();

    // collect all the current input box keys
    keyInputs.forEach(obj => {
      const key = obj.input.value;
      if (keyMap.has(key)) {
        keyMap.get(key)?.push(obj);
      } else {
        keyMap.set(key, [obj]);
      }
    });

    // check if any lists have length > 1, if they do highlight them all red.
    // if they were red, but now have length === 1, update that Pair.key
    keyMap.entries().forEach(([key, inputBindings]) => {
      if (inputBindings.length === 1) {
        const bind = inputBindings[0];
        if (bind.pair.key !== key) {
          bind.input.style.borderColor = '';

          // if there a Pair is currently using this key then temporarily change it
          const parent = bind.pair.parent;
          const overlap = parent?.findPairByKey(key);
          if (overlap && parent) {
            let unique = -1;
            while (parent.has(unique, false)) unique--;
            overlap.updateKey(unique + '');
          }

          bind.pair.updateKey(key);
        }
      } else {
        inputBindings.forEach(bind => {
          bind.input.style.borderColor = 'var(--color-rose-400)';
        });
      }
    });
  };
</script>

<div
  bind:this={containerDiv}
  class="border-ui-secondary m-3 mr-0 flex flex-col gap-1 rounded-sm border p-2"
>
  <!-- edit existing properties -->
  {#each pairList as pair}
    <ObjectEditorRowItem {pair} {containerDiv} {keyInputs} {keyChanged} />
  {/each}

  <!-- add new property -->
  <ButtonPopup
    onClick={() => addNewProp()}
    isSquare={false}
    trigger={'hover'}
    style="flex-grow: 1; margin-top: 0.5rem"
    baseColor="var(--ui-tertiary)"
    hoverColorLightMode="var(--ui-secondary)"
    hoverColorDarkMode="var(--ui-secondary)"
    buttonStyle={'border-radius: 4px; width: 100%'}
  >
    {#snippet button()}
      <div class="m-0.75 flex flex-row place-content-between">
        <span class="ml-1 font-[300] text-nowrap"
          >{pairList.isArray ? 'Add Item' : 'Add Key/Value Pair'}</span
        >
        <svg
          class="m-0.5"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="var(--ui-text)"
          viewBox="0 0 256 256"
          ><path
            d="M208,112H48a16,16,0,0,0-16,16v24a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V128A16,16,0,0,0,208,112Zm0,40H48V128H208v24Zm0-112H48A16,16,0,0,0,32,56V80A16,16,0,0,0,48,96H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,40H48V56H208V80ZM160,216a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V224H104a8,8,0,0,1,0-16h16V192a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,216Z"
          ></path></svg
        >
      </div>
    {/snippet}
  </ButtonPopup>
</div>
