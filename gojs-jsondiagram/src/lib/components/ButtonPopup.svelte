<!--
  This component is used by all buttons that open a menu on click or on hover. It can also be used
  for generic buttons that do not open any popup.
-->

<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte';
  import { currentTheme } from '$lib/stores';
  import type { Unsubscriber } from 'svelte/store';

  interface Props {
    text?: string | null; // the text for the button if there is no HTML
    textColor?: string | null;
    trigger?: 'hover' | 'click'; // open popup on hover or on click, if there is one
    style?: string; // CSS style for the whole component
    buttonStyle?: string; // CSS style for the button element
    onClick?: Function | null; // function to call when the button is clicked
    isSquare?: boolean; // CSS style the button to always be square
    baseColor?: string; // CSS background color
    hoverColorLightMode?: string; // CSS background on hover for light mode
    hoverColorDarkMode?: string; // CSS background on hover for dark mode
    updateOnThemeChange?: boolean; // update hover color on theme change. This is used for the View button
    children?: Snippet; // elements to toggle visibility
    button?: Snippet; // elements to put inside the button
  }

  let {
    text = null,
    textColor = null,
    trigger = 'click',
    buttonStyle = '',
    onClick = null,
    style = '',
    isSquare = false,
    baseColor = '',
    hoverColorLightMode = 'rgba(0, 0, 0, 0.12)',
    hoverColorDarkMode = 'rgba(255, 255, 255, 0.22)',
    updateOnThemeChange = false,
    children,
    button
  }: Props = $props();

  let slot: HTMLDivElement;
  let buttonElem: HTMLButtonElement;
  let outerDiv: HTMLDivElement;

  let isVisible = false;

  let unsubscribe: Unsubscriber;

  function toggleVisibility(element: HTMLElement, value?: boolean) {
    if ((element as any)._toggleVisibility) {
      isVisible = (element as any)._toggleVisibility(value);
    } else {
      element.style.display = (value ?? element.style.display === 'none') ? 'block' : 'none';
      isVisible = element.style.display === 'block';
    }
  }

  onMount(() => {
    // if you click outside the menu then close it
    if (trigger === 'click') {
      document.addEventListener('click', event => {
        if (!slot) return;
        if (buttonElem.contains(event.target as Node)) return;
        Array.from(slot.children).forEach(ele => {
          if (!ele || !(ele instanceof HTMLElement)) return;
          toggleVisibility(ele, false);
        });

        buttonElem.style.background = baseColor;
      });
    }
    buttonElem.style.background = baseColor;

    if (updateOnThemeChange) {
      unsubscribe = currentTheme.subscribe(theme => {
        if (
          buttonElem.style.background === hoverColorLightMode ||
          buttonElem.style.background === hoverColorDarkMode
        )
          buttonElem.style.background =
            theme === 'light' ? hoverColorLightMode : hoverColorDarkMode;
      });
    }
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<div id="outerDiv" {style} bind:this={outerDiv} class="relative">
  <button
    bind:this={buttonElem}
    class="relative h-full w-min cursor-pointer text-center"
    style={`${textColor === null ? '' : 'color: ' + textColor}; ${isSquare ? 'aspect-ratio: 1 / 1; display: grid; align-items: center' : ''}; ${buttonStyle}`}
    onmouseenter={() => {
      buttonElem.style.background =
        $currentTheme === 'light' ? hoverColorLightMode : hoverColorDarkMode;

      if (trigger !== 'hover') return;
      Array.from(slot.children).forEach(ele => {
        if (!ele || !(ele instanceof HTMLElement)) return;
        toggleVisibility(ele, true);
      });
    }}
    onmouseleave={() => {
      if (trigger === 'click' && isVisible) return;
      buttonElem.style.background = baseColor;
      if (trigger !== 'hover') return;
      Array.from(slot.children).forEach(ele => {
        if (!ele || !(ele instanceof HTMLElement)) return;
        toggleVisibility(ele, false);
      });
    }}
    onclick={e => {
      if (trigger !== 'click' && !onClick) return;

      // animate
      buttonElem.animate(
        [
          {
            offset: 0,
            transform: 'translateY(0%)'
          },
          {
            offset: 0.5,
            transform: 'translateY(8%)'
          },
          {
            offset: 1,
            transform: 'translateY(0%)'
          }
        ],
        {
          duration: 150,
          easing: 'linear'
        }
      );

      if (trigger === 'click') {
        Array.from(slot.children).forEach(ele => {
          if (!ele || !(ele instanceof HTMLElement)) return;
          toggleVisibility(ele);
        });
      }

      if (onClick) {
        onClick(e);
      }
    }}
  >
    {#if button}
      {@render button?.()}
    {:else}
      <span class="mx-1 text-xs text-nowrap">{@html text}</span>
    {/if}
  </button>
  <div bind:this={slot} class="relative">
    {@render children?.()}
  </div>
</div>
