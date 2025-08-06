<!--
  This component is used for all the elements that open a box with an arrow on hover/click
-->

<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  type Spot = 'top' | 'bottom' | 'left' | 'right';
  interface Props {
    background?: string;
    desiredSpot?: Spot; // where should the popup appear relative to the target
    clipMargin?: number; // margin from clipping bound
    boundingXDiv?: HTMLDivElement | null; // keep the popup inside this div horizontally
    boundingYDiv?: HTMLDivElement | null; // keep the popup inside this div vertically
    children?: Snippet;
  }

  let {
    background = 'var(--ui2-primary)',
    desiredSpot = 'bottom',
    clipMargin = 8,
    boundingXDiv = null,
    boundingYDiv = null,
    children
  }: Props = $props();

  const gap = '0.75rem';

  let popup: HTMLDivElement;
  let oldArrow: HTMLElement | null = null;

  function getTargetElement() {
    return popup.previousElementSibling ?? popup?.parentElement?.previousElementSibling;
  }

  function positionPopup(spot: Spot, hidePopup: boolean = true, recursionDepth: number = 0) {
    if (!boundingXDiv) throw new Error('bounding div not found');
    if (!boundingYDiv) throw new Error('bounding div not found');

    // get target element
    const target = getTargetElement();
    if (!target) throw new Error('target element not found');
    const tRect = target.getBoundingClientRect();

    const color = background;

    popup.style.left = '';
    popup.style.right = '';
    popup.style.top = '';
    popup.style.bottom = '';

    let xTrans = '0%';
    let yTrans = '0%';
    if (spot === 'top' || spot === 'bottom') {
      // top or bottom
      popup.style.left = `${tRect.width / 2}px`;
      xTrans = '-50%';
      if (spot === 'bottom') {
        popup.style.top = gap;
      } else {
        popup.style.bottom = `calc(${gap} + ${tRect.height}px)`;
      }
    } else {
      // left or right
      popup.style.top = `-${tRect.height / 2}px`;
      yTrans = '-50%';
      if (spot === 'right') {
        popup.style.left = `calc(100% + ${gap})`;
      } else {
        popup.style.right = `calc(100% + ${gap})`;
      }
    }
    popup.style.translate = `${xTrans} ${yTrans}`;

    // check if the desired position is okay
    // this is incomplete and makes many assumptions for now since most cases are not used
    const rect = popup.getBoundingClientRect();
    const outerRectX = boundingXDiv.getBoundingClientRect();
    const outerRectY = boundingYDiv.getBoundingClientRect();
    let xOff = '0px';
    let yOff = '0px';
    if (rect.left < outerRectX.left + clipMargin) {
      xOff = `${outerRectX.left + clipMargin - rect.left}px`;
    }
    if (recursionDepth === 0) {
      if (rect.bottom > outerRectY.bottom - clipMargin) {
        positionPopup('top', hidePopup, recursionDepth++);
        return;
      }
    }
    popup.style.translate = `calc(${xTrans} + ${xOff}) ${yTrans}`;

    // position the arrow
    if (oldArrow) oldArrow.remove();
    const arrow = document.createElement('div');
    oldArrow = arrow;
    popup.appendChild(arrow);

    arrow.style.position = 'absolute';

    arrow.style.left = `calc(50% - ${xOff})`;

    arrow.style.marginLeft = '-5px';
    arrow.style.borderWidth = '5px';
    arrow.style.borderStyle = 'solid';
    if (spot === 'bottom') {
      arrow.style.borderColor = `transparent transparent ${color} transparent`;
      arrow.style.top = '0%';
      arrow.style.translate = '0% -100%';
    } else {
      arrow.style.borderColor = `${color} transparent transparent transparent`;
      arrow.style.top = '100%';
    }

    popup.style.opacity = '100%';
  }

  onMount(() => {
    if (!popup) throw new Error('popup element not found');
    if (!boundingXDiv) boundingXDiv = document.getElementById('appContainer') as HTMLDivElement;
    if (!boundingYDiv) boundingYDiv = document.getElementById('appContainer') as HTMLDivElement;

    popup.style.display = 'none';

    (popup as any)._toggleVisibility = (isVisible?: boolean) => {
      if (isVisible !== undefined) {
        popup.style.display = isVisible ? 'block' : 'none';
      } else {
        popup.style.display = popup.style.display == 'none' ? 'block' : 'none';
      }

      if (popup.style.display !== 'none') positionPopup(desiredSpot);

      return popup.style.display === 'block';
    };
  });
</script>

<div
  bind:this={popup}
  class="popup absolute z-[9998] rounded px-[.25rem] py-[.25rem] opacity-0 shadow-[0_1px_12px_0_rgba(0,0,0,0.2)] select-none"
  style="background: {background};"
>
  <div class="popupslotdiv w-max max-w-[25vw] overflow-hidden text-xs">
    {@render children?.()}
  </div>
</div>
