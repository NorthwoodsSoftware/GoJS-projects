<script lang="ts">
  // Tool tip built to be inside a relative group that contains a button
  let { text } = $props();
</script>

<div class="absolute left-1/2 -translate-x-1/2 mt-1 hidden group-hover:flex bg-white rounded 
  w-max px-2 py-1 text-xs shadow justify-center pointer-events-none z-10">
  <!-- Arrow shape -->
  <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 
    border-l-transparent border-r-transparent border-b-white">
  </div>
  <!-- Text displayed -->
  {text}
</div>