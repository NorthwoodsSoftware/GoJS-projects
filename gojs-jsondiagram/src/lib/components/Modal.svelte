<!--
  This component is used to create a generic modal for the about page and the object editor.
-->

<script module>
  // this module script is used to define static parts of the Modal component

  // this ensures that ID's are always unique for modals
  const IDSet: Set<string> = new Set();
  let n = 0;
  function getUniqueID() {
    let nextID;
    while (IDSet.has((nextID = `Modal${n++}`)));
    IDSet.add(nextID);
    return nextID;
  }

  let hasPushedState = false;
</script>

<script lang="ts">
  import { onMount, type Snippet, onDestroy } from 'svelte';
  import ButtonPopup from './ButtonPopup.svelte';
  import { animationDurationNormal } from '$lib/constants';
  import { pushState, replaceState } from '$app/navigation';

  interface Props {
    openModal?: Function; // this gets overwritten to "return" an open function
    onClose?: Function; // call this when the modal is closed
    destroyOnClose?: boolean; // remove this component from DOM on close
    ID?: string | null; // ID to be used for URL
    children?: Snippet; // modal body content
    header?: Snippet; // modal header content
  }

  let { openModal = $bindable(), onClose, ID = null, children, header }: Props = $props();

  let screenDiv: HTMLDivElement;
  let modalDiv: HTMLDivElement;

  let closeModal: Function | any = $state(() => {});

  onMount(() => {
    if (ID === null) ID = getUniqueID();
    else {
      if (IDSet.has(ID)) throw new Error(`Attempted to re-use modal ID: ${ID}`);

      IDSet.add(ID);
    }

    closeModal = (isFromNav: boolean = false) => {
      if (screenDiv.hidden) return;

      if (!isFromNav) {
        // if there is no state before this then create some so we don't exit the page
        if (!hasPushedState) {
          const oldURL = location.href;
          const oldState = history.state;
          replaceState('', {});
          pushState(oldURL, oldState);
        }

        history.back();
        return;
      }

      screenDiv.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: animationDurationNormal,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
      });

      const animation = modalDiv!.animate(
        [{ transform: 'translateY(0%)' }, { transform: 'translateY(8%)' }],
        {
          duration: animationDurationNormal,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
        }
      );

      animation.finished.then(() => {
        screenDiv.hidden = true;
        if (onClose) onClose();

        if (!isFromNav) {
          pushState(location.origin + `#${ID}`, {});
          hasPushedState = true;
        }
      });
    };

    openModal = (isFromNav: boolean = false) => {
      if (!screenDiv.hidden) return;
      screenDiv.hidden = false;

      screenDiv.focus();

      if (typeof isFromNav !== 'boolean')
        throw new Error(`expected isFromNav to be a boolean, got: ${isFromNav}`);
      if (!isFromNav) {
        pushState(location.origin + `#${ID}`, {});
        hasPushedState = true;
      }

      screenDiv.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: animationDurationNormal,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
      });

      screenDiv.animate([{ transform: 'translateY(-8%)' }, { transform: 'translateY(0%)' }], {
        duration: animationDurationNormal,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // out quart
      });
    };

    // allow the modal to be open/closed with the browser forward and back buttons without polluting
    // the page history
    const popListener = () => {
      if (!screenDiv) {
        window.removeEventListener('popstate', popListener);
        return;
      }

      if (screenDiv.hidden) {
        if (location.hash.slice(1) === ID && openModal) openModal(true);
      } else if (!screenDiv.hidden) closeModal(true);
    };
    window.addEventListener('popstate', popListener);

    // if the page was refreshed then re-open the modal
    if (location.hash.slice(1) === ID && openModal) openModal(true);
  });

  onDestroy(() => {
    if (typeof ID === 'string') IDSet.delete(ID);
  });
</script>

<div
  bind:this={screenDiv}
  hidden
  class="modal absolute top-0 right-0 bottom-0 left-0 z-[100] grid place-content-center backdrop-blur-xs"
  style="font: normal 300 14pt 'Inconsolata', monospace;"
  onclick={e => {
    if (e.target === screenDiv) closeModal();
  }}
  onkeydown={(ev: KeyboardEvent) => {
    if (ev.key === 'Escape') closeModal();
  }}
  role="button"
  tabindex={-1}
>
  <div
    bind:this={modalDiv}
    class="bg-ui-primary m-4 flex h-[75vh] w-[60vw] flex-col rounded-lg"
    onkeydown={key => {
      if (key.key === 'Escape') closeModal();
    }}
    role="button"
    tabindex={-1}
  >
    <!-- top bar -->
    <div class="mx-3 mt-2 flex flex-none place-content-between">
      {@render header?.()}

      <ButtonPopup
        isSquare={true}
        onClick={closeModal}
        baseColor="var(--ui-button-bg)"
        buttonStyle="border-radius: 4px; aspect-ratio: 1 / 1; justify-content: center;"
      >
        {#snippet button()}
          <div class="m-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              fill="var(--ui-text)"
              viewBox="0 0 256 256"
              ><path
                d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
              ></path></svg
            >
          </div>
        {/snippet}
      </ButtonPopup>
    </div>
    <!-- divider -->
    <div class="bg-ui-secondary mx-2 my-2 h-[1px] flex-none"></div>
    <!-- body -->
    <div class="flex min-h-0 flex-1 flex-row flex-nowrap">
      {@render children?.()}
    </div>
  </div>
</div>
