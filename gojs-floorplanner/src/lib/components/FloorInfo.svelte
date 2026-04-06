<script lang="ts">
  import FloorInfoViewer from "./FloorInfoViewer.svelte";

  // Inside the Floor Info tab of the footer, contains two boxes that display info about the diagram
  let { selectedObject, floorData } = $props();

</script>

<div class="h-full w-full pt-2 flex justify-evenly">
  <FloorInfoViewer data={selectedObject} title={'Selected'}/>
  <FloorInfoViewer data={floorData} title={'Floor Info'}/>
</div>
