<!--
  This component manages the title, description, and other meta tags used for SEO
-->

<script module>
  // this module script is used to define static parts of this component
  let isMounted = false;
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    title: string; // page title
    description: string; // page description
    projectTitle: string; // project title used for the url to the project, ex: "gojs.net/latest/projects/gojs-jsondiagram/"
    screenshot: string; // screenshot for this project, ex: "jsondiagram.png"
    applicationCategory?: string; // Used for google search results, examples: "DataVisualization", "BusinessApplication", "DeveloperApplication"
  }

  let {
    title,
    description,
    projectTitle,
    screenshot,
    applicationCategory = 'DataVisualization'
  }: Props = $props();

  const ldJSON = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    applicationCategory: applicationCategory,
    operatingSystem: 'All',
    browserRequirements: 'Requires modern browser with JavaScript enabled',
    description: description
  };

  // throw warnings in the browser not the server
  onMount(() => {
    if (isMounted) throw new Error('Only one instance of MetaTags should be mounted at a time');

    if (typeof title !== 'string') console.warn('MetaTags is missing a title!');
    if (typeof description !== 'string') console.warn('MetaTags is missing a description!');
    if (typeof projectTitle !== 'string') console.warn('MetaTags is missing a projectTitle!');
    if (typeof screenshot !== 'string') console.warn('MetaTags is missing a screenshot!');

    isMounted = true;
  });

  onDestroy(() => {
    isMounted = false;
  });
</script>

<!-- add to page head -->
<svelte:head>
  <!-- primary tags -->
  <link rel="icon" href="https://gojs.net/favicon.ico" />
  <title>{title}</title>
  <meta name="description" content={description} />

  <!-- google search results -->
  {@html `<script type="application/ld+json">${JSON.stringify(ldJSON)}</script>`}

  <!-- Open Graph / Facebook -->
  <meta property="og:url" content={`https://gojs.net/latest/projects/${projectTitle}/`} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta
    property="og:image"
    content={`https://gojs.net/latest/assets/images/screenshots/${screenshot}`}
  />

  <!-- twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:domain" content="gojs.net" />
  <meta property="twitter:url" content={`https://gojs.net/latest/projects/${projectTitle}/`} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta
    name="twitter:image"
    content={` https://gojs.net/latest/assets/images/screenshots/${screenshot}  `}
  />
</svelte:head>
