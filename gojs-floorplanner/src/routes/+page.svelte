<script lang="ts">
  import { onMount } from 'svelte';
  import { useFeet, showRoomAreas, hideDividers, hideMeasurements } from '$lib/stores/stores';
  import { currentTheme } from '$lib/stores/theme';
  import {
    buildWallsBullets,
    createRoomsBullets,
    wallpartBullets,
    furnitureBullets
  } from '$lib/other/HelpBulletPoints';
  import Diagram from '$lib/components/Diagram.svelte';
  import DiagramJson from '$lib/components/DiagramJSON.svelte';
  import Palette from '$lib/components/Palette.svelte';
  import DivResizeHandle from '$lib/components/DivResizeHandle.svelte';
  import FloorInfo from '$lib/components/FloorInfo.svelte';
  import FooterTab from '$lib/components/FooterTab.svelte';
  import WallBuilderOptions from '$lib/components/WallBuilderOptions.svelte';
  import HeaderMenuButton from '$lib/components/HeaderMenuButton.svelte';
  import HeaderMenuTab from '$lib/components/HeaderMenuTab.svelte';
  import IntroFooter from '$lib/components/IntroFooter.svelte';
  import AlertIcon from '$lib/components/AlertIcon.svelte';
  import HelpMenuSection from '$lib/components/HelpMenuSection.svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';

  let myDiagram: go.Diagram | undefined = $state();
  let isMac: boolean;

  let isBuildingWalls: boolean = $state(false);
  let buildType: string = $state('wall');
  let wallEnableFunc = $state();
  let createRoomFunc = $state();
  let switchUnitFunc = $state();
  let areaVisFunc = $state();
  let dividerVisFunc = $state();
  let measurementVisFunc = $state();

  let saveFunc = $state(); // Takes isSaving: boolean and loadSaved?: boolean
  let undoRedoFunc = $state(); // Takes boolean isUndo
  let printFunc = $state();
  let zoomToFit: Function | undefined = $state();

  let model = $state();
  let viewing = $state('example');
  let exampleModel = $state();

  let selectedObject: Object | null = $state(null);
  let floorData: Object | null = $state(null);

  let pageSelected: string = $state('intro');
  let resizing: boolean | undefined = $state(false);
  let infoBarHeight: number = $state(220);
  let headerTabClicked: string = $state('None');
  let paletteCollapsed: boolean = $state(false);
  let footerCollapsed: boolean = $state(false);
  let showingInvalidRoomAlert: boolean = $state(false);
  let showHelpPage: boolean = $state(false);

  let infoDiv: HTMLElement | null = $state(null);
  let fileTab: HTMLElement | undefined = $state();
  let editTab: HTMLElement | undefined = $state();
  let optionsTab: HTMLElement | undefined = $state();
  let viewTab: HTMLElement | undefined = $state();
  let helpWindowBg: HTMLElement | undefined = $state();
  let helpWindow: HTMLElement | undefined = $state();

  onMount(() => {
    isMac =
      navigator !== undefined &&
      navigator.userAgent !== undefined &&
      navigator.userAgent.match(/(iPhone|iPod|iPad|Mac)/i) !== null
        ? true
        : false;

    // Deselects header tabs and close help page by clicking outside
    const tabs = [fileTab, editTab, optionsTab, viewTab];
    const handleClickOutside = (event: MouseEvent) => {
      let clickedInside = false;
      tabs.forEach((tab) => {
        if (tab && tab.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        headerTabClicked = 'None';
      }

      // If clicking the background of the help but not the help page itself, hide it
      if (!(helpWindow && helpWindowBg && showHelpPage)) return;
      if (
        helpWindowBg.contains(event.target as Node) &&
        !helpWindow.contains(event.target as Node)
      ) {
        showHelpPage = false;
      }
    };

    // Calls print on Cmd/Ctrl+P and calls save on Cmd/Ctrl+S, escape help menu
    const handleKeydown = (event: KeyboardEvent) => {
      const cmdCtrl = isMac ? event.metaKey : event.ctrlKey;
      if (cmdCtrl && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (printFunc instanceof Function) printFunc();
      }
      if (cmdCtrl && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (saveFunc instanceof Function) saveFunc(true);
      }
      if (event.key === 'Escape' && showHelpPage === true) {
        event.preventDefault();
        showHelpPage = false;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function handleFile(id: number) {
    if (!(saveFunc instanceof Function && printFunc instanceof Function)) return;
    switch (id) {
      case 0:
        saveFunc(true);
        break;
      case 1:
        saveFunc(false, true);
        break;
      case 2:
        saveFunc(false, false);
        break;
      case 3:
        saveFunc(false);
        break;
      case 4:
        printFunc();
        break;
    }
  }

  function handleEdit(id: number) {
    if (!(wallEnableFunc instanceof Function && undoRedoFunc instanceof Function)) return;
    switch (id) {
      case 0:
        if (!isBuildingWalls) {
          wallEnableFunc('enableBuilder');
          isBuildingWalls = true;
        }
        wallEnableFunc('buildWalls');
        buildType = 'wall';
        break;
      case 1:
        if (!isBuildingWalls) {
          wallEnableFunc('enableBuilder');
          isBuildingWalls = true;
        }
        wallEnableFunc('buildDividers');
        buildType = 'divider';
        $hideDividers = false;
        break;
      case 2:
        if (!isBuildingWalls) {
          wallEnableFunc('enableBuilder');
          isBuildingWalls = true;
        }
        wallEnableFunc('buildMeasurement');
        buildType = 'measurement';
        $hideMeasurements = false;
        break;
      case 3:
        wallEnableFunc('disableBuilder');
        isBuildingWalls = false;
        break;
      case 4:
        undoRedoFunc(true);
        break;
      case 5:
        undoRedoFunc(false);
        break;
    }
  }

  function handleOptions(id: number) {
    // Wont run unless diagram is initialized
    if (
      !(
        switchUnitFunc instanceof Function &&
        areaVisFunc instanceof Function &&
        dividerVisFunc instanceof Function &&
        measurementVisFunc instanceof Function
      )
    )
      return;

    switch (id) {
      case 0:
        $useFeet = !$useFeet;
        switchUnitFunc();
        break;
      case 1:
        $showRoomAreas = !$showRoomAreas;
        areaVisFunc();
        break;
      case 2:
        $hideDividers = !$hideDividers;
        dividerVisFunc();
        break;
      case 3:
        $hideMeasurements = !$hideMeasurements;
        measurementVisFunc();
        break;
    }
  }

  function handleView(id: number) {
    if (!(zoomToFit instanceof Function)) return;

    switch (id) {
      case 0:
        zoomToFit();
        break;
      case 1:
        paletteCollapsed = !paletteCollapsed;
        break;
      case 2:
        footerCollapsed = !footerCollapsed;
        break;
      case 3:
        $currentTheme = $currentTheme === 'light' ? 'dark' : 'light';
        break;
    }
  }
</script>

<MetaTags
  title={'Svelte Floorplanner'}
  description={'A floorplanner web application built with GoJS and Svelte.'}
  projectTitle={'gojs-floorplanner'}
  screenshot={'floorplanapp.png'}
  applicationCategory={'DeveloperApplication'}
/>
<div class="bg-fp-bg-lightish dark:bg-fp-bg-darkened mx-3 flex h-full flex-col overflow-hidden">
  <div
    class="bg-fp-bg dark:from-fp-bg-dark dark:to-fp-bg-darkened mt-1 mb-1 rounded border dark:bg-gradient-to-t"
  >
    <div class="text-fp-bg-lightish flex w-max rounded-t rounded-br shadow dark:shadow-none">
      <div class="group relative">
        <HeaderMenuTab title="File" bind:headerTabClicked bind:element={fileTab} />
        <div
          class="absolute left-0 {headerTabClicked === 'File'
            ? 'block'
            : 'hidden'} bg-fp-bg z-10 min-w-[120px] rounded-b border shadow"
        >
          <HeaderMenuButton
            title={viewing === 'example' ? 'Update JSON' : 'Save'}
            func={() => handleFile(0)}
          />
          <HeaderMenuButton title="Load Saved" func={() => handleFile(1)} />
          <HeaderMenuButton title="Load Example" func={() => handleFile(2)} />
          <HeaderMenuButton title="Load From JSON" func={() => handleFile(3)} />
          <HeaderMenuButton title="Print" func={() => handleFile(4)} />
        </div>
      </div>
      <div class="group relative">
        <HeaderMenuTab title="Edit" bind:headerTabClicked bind:element={editTab} />
        <div
          class="absolute left-0 {headerTabClicked === 'Edit'
            ? 'block'
            : 'hidden'} bg-fp-bg z-10 min-w-[120px] rounded-b border shadow"
        >
          <HeaderMenuButton title="Undo" func={() => handleEdit(4)} />
          <HeaderMenuButton title="Redo" func={() => handleEdit(5)} />
          <HeaderMenuButton title="Build Walls" func={() => handleEdit(0)} />
          <HeaderMenuButton title="Build Dividers" func={() => handleEdit(1)} />
          <HeaderMenuButton title="Build Measurements" func={() => handleEdit(2)} />
          {#if isBuildingWalls}
            <HeaderMenuButton title="Disable Wall Builder" func={() => handleEdit(3)} />
          {/if}
          <HeaderMenuButton title="Create Room" func={createRoomFunc} />
        </div>
      </div>
      <div class="group relative">
        <HeaderMenuTab title="Options" bind:headerTabClicked bind:element={optionsTab} />
        <div
          class="absolute left-0 {headerTabClicked === 'Options'
            ? 'block'
            : 'hidden'} bg-fp-bg z-10 min-w-[120px] rounded-b border shadow"
        >
          <HeaderMenuButton
            title={$useFeet ? 'Use Meters' : 'Use Feet'}
            func={() => handleOptions(0)}
          />
          <HeaderMenuButton
            title={$showRoomAreas ? 'Hide Room Areas' : 'Show Room Areas'}
            func={() => handleOptions(1)}
          />
          <HeaderMenuButton
            title={$hideDividers ? 'Show Dividers' : 'Hide Dividers'}
            func={() => handleOptions(2)}
          />
          <HeaderMenuButton
            title={$hideMeasurements ? 'Show Measurements' : 'Hide Measurements'}
            func={() => handleOptions(3)}
          />
        </div>
      </div>
      <div class="group relative">
        <HeaderMenuTab title="View" bind:headerTabClicked bind:element={viewTab} />
        <div
          class="absolute left-0 {headerTabClicked === 'View'
            ? 'block'
            : 'hidden'} bg-fp-bg z-10 min-w-[120px] rounded-b border shadow"
        >
          <HeaderMenuButton title="Reset Viewport" func={() => handleView(0)} />
          <HeaderMenuButton
            title={paletteCollapsed ? 'Show Palette' : 'Collapse Palette'}
            func={() => handleView(1)}
          />
          <HeaderMenuButton
            title={footerCollapsed ? 'Show Footer' : 'Collapse Footer'}
            func={() => handleView(2)}
          />
          <HeaderMenuButton
            title={$currentTheme === 'dark' ? 'Use Light Theme' : 'Use Dark Theme'}
            func={() => handleView(3)}
          />
        </div>
      </div>
    </div>
    <button
      type="button"
      aria-label="help"
      class="text-fp-bg-lightish fixed right-10 flex h-8 w-8 items-center justify-center rounded-full border-1
        border-gray-200 text-xl shadow hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:shadow-none
        dark:hover:bg-slate-800"
      onclick={() => (showHelpPage = true)}
    >
      ?
    </button>
    <div class="flex w-full flex-row rounded-b py-2 pl-1.5">
      <h1 class="text-fp-bg-lightish mr-3 text-center text-2xl font-bold dark:text-white">
        GoJS Floorplanner with
      </h1>
      <img src="images/Svelte_Logo.svg" alt="Svelte" class="my-auto h-8 w-8" />
    </div>
  </div>

  <div class="flex grow flex-col items-stretch">
    <!-- top -->
    <div class="flex grow flex-row items-stretch gap-1 select-none">
      <div class="{paletteCollapsed ? 'w-4' : 'w-32 md:w-48 lg:w-64'} bg-fp-bg rounded">
        <!-- Left Bar -->
        {#if !paletteCollapsed}
          <Palette />
        {:else}
          <button
            class="bg-fp-beige dark:bg-fp-bg-dark h-full w-full rounded border"
            onclick={() => (paletteCollapsed = !paletteCollapsed)}
            aria-label="open-palette"
          >
          </button>
        {/if}
      </div>
      <div class="relative {paletteCollapsed ? 'ml-1' : 'ml-2'} w-full rounded border">
        <div class="bg-fp-beige absolute z-0 h-full w-full overflow-hidden rounded">
          <Diagram
            {resizing}
            {exampleModel}
            bind:myDiagram
            bind:viewing
            bind:wallEnableFunc
            bind:saveFunc
            bind:undoRedoFunc
            bind:model
            bind:selectedObject
            bind:floorData
            bind:createRoomFunc
            bind:zoomToFit
            bind:printFunc
            bind:switchUnitFunc
            bind:areaVisFunc
            bind:dividerVisFunc
            bind:measurementVisFunc
            bind:showingInvalidRoomAlert
          />
        </div>
        <div class="absolute mt-2 ml-2 p-2">
          <WallBuilderOptions
            bind:isBuildingWalls
            bind:buildType
            {wallEnableFunc}
            {dividerVisFunc}
            {measurementVisFunc}
          />
        </div>
        <AlertIcon
          visBool={showingInvalidRoomAlert}
          message={`No valid room found<br>Use dividers to connect gaps`}
        />
      </div>
    </div>
    <!-- Footer section -->
    {#if footerCollapsed}
      <button
        class="bg-fp-bg dark:bg-fp-bg-dark mt-1 mb-1 h-4 w-full rounded border"
        onclick={() => (footerCollapsed = !footerCollapsed)}
        aria-label="open-footer"
      >
      </button>
    {:else}
      <DivResizeHandle div={infoDiv} name="infoBar" bind:resizing bind:infoBarHeight />
    {/if}
    <div
      class="bg-fp-bg-lightish dark:from-fp-bg-dark dark:to-fp-bg-darkened rounded dark:border dark:bg-gradient-to-r
      {footerCollapsed ? 'hidden' : 'flex flex-col'} z-10"
      style={'height: ' + String(infoBarHeight) + 'px'}
      bind:this={infoDiv}
    >
      <div class="bg-fp-bg-lightish dark:bg-fp-bg-dark z-10 flex w-max rounded-t">
        <FooterTab text={'Intro'} id={'intro'} bind:pageSelected />
        <FooterTab text={'Model'} id={'model'} bind:pageSelected />
        <FooterTab text={'Floor Info'} id={'floorInfo'} bind:pageSelected />
      </div>
      <div
        class="bg-fp-bg dark:bg-fp-bg-dark dark:text-fp-bg -mt-[1px] flex-1 grow-1 rounded-b border-t"
      >
        <div class="h-full w-full" style="display: {pageSelected === 'model' ? '' : 'none'};">
          <DiagramJson bind:model bind:exampleModel />
        </div>
        <div
          class="h-full w-full"
          style="display: {pageSelected === 'intro' ? '' : 'none'}; {'height: ' +
            String(infoBarHeight - 35) +
            'px'}"
        >
          <IntroFooter />
        </div>
        <div
          class="h-full w-full"
          style="display: {pageSelected === 'floorInfo' ? '' : 'none'}; {'height: ' +
            String(infoBarHeight - 35) +
            'px'}"
        >
          <FloorInfo {selectedObject} {floorData} />
        </div>
      </div>
    </div>
  </div>
</div>
<!-- Help window, shown after clicking question mark -->
<div
  class="fixed inset-0 z-50 bg-[#80808080] {showHelpPage ? '' : 'hidden'}"
  bind:this={helpWindowBg}
>
  <div
    class="bg-fp-bg dark:bg-fp-bg-darkened fixed inset-15 rounded text-black dark:text-white"
    bind:this={helpWindow}
  >
    <div
      class="bg-fp-bg dark:from-fp-bg-dark dark:to-fp-bg-darkened flex h-max w-full justify-between rounded-t border dark:bg-gradient-to-t"
    >
      <h2 class="m-3 text-2xl">Guide:</h2>
      <button
        type="button"
        aria-label="Exit Help Button"
        class="text-fp-bg-lightish m-3 hover:text-slate-500 dark:text-white dark:hover:text-gray-200"
        onclick={() => (showHelpPage = false)}
      >
        <svg
          viewBox="-1 -1 14 14"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="0.5"
          class="h-6 w-6"
        >
          <path
            d="M 5 4 L 9 0 Q 10 0 10 1 L 6 5 L 10 9 Q 10 10 9 10 L 5 6 L 1 10 Q 0 10 0 9 L 4 5 L 0 1 Q 0 0 1 0 L 5 4"
          />
        </svg>
      </button>
    </div>
    <div class="h-[calc(100%-60px)] w-full overflow-auto pt-3">
      <HelpMenuSection
        title={'Walls'}
        bulletPoints={buildWallsBullets}
        imgLink={'images/Wall_Help_Photo.png'}
      />
      <HelpMenuSection
        title={'Rooms'}
        bulletPoints={createRoomsBullets}
        imgLink={'images/Room_Help_Photo.png'}
      />
      <HelpMenuSection
        title={'Windows and Doors'}
        bulletPoints={wallpartBullets}
        imgLink={'images/Wallpart_Help_Photo.png'}
      />
      <HelpMenuSection
        title={'Furniture'}
        bulletPoints={furnitureBullets}
        imgLink={'images/Furniture_Help_Photo.png'}
      />
    </div>
  </div>
</div>
