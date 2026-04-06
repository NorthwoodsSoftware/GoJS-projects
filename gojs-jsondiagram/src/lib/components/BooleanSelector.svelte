<!--
  This component is a simple true/false selector used in ObjectEditorRowItem to set boolean
  properties
-->

<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    style?: string;
    value?: boolean; // initial value of the boolean selector
    oninput?: (
      e: Event & {
        currentTarget: EventTarget & HTMLButtonElement;
      }
    ) => void;
  }

  let { style = '', value = true, oninput }: Props = $props();

  let selectorDiv: HTMLButtonElement;

  onMount(() => {
    if (!value && selectorDiv.classList.contains('checked'))
      selectorDiv.classList.remove('checked');
  });
</script>

<button
  bind:this={selectorDiv}
  class="checked BooleanSelector border-ui-quaternary grid cursor-pointer grid-cols-2 place-content-around rounded border select-none"
  {style}
  onclick={e => {
    value = !value;

    if (value && !selectorDiv.classList.contains('checked')) selectorDiv.classList.add('checked');
    else if (!value && selectorDiv.classList.contains('checked'))
      selectorDiv.classList.remove('checked');

    if (oninput) oninput(e);
  }}
>
  <!-- switch to only displaying T/F instead of the full word when the div is too small -->
  <span class="true block md:hidden">T</span>
  <span class="true hidden md:inline">TRUE</span>

  <span class="false block md:hidden">F</span>
  <span class="false hidden md:inline">FALSE</span>
</button>

<style>
  * {
    --duration: 0.055s;
  }

  .BooleanSelector {
    background: var(--color-emerald-200);
    transition: background-color var(--duration) linear;
  }
  :global(.dark) .BooleanSelector {
    background: var(--color-emerald-600);
    transition: none;
  }

  .BooleanSelector:not(.checked) {
    background: var(--color-rose-200);
  }
  :global(.dark) .BooleanSelector:not(.checked) {
    background: var(--color-rose-700);
  }

  .true {
    font-weight: 300;
    transition: opacity var(--duration) linear;
  }
  :not(.checked) .true {
    opacity: 0.5;
    font-weight: 250;
  }

  .false {
    font-weight: 300;
    transition: opacity var(--duration) linear;
  }
  .checked .false {
    opacity: 0.5;
    font-weight: 250;
  }
</style>
