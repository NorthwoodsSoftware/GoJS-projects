<script lang="ts">
  // Icons for selecting walls, dividers, or measurements
  import ToolTip from "./ToolTip.svelte";

  let { isBuildingWalls, buildType, func, type, svg } = $props();
  let toolTip = $state();
  
  switch (type) {
    case 'wall':
      toolTip = 'Build Walls';
      break;
    case 'divider':
      toolTip = 'Build Dividers';
      break;
    case 'measurement':
      toolTip = 'Build Measurement';
      break;
    default:
      toolTip = 'Build'
      break;
  }
</script>

<div class="relative group">
  <div class="rounded mb-1 {buildType === type && isBuildingWalls ? 'border-2 border-sky-200' : ''}">
    <div class="bg-white border rounded {!isBuildingWalls ? 'hidden' : ''} {buildType === type ? '' : 'hover:bg-sky-200'}">
      <button
        onclick={func}
        aria-label={"build-" + type}
        class="p-1"
      >
        {@html svg}
      </button>
    </div>
  </div>
  {#if isBuildingWalls}
    <ToolTip text={toolTip}/>
  {/if}
</div>
