<!--
  This component is for editing a single key/value pair in the data. The object editor component
  will create a vertical list of these.
-->

<script lang="ts">
  import { onMount, mount, onDestroy, unmount } from 'svelte';
  import ButtonPopup from './ButtonPopup.svelte';
  import ObjectEditor from './ObjectEditor.svelte';
  import ObjectEditorRowItem from './ObjectEditorRowItem.svelte';
  import PopupBox from './PopupBox.svelte';

  import type { ValueTypes, Key, KeyInputBinding } from '$lib/types';
  import { PairList, type Pair } from '$lib/dataManager.svelte';
  import { getType } from '$lib/utils';
  import { animationDurationFast, typeColorMap } from '$lib/constants';
  import BooleanSelector from './BooleanSelector.svelte';
  interface Props {
    pair: Pair;
    containerDiv: HTMLDivElement; // div to contain value type selector

    // When regenerating an existing rowItem, maintain its sub menu state
    isCollapsed?: boolean;
    keyInputs: KeyInputBinding[];
    keyChanged: () => void;
  }

  let { pair, containerDiv, isCollapsed = true, keyInputs, keyChanged }: Props = $props();

  const typeSVGMap = {
    string:
      'M87.24,52.59a8,8,0,0,0-14.48,0l-64,136a8,8,0,1,0,14.48,6.81L39.9,160h80.2l16.66,35.4a8,8,0,1,0,14.48-6.81ZM47.43,144,80,74.79,112.57,144ZM200,96c-12.76,0-22.73,3.47-29.63,10.32a8,8,0,0,0,11.26,11.36c3.8-3.77,10-5.68,18.37-5.68,13.23,0,24,9,24,20v3.22A42.76,42.76,0,0,0,200,128c-22.06,0-40,16.15-40,36s17.94,36,40,36a42.73,42.73,0,0,0,24-7.25,8,8,0,0,0,16-.75V132C240,112.15,222.06,96,200,96Zm0,88c-13.23,0-24-9-24-20s10.77-20,24-20,24,9,24,20S213.23,184,200,184Z',
    number:
      'M224,88H175.4l8.47-46.57a8,8,0,0,0-15.74-2.86l-9,49.43H111.4l8.47-46.57a8,8,0,0,0-15.74-2.86L95.14,88H48a8,8,0,0,0,0,16H92.23L83.5,152H32a8,8,0,0,0,0,16H80.6l-8.47,46.57a8,8,0,0,0,6.44,9.3A7.79,7.79,0,0,0,80,224a8,8,0,0,0,7.86-6.57l9-49.43H144.6l-8.47,46.57a8,8,0,0,0,6.44,9.3A7.79,7.79,0,0,0,144,224a8,8,0,0,0,7.86-6.57l9-49.43H208a8,8,0,0,0,0-16H163.77l8.73-48H224a8,8,0,0,0,0-16Zm-76.5,64H99.77l8.73-48h47.73Z',
    boolean:
      'M174.63,81.35a80,80,0,1,0-93.28,93.28,80,80,0,1,0,93.28-93.28ZM224,160c0,1.52-.07,3-.18,4.51l-50-50A80.14,80.14,0,0,0,176,98,63.81,63.81,0,0,1,224,160Zm-77.4-2.09,52.61,52.62A64,64,0,0,1,183,219.7l-51.86-51.86A80.5,80.5,0,0,0,146.6,157.91Zm11.31-11.31a80.5,80.5,0,0,0,9.93-15.44L219.7,183a64,64,0,0,1-9.17,16.19ZM32,96a64,64,0,1,1,64,64A64.07,64.07,0,0,1,32,96ZM98,176a80.14,80.14,0,0,0,16.5-2.13l50,50c-1.49.11-3,.18-4.51.18A63.81,63.81,0,0,1,98,176Z',
    null: 'M198.24,62.63l15.68-17.25a8,8,0,0,0-11.84-10.76L186.4,51.86A95.95,95.95,0,0,0,57.76,193.37L42.08,210.62a8,8,0,1,0,11.84,10.76L69.6,204.14A95.95,95.95,0,0,0,198.24,62.63ZM48,128A80,80,0,0,1,175.6,63.75l-107,117.73A79.63,79.63,0,0,1,48,128Zm80,80a79.55,79.55,0,0,1-47.6-15.75l107-117.73A79.95,79.95,0,0,1,128,208Z',
    array:
      'M224,128a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM104,72H216a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16ZM216,184H104a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM43.58,55.16,48,52.94V104a8,8,0,0,0,16,0V40a8,8,0,0,0-11.58-7.16l-16,8a8,8,0,0,0,7.16,14.32ZM79.77,156.72a23.73,23.73,0,0,0-9.6-15.95,24.86,24.86,0,0,0-34.11,4.7,23.63,23.63,0,0,0-3.57,6.46,8,8,0,1,0,15,5.47,7.84,7.84,0,0,1,1.18-2.13,8.76,8.76,0,0,1,12-1.59A7.91,7.91,0,0,1,63.93,159a7.64,7.64,0,0,1-1.57,5.78,1,1,0,0,0-.08.11L33.59,203.21A8,8,0,0,0,40,216H72a8,8,0,0,0,0-16H56l19.08-25.53A23.47,23.47,0,0,0,79.77,156.72Z',
    object:
      'M43.18,128a29.78,29.78,0,0,1,8,10.26c4.8,9.9,4.8,22,4.8,33.74,0,24.31,1,36,24,36a8,8,0,0,1,0,16c-17.48,0-29.32-6.14-35.2-18.26-4.8-9.9-4.8-22-4.8-33.74,0-24.31-1-36-24-36a8,8,0,0,1,0-16c23,0,24-11.69,24-36,0-11.72,0-23.84,4.8-33.74C50.68,38.14,62.52,32,80,32a8,8,0,0,1,0,16C57,48,56,59.69,56,84c0,11.72,0,23.84-4.8,33.74A29.78,29.78,0,0,1,43.18,128ZM240,120c-23,0-24-11.69-24-36,0-11.72,0-23.84-4.8-33.74C205.32,38.14,193.48,32,176,32a8,8,0,0,0,0,16c23,0,24,11.69,24,36,0,11.72,0,23.84,4.8,33.74a29.78,29.78,0,0,0,8,10.26,29.78,29.78,0,0,0-8,10.26c-4.8,9.9-4.8,22-4.8,33.74,0,24.31-1,36-24,36a8,8,0,0,0,0,16c17.48,0,29.32-6.14,35.2-18.26,4.8-9.9,4.8-22,4.8-33.74,0-24.31,1-36,24-36a8,8,0,0,0,0-16Z'
  };

  const typeInputTypeMap = {
    string: 'text',
    number: 'text',
    boolean: '',
    null: 'text',
    array: '',
    object: ''
  };

  const expandSVG =
    'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z';
  const collapseSVG =
    'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z';

  const deleteSVG =
    'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z';

  let rowItemDiv: HTMLDivElement | null = $state(null);
  let svgPath: SVGPathElement = $state(null);
  let subEditor: HTMLDivElement | null = null;

  let keyInput: HTMLInputElement;
  let _prevValue: Key;

  const desiredWidth = '12.5rem';

  let valueType = $derived.by(() => {
    return getType(pair.value);
  });

  function submitValue(element: HTMLInputElement, value: any, valueType: ValueTypes) {
    // Convert value to the correct type based on valueType
    if (valueType === 'number') {
      value = Number(value);

      // validate that the number is valid
      if (isNaN(value)) {
        element.setCustomValidity('not a number');
        return;
      } else {
        element.setCustomValidity('');
      }
    } else if (valueType === 'boolean') {
    } else if (valueType === 'null') value = null;
    else value = String(value);

    pair.value = value;
  }

  function changeValueType(newType: ValueTypes) {
    let value = pair.value;

    if (valueType === newType) return;

    if (newType === 'number') value = Number(value) || 0;
    else if (newType === 'boolean') value = value === 'true';
    else if (newType === 'null') value = null;
    else if (newType === 'string') {
      if (valueType !== 'object' && valueType !== 'array') value = String(value);
      else value = '';
    } else if (newType === 'array') {
      if (value instanceof PairList) {
        value.isArray = true;
      } else {
        value = new PairList(true);
      }
    } else {
      if (value instanceof PairList) {
        value.isArray = false;
      } else {
        value = new PairList(false);
      }
    }

    pair.value = value;

    // rebuild row
    if (!rowItemDiv) throw new Error('rowItemDiv is undefined');
    if (!rowItemDiv.parentElement) throw new Error('tried rebuilding node which has now parent');
    mount(ObjectEditorRowItem, {
      target: rowItemDiv.parentElement,
      anchor: rowItemDiv,
      intro: false,
      props: {
        pair,
        containerDiv,
        isCollapsed: pair.value instanceof PairList ? isCollapsed : true,
        keyInputs,
        keyChanged
      }
    });

    destroy();
  }

  function expandButton(skipAnimation: boolean = false) {
    if (!rowItemDiv) throw new Error('rowItemDiv is undefined');
    if (svgPath.getAttribute('d') === collapseSVG) {
      // collapse
      isCollapsed = true;
      svgPath.setAttribute('d', expandSVG);

      if (subEditor) {
        // start animation

        const onFinish = () => {
          if (!subEditor) return;
          subEditor.hidden = true;
        };
        if (skipAnimation) {
          onFinish();
        } else {
          const originalHeight = subEditor.getBoundingClientRect().height;
          const animation = subEditor.animate(
            [
              { maxHeight: `${originalHeight}px`, overflow: 'hidden' },
              { maxHeight: '0px', overflow: 'hidden' }
            ],
            {
              duration: animationDurationFast,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
            }
          );

          animation.onfinish = onFinish;
        }
      }
    } else {
      // expand
      isCollapsed = false;
      if (!subEditor) {
        // create subtree on first expand
        const subContainer = document.createElement('div');
        subEditor = subContainer;
        mount(ObjectEditor, {
          target: subContainer,
          props: { pairList: pair.value }
        });

        rowItemDiv.insertAdjacentElement('afterend', subContainer);
      }

      subEditor.hidden = false;
      svgPath.setAttribute('d', collapseSVG);

      // start animation
      if (!skipAnimation) {
        const originalHeight = subEditor.getBoundingClientRect().height;
        subEditor.animate(
          [
            { maxHeight: '0px', overflow: 'hidden' },
            { maxHeight: `${originalHeight}px`, overflow: 'hidden' }
          ],
          {
            duration: animationDurationFast,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
          }
        );
      }
    }
  }

  function deleteKey() {
    pair.parent?.remove(pair);
    if (subEditor) subEditor.remove();
  }

  onMount(() => {
    if (!isCollapsed && pair.value instanceof PairList) {
      expandButton(true);
    }

    keyInputs.push({
      input: keyInput,
      pair: pair
    });
  });

  function destroy() {
    subEditor?.remove();
    if (rowItemDiv) rowItemDiv.remove();

    for (let i = 0; i < keyInputs.length; i++) {
      if (keyInputs[i].input === keyInput) {
        keyInputs.splice(i, 1);
        break;
      }
    }
  }

  onDestroy(destroy);
