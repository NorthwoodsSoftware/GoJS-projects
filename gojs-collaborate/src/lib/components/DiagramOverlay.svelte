<!--
  This component manages the buttons and information that is overlayed on top of the diagram.
-->

<script lang="ts">
  import type go from 'gojs';
  import { onDestroy, onMount } from 'svelte';

  interface Props {
    diagram: go.Diagram;
  }

  let { diagram }: Props = $props();

  const zoom = 1.33;

  function zoomFit() {
    if (!diagram) return;
    diagram.commandHandler.zoomToFit();
  }

  function zoomIn() {
    diagram.commandHandler.increaseZoom(zoom);
  }

  function zoomOut() {
    diagram.commandHandler.decreaseZoom(1 / zoom);
  }

  onMount(() => {});

  onDestroy(() => {});
</script>

<!-- bottom left buttons -->
<div class="absolute bottom-0 z-10 m-3 grid auto-cols-fr grid-flow-col">
  <!-- zoom fit -->
  <button onclick={zoomFit} class="button2 rounded-r-none" aria-label="zoom to fit">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="width: var(--svg-size); height: var(--svg-size)"
      fill="var(--ui-text)"
      viewBox="0 0 256 256"
      ><path
        d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z"
      ></path></svg
    >
  </button>

  <!-- zoom in -->
  <button onclick={zoomIn} class="button2 rounded-none" aria-label="zoom in">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="width: calc(var(--svg-size) * 0.8); height: calc(var(--svg-size) * 0.8)"
      fill="var(--ui-text)"
      viewBox="0 0 256 256"
      ><path
        d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
      ></path></svg
    >
  </button>

  <!-- zoom out -->
  <button onclick={zoomOut} class="button2 rounded-l-none" aria-label="zoom out">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="width: calc(var(--svg-size) * 0.8); height: calc(var(--svg-size) * 0.8)"
      fill="var(--ui-text)"
      viewBox="0 0 256 256"
      ><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"></path></svg
    >
  </button>
</div>

<style>
  /* allow grid to control sizing of buttons */
  button {
    @apply h-auto w-auto;
  }

  /* center svg */
  button svg {
    @apply m-auto;
  }
</style>
