<!--
  This component creates the API/DOC reference links
-->

<script lang="ts">
  import { type Snippet, onMount } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  let container: HTMLElement;

  let URL: string = $state('');
  let text: string = $state('');

  onMount(() => {
    // pull the text content out of the hidden container
    text = container.textContent?.trim() ?? '';

    // construct DOC URL
    const split = text.split('.');
    if (split.length !== 1 && split.length !== 2)
      throw new Error(`DOC reference is invalid: ${text}`);

    split[0] += '.html';
    URL = `https://gojs.net/latest/api/symbols/${split.join('#')}`;
  });
</script>

<!-- hidden span to capture text -->
<span bind:this={container} hidden>{@render children?.()}</span>

<!-- hyperlink -->
<a target="_blank" href={URL}><code>{text}</code></a>
