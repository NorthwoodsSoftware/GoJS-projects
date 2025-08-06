<!--
  This component manages the buttons that are overlayed on top of the diagram.
-->

<script lang="ts">
  import ButtonPopup from './ButtonPopup.svelte';
  import PopupBox from './PopupBox.svelte';
  import type go from 'gojs';
  import { onDestroy, onMount } from 'svelte';
  import { animationDurationSlow } from '$lib/constants';
  interface Props {
    diagram: go.Diagram;
  }

  let { diagram }: Props = $props();

  let doubleClickPopup: HTMLDivElement;

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

  const listener = (e?: any, doSkipStorage = false) => {
    if (doubleClickPopup) {
      if (doSkipStorage) {
        doubleClickPopup.remove();
      } else {
        const animation = doubleClickPopup.animate(
          [
            { transform: 'translateY(0%)', opacity: 1 },
            { transform: 'translateY(50%)', opacity: 0 }
          ],
          {
            duration: animationDurationSlow,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
          }
        );

        animation.finished.then(() => {
          doubleClickPopup.remove();
        });
      }
    }
    diagram.removeDiagramListener('ObjectDoubleClicked', listener);

    // don't show this popup again
    if (!doSkipStorage) localStorage.setItem('hasDoubleClicked', 'true');
  };

  onMount(() => {
    if (localStorage.getItem('hasDoubleClicked')) {
      listener(null, true);
    } else {
      diagram.addDiagramListener('ObjectDoubleClicked', listener);
    }
  });

  onDestroy(() => {
    listener(null, true);
  });
</script>

<!-- bottom right -->
<!-- this creates a one time popup for new users -->
<div
  bind:this={doubleClickPopup}
  class="bg-ui-primary border-ui-secondary absolute right-0 bottom-0 z-10 m-3 max-w-[50vw] min-w-[calc(min(100vw-1.5rem,300px))] border px-2 select-none"
  style="border-radius: var(--ui-radius);"
>
  <p>
    This is an interactive diagram made from JSON data. The diagram will live update as changes are
    made to the JSON on the left or in the modal editor.
  </p>
  <p>Click the "About" button at the top for more information</p>
  <p class="mt-2">Try double clicking a Node to open the modal editor</p>
</div>

<!-- bottom left buttons -->
<div class="absolute bottom-0 z-10 m-3 flex flex-row">
  <!-- zoom fit -->
  <ButtonPopup
    isSquare={true}
    onClick={zoomFit}
    trigger="hover"
    baseColor="var(--ui-button-bg)"
    buttonStyle={'border-radius: var(--ui-radius) 0 0 var(--ui-radius);'}
  >
    <PopupBox>
      <p class="px-3 py-1 select-none">Zoom to fit Nodes</p>
    </PopupBox>
    {#snippet button()}
      <div class="m-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="var(--ui-text)"
          viewBox="0 0 256 256"
          ><path
            d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z"
          ></path></svg
        >
      </div>
    {/snippet}
  </ButtonPopup>

  <!-- zoom in -->
  <ButtonPopup isSquare={true} onClick={zoomIn} trigger={'hover'} baseColor="var(--ui-button-bg)">
    <PopupBox>
      <p class="px-3 py-1 select-none">Zoom in</p>
    </PopupBox>
    {#snippet button()}
      <div class="m-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="var(--ui-text)"
          viewBox="0 0 256 256"
          ><path
            d="M152,112a8,8,0,0,1-8,8H120v24a8,8,0,0,1-16,0V120H80a8,8,0,0,1,0-16h24V80a8,8,0,0,1,16,0v24h24A8,8,0,0,1,152,112Zm77.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88.11,88.11,0,1,1,11.31-11.31l50.07,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z"
          ></path></svg
        >
      </div>
    {/snippet}
  </ButtonPopup>

  <!-- zoom out -->
  <ButtonPopup
    isSquare={true}
    onClick={zoomOut}
    trigger={'hover'}
    baseColor="var(--ui-button-bg)"
    buttonStyle={'border-radius: 0 var(--ui-radius) var(--ui-radius) 0;'}
  >
    <PopupBox>
      <p class="px-3 py-1 select-none">Zoom out</p>
    </PopupBox>
    {#snippet button()}
      <div class="m-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="var(--ui-text)"
          viewBox="0 0 256 256"
          ><path
            d="M152,112a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h64A8,8,0,0,1,152,112Zm77.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88.11,88.11,0,1,1,11.31-11.31l50.07,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z"
          ></path></svg
        >
      </div>
    {/snippet}
  </ButtonPopup>
</div>
