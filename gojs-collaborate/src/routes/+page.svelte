<script lang="ts">
  import MetaTags from '$lib/components/MetaTags.svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import { currentTheme } from '$lib/stores';
  import DocLink from '$lib/components/DocLink.svelte';

  import * as Y from 'yjs';
  import { WebsocketProvider } from 'y-websocket';

  import type { DocSyncFunction } from '$lib/types';

  const roomName = `gojs-sample1-room-${new Date().toLocaleDateString('en-CA')}`;
  let isGlobal = $state(false);

  type DocEntry = {
    document: Y.Doc;
    cleanup: Function;
    disconnectListener: Function;
  };
  const docArr: DocEntry[] = [];

  const syncDocFunc: DocSyncFunction = (doc, disconnectListener) => {
    // initialize the new doc to the content of the first doc
    if (docArr.length) {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(docArr[0].document));
    }

    const listener = doc.on('update', update => {
      if (isGlobal) return;
      docArr.forEach(({ document }) => {
        if (document === doc) return;

        Y.applyUpdate(document, update);
      });
    });

    const docEntry = {
      document: doc,
      disconnectListener: disconnectListener,
      cleanup: () => {
        const idx = docArr.indexOf(docEntry);
        if (idx >= 0) docArr.splice(idx, 1);

        doc.off('update', listener);
      }
    };
    docArr.push(docEntry);

    return docEntry.cleanup;
  };

  let provider: WebsocketProvider | null = null;
  $effect(() => {
    if (isGlobal) {
      // clean up the old clients
      while (docArr.length > 1) {
        docArr[0].cleanup();
      }

      const entry = docArr[0];
      const doc = entry.document;
      provider = new WebsocketProvider('wss://demos.yjs.dev/ws', roomName, doc);
      provider.awareness.setLocalState({});

      // remove cursors from users after they disconnect
      provider.awareness.on('change', ({ removed }: { removed: number[] }) => {
        removed.forEach(id => {
          if (id === doc.clientID) return; // don't remove yourself

          // only remove locally
          console.log(id, 'disconnected');
          entry.disconnectListener(id);
        });
      });
    } else {
      if (provider) {
        // clean up old client 1
        while (docArr.length > 2) {
          docArr[0].cleanup();
        }

        provider.awareness.setLocalState(null);

        provider.awareness.destroy();
        provider.destroy();
        provider = null;
      }
    }
  });
</script>

<MetaTags
  title="Real-Time Collaborative Diagram Editor | GoJS Diagramming Library"
  description="Work together with others on a single Diagram in real time with GoJS and YJS. This demo project shows how to integrate YJS into a GoJS app for real-time multiplayer interactions over the internet."
  projectTitle="gojs-collaborate"
  screenshot="collaborate.png"
/>

