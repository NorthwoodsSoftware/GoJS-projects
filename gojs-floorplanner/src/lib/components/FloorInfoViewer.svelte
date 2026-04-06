<script lang="ts">
  // Box that shows data about the floor as a whole or the selected object
  // Takes a javscript object and displays the key value pairs
  let { data, title } = $props();
</script>

<div class="h-max max-h-[calc(100%-5px)] min-h-20 w-50 md:70 lg:w-100 border shadow rounded flex flex-col">
  <h2 class="border-b text-center dark:bg-fp-bg-darkish rounded-t">{title}</h2>
  <div class="py-2 flex-1 overflow-auto dark:bg-fp-bg-darkened">
    <p class="{!data ? 'hidden' : ''} text-center">
      {#if data}
        {#each Object.entries(data) as [key, value]}
          {key}: {value} <br>
        {/each}
      {/if}
    </p>
  </div>
</div>