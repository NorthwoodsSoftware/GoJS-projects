<script lang="ts">
  // Menu option buttons that come up when selecting a header tab like File or Edit
  let { title, func } = $props();
</script>

<button class="block w-full text-left px-4 py-2 dark:bg-fp-bg-dark hover:bg-gray-100 
  dark:hover:bg-fp-bg-darkish dark:text-white whitespace-nowrap" onclick={func}>{title}</button>