<div class="flex min-h-screen w-full">
  <!-- floating -->
  <button
    class="fixed top-0 right-0 z-50 m-4"
    onclick={e => {
      e.stopPropagation();
      currentTheme.set($currentTheme === 'light' ? 'dark' : 'light');
    }}
  >
    {#if $currentTheme === 'light'}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style="width: var(--svg-size); height: var(--svg-size)"
        fill="var(--ui-text)"
        viewBox="0 0 256 256"
        ><path
          d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"
        ></path></svg
      >
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style="width: var(--svg-size); height: var(--svg-size)"
        fill="var(--ui-text)"
        viewBox="0 0 256 256"
        ><path
          d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"
        ></path></svg
      >
    {/if}
  </button>

  <!-- main content -->
  <div class="bg-ui-secondary mx-auto flex max-w-[min(100vw,1080px)] grow flex-col">
    <div
      class="mx-2.5 mt-2 grid grid-cols-[1fr_auto_1fr] place-items-end justify-between gap-4 text-nowrap"
    >
      <!-- left -->
      <h1 class="justify-self-start">GoJS Collaborative Diagram</h1>

      <!-- center -->
      <div hidden class="flex justify-center gap-4">
        <label class="flex flex-row justify-center gap-2">
          <span>Is Global</span>
          <input
            autocomplete="off"
            bind:checked={isGlobal}
            id="delay"
            type="checkbox"
            min="0"
            max="1000"
            value="500"
          />
        </label>

        <label class="flex flex-row justify-center gap-2">
          <span>Latency</span>
          <input id="delay" type="range" min="0" max="1000" value="500" />
        </label>
      </div>
    </div>

    <div class="flex min-h-[500px] grow flex-col">
      {#snippet client(n: number)}
        <div class="flex grow flex-col">
          <p class="mx-auto">Client {n + 1}</p>
          <Diagram sync={syncDocFunc} clientN={n + 1} />
        </div>
      {/snippet}

      <!-- Regenerate the clients whenever connecting / disconnecting -->
      {#key isGlobal}
        {#if !isGlobal}
          <div class="grid grow grid-cols-2 gap-2">
            {#each Array(4) as _, i}
              {@render client(i)}
            {/each}
          </div>
        {:else}
          {@render client(1)}
        {/if}
      {/key}
    </div>

    <!-- text -->
    <div id="textContainer" class="m-4 flex flex-col gap-2">
      <p>
        This sample demonstrates collaborative <a target="_blank" href="https://gojs.net">GoJS</a>
        Diagrams in a real time multiplayer <a target="_blank" href="https://svelte.dev/">Svelte</a>
        app using <a target="_blank" href="https://yjs.dev/">YJS</a>.
      </p>

      <p>
        Multiple users can view and edit the Diagram simultaneously, with changes being synced
        between all connected clients. The position of each users cursor and the area they are
        currently selecting will be visible to all users. Additionally each client can see every one
        elses selected Parts.
      </p>

      <p>
        When a Node or Link is selected a mini cursor with the users unique color will appear and
        point to it. Multiple users can select the same objects, in this case multiple of these
        cursors will point to the Part.
      </p>

      <h2 class="mt-1">How it Works</h2>
      <p>
        Both Diagrams exist independently from one another with their own Model data, Node data
        array, and Link data array. Each also contains a Y Document which also contains it's own
        Node and Link data arrays.
      </p>

      <p>
        When client 1 makes a change to their Diagram that will change the
        <DocLink>Diagram.model</DocLink>. Then these changes will be replicated into client 1's Y
        document. From there the changes to the Y document are serialized and synced with other Y
        documents either locally or over the internet.
      </p>

      <p>
        When client 2's Y document sees the changes from client 1, client 2's Y document will
        update. Then the changes will be replicated into client 2's <DocLink>Diagram.model</DocLink
        >.
      </p>

      <h2 class="mt-1">Additional Notes</h2>
      <p>
        This project does nothing special to handle the <DocLink>UndoManager</DocLink> though for your
        own project you likely will want to.
      </p>

      <p>
        Currently all changes from other clients will skip the <DocLink>UndoManager</DocLink>, and
        changes from the current client will not. This way when client 1 performs an undo it will
        always undo their last action.
      </p>

      <p>
        This comes with a downside that if client 1 moves a Node, then client 2 moves the same Node.
        If client 1 now performs an undo will move back to the position it was at before client 1
        initially moved it, effectively undoing both client 1's and client 2's changes.
      </p>

      <p>
        For most cases what you would want is to make a custom Model only UndoManager since the only
        changes that get propagated between clients come from the <DocLink>Diagram.model</DocLink>.
        Then keep track of who last modifies each property within <code>Node.data</code> and
        <code>Link.data</code>. When a user now performs an undo or redo, filter through the
        <DocLink>Transaction.changes</DocLink> and remove any changes to properties that have been modified
        by other clients since the client performing the undo initially made their change.
      </p>

      <div class="bg-ui-primary mx-auto mt-6 h-[1px] w-full"></div>

      <p>
        We are happy to help you begin a proof-of-concept for your own project, regardless of your
        needs. <a href="https://nwoods.com/support.html" target="_blank">Contact us</a>
        for more information.
      </p>

      <div class="flex flex-row flex-wrap place-content-between">
        <div>
          <p>
            <a target="_blank" href="https://github.com/NorthwoodsSoftware/gojs-projects">
              The GoJS-Collaborate project source code can be found here
            </a>
          </p>
          <p>
            <a href="https://gojs.net" target="_blank">gojs.net</a> -
            <a href="https://gojs.net/latest/samples/" target="_blank">see all GoJS samples</a>
          </p>
        </div>

        <a
          class="button1 mt-auto"
          href="https://github.com/NorthwoodsSoftware/GoJS"
          target="_blank"
          aria-label="Open GoJS on GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            role="img"
            style="width: var(--svg-size); height: var(--svg-size)"
            viewBox="0 0 24 24"
          >
            <path
              fill="var(--ui-text)"
              d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            ></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>
