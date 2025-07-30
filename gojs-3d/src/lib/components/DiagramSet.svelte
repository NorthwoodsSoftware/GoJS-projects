<script lang="ts">
  import go from 'gojs';
  import Diagram from './Diagram.svelte';
  import ThreeCamera from './ThreeCamera.svelte';
  interface Props {
    selection: string | null;
    model: go.GraphLinksModel;
  }

  let { selection = $bindable(), model = $bindable() }: Props = $props();

  model = new go.GraphLinksModel([
    { loc: [0, 0, -200], size: [80, 60, 200], color: '#b3eed6' },
    { loc: [200, 0, -60], size: [60, 60, 60], color: '#f6a498' },
    { loc: [0, 100, -30], size: [30, 30, 30], color: '#cbfdea' },
    { loc: [50, 100, -30], size: [30, 30, 30], color: '#86dcd2' },
    { loc: [100, 100, -30], size: [30, 30, 30], color: '#a1d9d9' },
    { loc: [150, 100, -30], size: [30, 30, 30], color: '#83a2a4' },
    { loc: [200, 100, -30], size: [30, 30, 30], color: '#c4aa97' },
    { loc: [100, 200, -40], size: [130, 50, 40], color: '#f2e1be' }
  ]);
</script>

<div class="grid h-full w-full grid-cols-2 grid-rows-2 gap-1">
  <!-- camera -->
  <ThreeCamera {model} bind:selection />
  <!-- top x/y -->
  <Diagram axis1={'X'} axis2={'Y'} {model} bind:selection />
  <!-- front y/z -->
  <Diagram axis1={'Y'} axis2={'Z'} {model} bind:selection />
  <!-- side x/z -->
  <Diagram axis1={'X'} axis2={'Z'} {model} bind:selection />
</div>
