<!--
  This component allows for the data to be manipulated in a modal view
-->

<script lang="ts">
  import { onMount, mount } from 'svelte';
  import ButtonPopup from './ButtonPopup.svelte';
  import ObjectEditor from './ObjectEditor.svelte';
  import Modal from './Modal.svelte';

  import type { KeyArray } from '$lib/types';
  import { DataManager, type PairList } from '$lib/dataManager.svelte';
  import PopupBox from './PopupBox.svelte';

  interface Props {
    openModal: Function; // "return" function for opening this modal
    onClose: Function; // call this on close
  }

  let { openModal = $bindable(), onClose }: Props = $props();

  // let openSubModal: Function;
  let bodyDiv: HTMLDivElement;

  let JSONPathDiv: HTMLDivElement;
  let JSONPathCopySVG: SVGPathElement;
  let JSONPathTimeout: NodeJS.Timeout | null = null;

  const copySVG =
    'M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z';
  const confirmSVG =
    'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z';

  let objectKeys: KeyArray = $state([]);
  let modalTitle: string | number = $derived.by(() => {
    let t = objectKeys.at(-1);
    if (typeof t === 'number') t = `${objectKeys.at(-2)} \u2192 ${t}`;
    if (t == null) t = 'Root';
    return t;
  });

  let object: PairList | null = $state(null);

  let isArray: boolean = $state(false);

  function makeSpan(text: string, color?: string) {
    if (color) return `<span style="color: var(${color});">${text}</span>`;
    else return `<span>${text}</span>`;
  }

  function keysToHTML(): string {
    if (objectKeys.length === 0) return makeSpan('$');
    let htmlString = `${makeSpan('$[')}`;

    htmlString += objectKeys
      .map(key => {
        if (typeof key === 'string') {
          return makeSpan(`"${key}"`, '--type-string');
        } else {
          // number
          return makeSpan(`${key}`, '--type-number');
        }
      })
      .join(makeSpan(`][`));

    return htmlString + makeSpan(`]`);
  }

  onMount(() => {
    openModal = (obj: DataManager | PairList, keys: KeyArray) => {
      if (obj instanceof DataManager) object = obj.data;
      else object = obj;
      objectKeys = keys;

      isArray = object?.isArray ?? false;

      [...bodyDiv.children].forEach(c => c.remove());
      mount(ObjectEditor, {
        target: bodyDiv,
        props: { pairList: object }
      });

      openSubModal();

      // when scroll bar on Path, add height to compensate
      const agent = navigator.userAgent.toLowerCase();
      if (agent.includes('gecko') && !agent.includes('like gecko')) {
        requestAnimationFrame(() => {
          if (JSONPathDiv.scrollWidth !== JSONPathDiv.clientWidth) {
            JSONPathDiv.style.paddingBottom = '0.75rem';
          } else {
            JSONPathDiv.style.paddingBottom = '';
          }
        });
      }
    };
  });
</script>

<Modal
  ID="objectEditor"
  bind:openModal
  onClose={() => {
    onClose(object);
  }}
>
  {#snippet header()}
    <pre>{modalTitle}</pre>
    <ButtonPopup
      onClick={() => {
        if (object) {
          object.isArray = !object.isArray;
          isArray = object?.isArray ?? false;

          [...bodyDiv.children].forEach(c => c.remove());
          mount(ObjectEditor, {
            target: bodyDiv,
            props: { pairList: object }
          });
        }
      }}
      trigger="hover"
      baseColor="var(--ui-button-bg)"
      buttonStyle="border-radius: 4px;"
    >
      {#snippet button()}
        <pre class="mx-1">convert to {isArray ? 'object' : 'array'}</pre>
      {/snippet}

      <!-- make invisible for not array instead somehow? -->
      {#if !isArray}
        <PopupBox background={'var(--ui-warning)'} desiredSpot="top">
          <p class="px-1 pt-1 text-black" style="font: normal 400 10pt 'Inconsolata', monospace;">
            This will erase object keys when this menu is closed
          </p>
        </PopupBox>
      {/if}
    </ButtonPopup>
  {/snippet}

  <!-- editor -->
  <div
    bind:this={bodyDiv}
    id="editorRootDiv"
    class="min-h-0 flex-grow overflow-x-hidden overflow-y-auto"
  ></div>
  <!-- other props -->
  <div class="m-3 h-auto shrink-0">
    <code>
      <!-- JSON path -->
      <div
        bind:this={JSONPathDiv}
        class="max-w-[12rem] place-content-center justify-center overflow-x-auto text-[16px] text-nowrap"
      >
        {@html keysToHTML()}
      </div>
      <!-- copy button -->
      <ButtonPopup
        onClick={() => {
          navigator.clipboard.writeText(JSONPathDiv.textContent ?? '');
          JSONPathCopySVG.setAttribute('d', confirmSVG);
          if (JSONPathTimeout !== null) clearTimeout(JSONPathTimeout);
          JSONPathTimeout = setTimeout(() => {
            JSONPathCopySVG.setAttribute('d', copySVG);
          }, 1500);
        }}
        baseColor="var(--color-zinc-400)"
        hoverColorLightMode="var(--color-zinc-500)"
        hoverColorDarkMode="var(--color-zinc-500)"
        buttonStyle="border-radius: 4px;"
        isSquare={true}
        style="height:fit-content;"
      >
        {#snippet button()}
          <div class="m-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              fill="white"
              viewBox="0 0 256 256"><path bind:this={JSONPathCopySVG} d={copySVG}></path></svg
            >
          </div>
        {/snippet}
      </ButtonPopup>
    </code>
  </div>
</Modal>

<style>
  code {
    color: var(--color-neutral-600);
  }
  :global(.dark) code {
    color: var(--ui-text);
  }
</style>
