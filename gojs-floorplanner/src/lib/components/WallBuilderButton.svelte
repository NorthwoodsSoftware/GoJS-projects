<script lang="ts">
  // The button that opens the wall builder menu and enables wall building
  import ToolTip from "./ToolTip.svelte";

  let { func, shouldHide, toolTip, title, height } = $props();
  const hStr = height ? 'height: ' + height + 'px' : null;
</script>

<div class="relative group">
  <div class="rounded border-sky-200 group-hover:border-2 group-hover:-translate-0.5">
    <button
      onclick={func}
      class="{shouldHide ? 'hidden' : ''} px-2 py-1 rounded border bg-white text-black"
      style={hStr}
    >
      {title}
    </button>    
  </div>
  {#if toolTip}
    <ToolTip text={toolTip}/>
  {/if}
</div>
