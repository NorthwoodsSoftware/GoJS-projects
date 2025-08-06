<!--
  This component is used by the about modal to create paragraphs indented with icons
-->

<script lang="ts">
  import { type Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    SVGPath?: string | null;
  }

  let { children, SVGPath = null }: Props = $props();
</script>

<div class="flex flex-row gap-2">
  <svg
    class="mt-1 flex-none"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="var(--ui-text)"
    viewBox="0 0 256 256"
  >
    {#if SVGPath !== null}
      <path d={SVGPath}></path>
    {/if}
  </svg>
  {@render children?.()}
</div>
