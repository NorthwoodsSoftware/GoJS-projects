<script lang="ts">
  // Custom resize handle that allows divs to be drag resized, currently used on the footer
  let { 
    div, 
    name, 
    resizing = $bindable(), 
    infoBarHeight = $bindable()
  } = $props();

  let isDraggingInfoBar = false;
  let startY = 0;
  let startHeight = 0;

  const handleStyles = [
    "w-full h-1 bg-fp-bg-lightish dark:bg-fp-bg-darkened hover:bg-gray-300 dark:hover:bg-fp-bg-darkish cursor-row-resize z-20", 
    "w-1 h-full bg-fp-bg-lightish dark:bg-fp-bg-darkened hover:bg-gray-300 dark:hover:bg-fp-bg-darkish cursor-col-resize z-20"
  ];
  const styleIndex = name === 'infoBar' ? 0 : 1;

  // Gets height of the bar and start coordinate of the mousepoint
  // Sets resizing to true to set the diagram size to screen so it doesn't lag behind the div moving
  function handleMouseDown(e: MouseEvent, name: string) {
    if (name === 'infoBar' && div) {
      isDraggingInfoBar = true;
      resizing = true;
      document.body.style.cursor = 'row-resize';
      startY = e.clientY;
      startHeight = div.offsetHeight;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Updates infoBarHeight based on displacement of the mousepoint
  function handleMouseMove(e: MouseEvent) {
    if (isDraggingInfoBar) {
      const dy = e.clientY - startY;
      infoBarHeight = Math.max(startHeight - dy, 100);
    }
  }

  // Removes event listeners, resets resizing variable
  function handleMouseUp() {
    document.body.style.cursor = 'auto';
    isDraggingInfoBar = false;
    resizing = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<button
  class={handleStyles[styleIndex]} 
  aria-label="infoBarDivider" 
  onmousedown={(e) => handleMouseDown(e, name)}
></button>