<script lang="ts">
  // Alerts user at the top of the diagram if they try to create a room with an invalid selection
  let { visBool, message } = $props();
</script>

<div class="fixed flex bg-white text-black text-sm p-2 rounded shadow-lg left-1/2 -translate-x-1/2  translate-y-2 { visBool ? '' : 'hidden'}">
  <div class="text-lg mr-5"><b>!</b></div>
  <div class="text-center">{@html message}</div>
</div>