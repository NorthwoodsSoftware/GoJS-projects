<script setup lang="ts">
import { reactive, watchEffect } from 'vue';
import type { FormSubmitEvent } from '@nuxt/ui';

const { name } = defineProps<{ name: string }>();

const emit = defineEmits(['submitted']);

const state = reactive({ name });
watchEffect(() => (state.name = name)); // update form state when props change

function onSubmit(_e: FormSubmitEvent<{ name: string }>) {
  emit('submitted', { name: state.name });
}
</script>

<template>
  <UForm :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Name">
      <UInput placeholder="Name" class="w-full" v-model="state.name" />
    </UFormField>
    <UButton type="submit">Update</UButton>
  </UForm>
</template>
