<script lang="ts">
  // Contains the floating menu at the top left of the diagram that manages selecting wall building options
  import BuilderIconButton from "./BuilderIconButton.svelte";
  import WallBuilderButton from "./WallBuilderButton.svelte";
  import { hideDividers, hideMeasurements } from "$lib/stores/stores";

  let { 
    isBuildingWalls = $bindable(), 
    buildType = $bindable(),
    wallEnableFunc,
    dividerVisFunc,
    measurementVisFunc
  } = $props();

  function enableWallBuilding() {
    wallEnableFunc('enableBuilder');
    isBuildingWalls = true;
    buildType = 'wall';
  }

  function disableWallBuilding() {
    wallEnableFunc('disableBuilder');
    isBuildingWalls = false;
  }

  function buildWalls() {
    wallEnableFunc('buildWalls');
    buildType = 'wall';
  }

  function buildDividers() {
    wallEnableFunc('buildDividers');
    buildType = 'divider';
    $hideDividers = false;
    dividerVisFunc();
  }

  function buildMeasurement() {
    wallEnableFunc('buildMeasurement');
    buildType = 'measurement';
    $hideMeasurements = false;
    measurementVisFunc();
  }

  const wallSVG = 
    `<svg class="w-10 h-10" viewBox="0 0 16 16">
      <path d="M 0 10 L 10 0 L 8 0 M 10 0 V 2 M 0 10 V 8 M 0 10 H 2"
        stroke="gray" stroke-width="0.5" fill="none"/>
      <path d="M 2 12 L 12 2 L 15 5 L 5 15 L 2 12"
        stroke="black" stroke-width="0.5" fill="#6e6e6e"/>
    </svg>`;
  
  const dividerSVG = 
    `<svg class="w-10 h-10" viewBox="0 0 14 14">
      <path d="M 0 10 L 10 0 L 8 0 M 10 0 V 2 M 0 10 V 8 M 0 10 H 2"
        stroke="gray" stroke-width="0.5" fill="none"/>
      <path d="M 3 13 L 13 3"
        stroke="black" stroke-width="1" fill="none"/>
    </svg>`;
  
  const measurementSVG = 
    `<svg class="w-10 h-10" viewBox="0 0 10 10">
      <path d="M 0 10 L 10 0 L 8 0 M 10 0 V 2 M 0 10 V 8 M 0 10 H 2"
        stroke="gray" stroke-width="0.5" fill="none"/>
    </svg>`;

</script>

<div class='flex flex-col { isBuildingWalls ? '' : 'gap-2'}'>
  <div class="flex gap-2">
    <WallBuilderButton 
      func={enableWallBuilding} 
      shouldHide={isBuildingWalls} 
      toolTip='Draw walls, dividers, and measurements' 
      title='Wall Builder'
      height={null}
    />
    <BuilderIconButton {isBuildingWalls} {buildType} func={buildWalls} type='wall' svg={wallSVG}/>
    <BuilderIconButton {isBuildingWalls} {buildType} func={buildDividers} type='divider' svg={dividerSVG}/>
    <BuilderIconButton {isBuildingWalls} {buildType} func={buildMeasurement} type='measurement' svg={measurementSVG}/>
    <WallBuilderButton func={disableWallBuilding} shouldHide={!isBuildingWalls} toolTip={null} title='Exit' height={54}/>
  </div>
</div>