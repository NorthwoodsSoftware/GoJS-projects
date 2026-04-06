<!-- This component manages meta tags for SEO, it is not important to how the project itself works -->

<script lang="ts">
// this script is used to define static parts of this component
let isMounted = false;
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const {
  title,
  description,
  projectTitle,
  screenshot,
  applicationCategory = 'DataVisualization'
} = defineProps<{
  title: string; // page title
  description: string; // page description
  projectTitle: string; // project title used for the url to the project, ex: projectTitle="gojs-jsondiagram" results in this link "gojs.net/latest/projects/gojs-jsondiagram/"
  screenshot: string; // screenshot for this project, ex: "jsondiagram.png"
  applicationCategory?: string; // Used for google search results, examples: "DataVisualization", "BusinessApplication", "DeveloperApplication"
}>();

let ldScript: HTMLScriptElement | null = null;
const ldJSON = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: title,
  applicationCategory: applicationCategory,
  operatingSystem: 'All',
  browserRequirements: 'Requires modern browser with JavaScript enabled',
  description: description
};

onMounted(() => {
  if (isMounted) throw new Error('Only one instance of MetaTags should be mounted at a time');
  isMounted = true;

  // append JSON-LD object to head
  ldScript = document.createElement('script');
  ldScript.type = 'application/ld+json';
  ldScript.innerHTML = JSON.stringify(ldJSON);
  document.head.append(ldScript);
});

onBeforeUnmount(() => {
  isMounted = false;

  // cleanup JSON-LD object
  if (ldScript) ldScript.remove();
});
</script>

<template>
  <teleport to="head">
    <!-- primary tags -->
    <link rel="icon" href="https://gojs.net/favicon.ico" />
    <title>{{ title }}</title>
    <meta name="description" :content="description" />

    <!-- Open Graph / Facebook -->
    <meta property="og:url" :content="`https://gojs.net/latest/projects/${projectTitle}/`" />
    <meta property="og:type" content="website" />
    <meta property="og:title" :content="title" />
    <meta property="og:description" :content="description" />
    <meta property="og:image" :content="`https://gojs.net/latest/assets/images/screenshots/${screenshot}`" />

    <!-- twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta property="twitter:domain" content="gojs.net" />
    <meta property="twitter:url" :content="`https://gojs.net/latest/projects/${projectTitle}/`" />
    <meta name="twitter:title" :content="title" />
    <meta name="twitter:description" :content="description" />
    <meta name="twitter:image" :content="` https://gojs.net/latest/assets/images/screenshots/${screenshot}  `" />
  </teleport>
</template>
