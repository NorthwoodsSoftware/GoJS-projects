<script lang='ts'>
  // Intro/Model/FloorInfo tabs at the top of the footer section
  let { pageSelected = $bindable(), text, id } = $props();
</script>

<div>
  <button 
    class="{ pageSelected === id ? 'dark:bg-fp-bg-dark' : 'hover:bg-fp-bg bg-gray-100 dark:bg-fp-bg-darkened dark:hover:bg-fp-bg-darkish'} 
      h-8 p-2 border border-t-0 border-l-0 rounded-t bg-fp-bg dark:text-white border-b-0"
    onclick={() => pageSelected = id}
  >
    <p class="-mt-1">{text}</p>
  </button>
  <!-- Div creates a thin rectangle that visually matches the border to give the non-selected tabs a bottom border
  while allowing the selected tab to have no visual border with the page -->
  <div 
    class="w-full h-[1px] border-r
      { pageSelected === id ? 'bg-fp-bg dark:bg-fp-bg-dark' : 'bg-gray-200 dark:bg-gray-700' }">
  </div>
</div>
