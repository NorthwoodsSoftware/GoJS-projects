<!--
  This component is used to create the bar at the top of the page including the about modal.
-->

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ButtonPopup from '$lib/components/ButtonPopup.svelte';
  import { currentTheme } from '$lib/stores';
  import { type DataManager } from '$lib/dataManager.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import IconParagraph from './IconParagraph.svelte';
  import type go from 'gojs';
  import type { Unsubscriber } from 'svelte/store';

  interface Props {
    dataManager: DataManager;
    saveDiagramAs: Function;
  }

  let { dataManager, saveDiagramAs }: Props = $props();

  let openAboutModal: Function = $state(() => {});
  let unsubscribe: Unsubscriber;

  const sunSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--ui-text)" viewBox="0 0 256 256"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"></path></svg>';
  const moonSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--ui-text)" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path></svg>';
  let lastSavedTime: Date;

  const files = import.meta.glob('/src/sampleJSON/*', {
    query: '?url',
    import: 'default'
  });

  const fnameMap: go.ObjectData = {
    '64KB min': 1,
    '256KB min': 2,
    '1MB min': 3,
    '5MB min': 4
  };

  const dataButtons: Promise<{ content: string; action: Function }[]> = Promise.all(
    Object.entries(files).map(async ([path, importer]) => {
      const url = await importer() as string;
      const fname = path.split('/').at(-1)?.split('.')?.[0]?.replaceAll('-', ' ');
      return {
        content: fname ?? 'unkown',
        action: () => loadFile(url)
      };
    })
  ).then(buttons =>
    buttons.sort((a, b) => {
      // put all the min files after the rest and sort by file size
      if (a.content.includes('min') && !b.content.includes('min')) return 1;
      else if (!a.content.includes('min') && b.content.includes('min')) return -1;
      else if (a.content.includes('min') && b.content.includes('min')) {
        const valueA = fnameMap?.[a.content];
        const valueB = fnameMap?.[b.content];

        if (!valueA || !valueB) return a.content.localeCompare(b.content);
        else return valueA - valueB;
      } else return a.content.localeCompare(b.content);
    })
  );

  async function loadFile(url: string) {
    const res = await fetch(url);
    const json = await res.text();

    dataManager.updateDataFromJSON(json);
    lastSavedTime = new Date();
  }

  function loadJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (ev: Event) => {
      // if tabs are ever added then when multiple files are selected here open all of them

      if (input.files?.length) {
        const f = input.files[0];
        const json = await f.text();

        dataManager.updateDataFromJSON(json);
        lastSavedTime = new Date();
      }
    };
    input.click();
  }

  function saveJSON() {
    const blob = new Blob([dataManager!.toJSON()], { type: 'text/plain' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mydata.json';
    link.click();

    URL.revokeObjectURL(link.href);
    lastSavedTime = new Date();
  }

  function saveAs(format: string) {
    saveDiagramAs(format);

    // this would remove the warning for leaving the page if the diagram is saved as image, pdf, svg
    // lastSavedTime = new Date();
  }

  onMount(() => {
    // update the theme toggle button to show the currect theme
    unsubscribe = currentTheme.subscribe(theme => {
      const div = document.getElementById('themeButtDiv');
      if (!div) {
        console.warn(`Couldn't find theme change button`);
        return;
      }

      const svg = div.getElementsByTagName('svg').item(0);
      if (!svg) {
        console.warn(`Couldn't find theme change button svg`);
        return;
      }

      svg.outerHTML = theme === 'light' ? sunSVG : moonSVG;
    });

    window.addEventListener('beforeunload', ev => {
      if (lastSavedTime.getTime() >= dataManager.getLastWriteTime().getTime()) return;
      ev.preventDefault();
    });

    lastSavedTime = new Date();

    dataButtons.then(buttons => {
      buttons.forEach(({ content, action }) => {
        if (content === 'fruits') action();
      });
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

{#snippet simpleButton(text: string, action: any)}
  <button class="hover:bg-ui-button-bg w-full rounded px-3 py-1 text-left" onclick={action}
    >{@html text}</button
  >
{/snippet}

{#snippet simpleMenu(items: any[])}
  <div
    class="bg-ui2-primary absolute z-[9998] hidden rounded rounded-tl-none px-[.25rem] py-[.25rem] shadow-[0_1px_12px_0_rgba(0,0,0,0.2)]"
    role="menu"
    tabindex="-1"
  >
    <div class="w-max max-w-[25vw] overflow-hidden text-xs">
      <div class="flex h-full w-full flex-col">
        {#each items as item}
          {@render simpleButton(item.content, item.action)}
        {/each}
      </div>
    </div>
  </div>
{/snippet}

<div
  class="bg-ui-primary border-ui-secondary flex w-full flex-row flex-nowrap gap-2 border-b-2 pl-1 font-mono select-none"
>
  <div class="bg-ui-tertiary text-ui-text my-1 mr-2 rounded-sm px-1.5 no-underline">
    <h1 class="text-sm text-nowrap">JSON Diagram Editor</h1>
  </div>

  <ButtonPopup text="File" trigger="click">
    {@render simpleMenu([
      { content: 'Open JSON', action: loadJSON },
      { content: 'Save as JSON', action: saveJSON },
      { content: 'Save as PNG', action: () => saveAs('png') },
      { content: 'Save as SVG', action: () => saveAs('svg') },
      { content: 'Save as PDF', action: () => saveAs('pdf') }
    ])}
  </ButtonPopup>

  <ButtonPopup text="View" trigger="click" updateOnThemeChange={true}>
    {@render simpleMenu([
      {
        content: `<div id="themeButtDiv" style="display: flex; flex-direction: row; gap: 1rem"><span>Toggle Theme</span>${sunSVG}</div>`,
        action: (e: PointerEvent) => {
          e.stopPropagation();
          currentTheme.set($currentTheme === 'light' ? 'dark' : 'light');
        }
      }
    ])}
  </ButtonPopup>

  <ButtonPopup text="Sample Data" trigger="click">
    {#await dataButtons then arr}
      {@render simpleMenu(arr)}
    {/await}
  </ButtonPopup>

  <ButtonPopup
    text="About"
    trigger="click"
    onClick={() => {
      openAboutModal();
    }}
  ></ButtonPopup>

  <a
    class="bg-ui-secondary text-ui-text hover:bg-ui-quaternary my-1 mr-2 ml-auto rounded-sm px-1.5"
    href="https://gojs.net/latest/"
    target="_blank"
  >
    <h2 class="text-sm text-nowrap">Made with GoJS</h2>
  </a>
</div>

<Modal ID="about" bind:openModal={openAboutModal}>
  {#snippet header()}
    <pre>About</pre>
  {/snippet}
  <div class="m-4 mt-2 flex flex-col place-content-between overflow-y-hidden">
    <div class="flex flex-col gap-2 overflow-y-scroll">
      <p>
        This interactive tool lets you edit JSON data with a <a
          target="_blank"
          href="https://gojs.net">GoJS</a
        > diagram that updates live to visualize your data.
      </p>
      <p>
        Nodes in the diagram can be selected and moved around freely. Nested objects can be
        hidden/shown by clicking the +/- button on Nodes.
      </p>

      <h2>Getting Started</h2>

      <IconParagraph
        SVGPath="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z"
      >
        <p>
          JSON data can be pasted into the editor or loaded from a file by clicking
          <span class="inline-flex"><code>File &gt Open JSON</code>.</span>
        </p>
      </IconParagraph>

      <IconParagraph
        SVGPath="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"
      >
        <p>
          Data can be modified by using the code editor on the left, or by <b>double clicking</b> on
          a Node in the Diagram. Double clicking will open a modal editor where data can be modifed in
          a table like format.
        </p>
      </IconParagraph>

      <IconParagraph
        SVGPath="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-42.34-61.66a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L120,164.69V120a8,8,0,0,1,16,0v44.69l10.34-10.35A8,8,0,0,1,157.66,154.34Z"
      >
        <div class="flex flex-col gap-1">
          <p>
            Download the JSON or Diagram at any time by clicking <code>File &gt; Save as</code>
          </p>
          <p>The Diagram can be saved as a PNG, SVG, or PDF. The data can be saved as JSON.</p>
        </div>
      </IconParagraph>

      <h2 class="pt-12">How It's Made</h2>

      <p>
        This app is built using Svelte 5 for the UI, <a target="_blank" href="https://gojs.net"
          >GoJS</a
        >
        for the interactive diagram, and
        <a target="_blank" href="https://github.com/microsoft/monaco-editor">Monaco Editor</a> for the
        JSON text editor.
      </p>
      <p>
        Internally the data is actually stored as a list of key/value pairs, not as an object. When
        changes are made to the data through the editor on the left, or through the modal, they
        first go to this data structure which acts as the "single source of truth". From there
        changes are propogated to other parts of the program to stay in sync.
      </p>

      <h2>Resources</h2>

      <p>
        This app is a sample project created by <a target="_blank" href="https://nwoods.com/support"
          >Northwoods Software</a
        >
        to demostrate the use of <a target="_blank" href="https://gojs.net">GoJS</a> integrated with
        Svelte.
      </p>
      <p>
        <a target="_blank" href="https://github.com/NorthwoodsSoftware/gojs-projects"
          >The project source code can be found here.</a
        >
      </p>
    </div>

    <div class="mt-auto">
      <div class="bg-ui-quaternary my-2 h-[1px]"></div>
    </div>

    <div>
      <p class="mt-auto">
        <a target="_blank" href="https://gojs.net">gojs.net</a> -
        <a target="_blank" href="https://gojs.net/latest/samples/">see all GoJS samples</a>
      </p>
    </div>
  </div>
</Modal>

<style>
  b {
    font-weight: 700;
  }

  h1 {
    font-size: medium;
  }

  :global(.modal) h2 {
    font-size: larger;
    font-weight: 400;
    margin-top: 1rem;
    margin-bottom: 0.25rem;
  }

  code {
    font-size: medium;
    padding-top: 2px;
    padding-bottom: 2px;
    margin-top: 2px;
  }
</style>
