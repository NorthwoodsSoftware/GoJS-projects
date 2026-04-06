<script lang="ts">
  // Makes up a section of the question mark help page that contains a title, bullet point info, a picture
  let { title, bulletPoints, imgLink } = $props();
</script>

<div class="flex justify-between flex-wrap mx-6 mb-4">
  <div class="flex-2 min-w-100 mr-10">
    <h3 class="text-xl mb-3">{title}</h3>
    <ul class="list-disc px-3">
      {#each bulletPoints as point}
        <li class="py-1">{point}</li>
      {/each}
    </ul>
  </div>
  <img src={imgLink} alt="Wall Builder Help" class="flex-1 min-w-80 h-auto self-center rounded">
</div>