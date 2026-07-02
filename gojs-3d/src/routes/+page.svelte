<script lang="ts">
  import MetaTags from '$lib/components/MetaTags.svelte';
  import DiagramSet from '$lib/components/DiagramSet.svelte';
  import NodeInfo from '$lib/components/NodeInfo.svelte';

  let selection: string | null = null;
  let model: go.GraphLinksModel;
</script>

<MetaTags
  title="GoJS alongside 3D (with Svelte) | GoJS Diagramming Library"
  description="GoJS and ThreeJS integration demo with synchronized 2D diagrams and a 3D model in Svelte. Three Diagrams are synchronized with the 3d view using one Model. Each of the 3 diagrams represents one of the 3d plane views (top down, side, front)."
  projectTitle="gojs-3d"
  screenshot="3d.png"
/>

<div class="bg-fp-beige mx-3 flex h-full flex-col">
  <h1>GoJS alongside 3D (with Svelte)</h1>

  <div class="flex h-full flex-col items-stretch">
    <!-- top -->
    <div class="flex h-4/5 flex-row items-stretch gap-1">
      <div class="w-32 bg-blue-200 md:w-48 lg:w-64">
        <NodeInfo {selection} {model} />
      </div>
      <div class="grow">
        <DiagramSet bind:selection bind:model></DiagramSet>
      </div>
    </div>
    <!-- footer -->
    <div class="mt-1 grow bg-blue-100 p-3">
      <p>This sample demonstrates GoJS Diagrams alongside a 3D model made with ThreeJS.</p>
      <p>
        Three separate GoJS Diagrams observe a single model, each showing two of three coordinate
        planes. When Nodes are moved or resized, two-way bindings on the Node Templates transmit
        those changes back to the model, automatically updating the other GoJS Diagrams. The ThreeJS
        view is updated with a Model change listener (<a
          target="_blank"
          href="https://gojs.net/latest/api/symbols/Model.html#addChangedListener"
          ><code>model.addChangedListener</code></a
        >).
      </p>
      <p>
        This sample also demonstrates GoJS alongside Svelte, where one component creates a GoJS
        model and passes it to children components. Those components bind the model and a selection
        variable, to pass upwards to update the state of other diagrams and the UI. A simple node
        information component is included to show details about a selected object.
      </p>
      <p>
        <a target="_blank" href="https://github.com/NorthwoodsSoftware/gojs-projects"
          >The GoJS-3D project source code can be found here.</a
        >
      </p>
      <p>
        <a href="https://gojs.net">gojs.net</a> -
        <a href="https://gojs.net/latest/samples/">see all GoJS samples</a>
      </p>
    </div>
  </div>
</div>