</script>

{#snippet simpleButton(text: string, icon: string, fill: string, onclick: Function)}
  <button
    class="flex w-full flex-row place-content-between gap-1 rounded px-1.5 py-1 hover:bg-[rgba(0,0,0,0.12)]"
    onclick={() => onclick()}
  >
    <svg
      class="my-0.5 inline-block"
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      {fill}
      viewBox="0 0 256 256"
    >
      <path d={icon}></path>
    </svg>
    <span>{text}</span>
  </button>
{/snippet}

{#snippet typeButton(valueType: ValueTypes)}
  {@render simpleButton(
    valueType,
    (typeSVGMap as any)?.[valueType] ?? typeSVGMap.object,
    (typeColorMap as any)?.[valueType] ?? 'black',
    () => {
      changeValueType(valueType);
    }
  )}
{/snippet}

<!-- row item -->
<div bind:this={rowItemDiv} class="rowItem flex flex-row gap-8">
  <!-- left column / key -->
  <!-- <label class="font-bold m-auto">{key}</label> -->
  <input
    class="border-ui-tertiary w-[6rem] place-self-end rounded border p-1 invalid:border-rose-500 focus:outline-none"
    type="text"
    value={pair.key}
    bind:this={keyInput}
    disabled={typeof pair.key === 'number'}
    onbeforeinput={() => {
      _prevValue = keyInput.value;
    }}
    oninput={() => {
      keyChanged();
    }}
  />

  <!-- right column / value -->
  <div class="flex grow flex-row justify-end gap-2">
    <!-- value type button -->
    <ButtonPopup
      textColor="black"
      trigger="click"
      isSquare={true}
      style="width:fit-content; height:fit-content; margin: auto; margin-right: 0px; margin-left: 0px;"
      baseColor="var(--ui-button-bg)"
      buttonStyle="border-radius: 4px;"
    >
      <PopupBox
        boundingXDiv={containerDiv}
        boundingYDiv={(document.getElementById('editorRootDiv') as HTMLDivElement) ?? null}
        desiredSpot="bottom"
      >
        <div class="flex h-full w-full flex-col">
          <!-- make a button for each type -->
          {#each Object.keys(typeSVGMap) as Array<ValueTypes> as t}
            {@render typeButton(t)}
          {/each}
          <!-- make a delete button -->
          <div class="bg-ui2-secondary mx-1 my-0.5 h-[1px] flex-none"></div>
          {@render simpleButton('Delete', deleteSVG, 'var(--color-rose-400)', deleteKey)}
        </div>
      </PopupBox>
      {#snippet button()}
        <svg
          class="m-0.5"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          fill={(typeColorMap as any)?.[valueType] ?? 'black'}
          viewBox="0 0 256 256"
        >
          <path d={(typeSVGMap as any)?.[valueType] ?? typeSVGMap.object}></path>
        </svg>
      {/snippet}
    </ButtonPopup>
    <!-- value or expand button -->
    {#if valueType === 'object' || valueType === 'array'}
      <ButtonPopup
        onClick={() => expandButton()}
        isSquare={false}
        trigger={'hover'}
        style={`flex-grow: 1; max-width: ${desiredWidth};`}
        buttonStyle={`width: 100%; border-radius: 4px; border: 1px solid ${(typeColorMap as any)?.[valueType] ?? 'black'}`}
      >
        {#snippet button()}
          <div class="flex flex-row place-content-between">
            <span class="ml-1 font-normal text-nowrap" style="color: {typeColorMap[valueType]};"
              >{pair.value.length}
              {valueType === 'array' ? 'item' : 'key'}{pair.value.length === 1 ? '' : 's'}</span
            >
            <svg
              class="m-0.5"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="var(--ui-text)"
              viewBox="0 0 256 256"><path bind:this={svgPath} d={expandSVG}></path></svg
            >
          </div>
        {/snippet}
      </ButtonPopup>
    {:else if valueType === 'boolean'}
      <BooleanSelector
        style={`flex-grow: 1; max-width: ${desiredWidth}`}
        value={pair.value}
        oninput={e =>
          submitValue(
            e.currentTarget as HTMLInputElement,
            e.currentTarget.classList.contains('checked'),
            valueType
          )}
      ></BooleanSelector>
    {:else}
      <div class="m-0 flex grow p-0" style={`max-width: ${desiredWidth}`}>
        <input
          class="border-ui-quaternary m-0 w-full rounded border pl-1 invalid:border-red-400 focus:outline-none"
          type={(typeInputTypeMap as any)?.[valueType] ?? 'text'}
          value={pair.value + ''}
          step="any"
          disabled={pair.value === null}
          oninput={e => submitValue(e.currentTarget, e.currentTarget.value, valueType)}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  input:disabled {
    filter: brightness(75%);
    background-color: rgba(0, 0, 0, 0.04);
    /* cursor: not-allowed; */
  }
</style>
