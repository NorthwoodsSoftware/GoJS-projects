<script lang="ts">
  // File/Edit/Options/View tabs at the top of the page
  // headerTabClicked indicates to the page which one is currently selected, subtle style changes with this as well
  let { title, headerTabClicked = $bindable(), element = $bindable() } = $props();
</script>

<button 
  class="pl-2 pr-6 py-0.5 rounded-tl dark:text-white hover:bg-gray-100 dark:hover:bg-fp-bg-darkish border border-t-0 border-r-0 
    {title === 'File' ? 'border-l-0' : 'border-r-0'} {title === 'View' ? 'border-r-1' : ''} 
    { title === 'View' && headerTabClicked !== title ? 'rounded-br' : ''} { headerTabClicked === title ? 'dark:bg-fp-bg-dark border-b-0' : ''}"
  onclick={() => headerTabClicked = String(title)} 
  bind:this={element}>
    {title}
</button>