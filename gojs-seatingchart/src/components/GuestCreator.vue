<script setup lang="ts">
import { reactive } from 'vue';
import type { FormSubmitEvent } from '@nuxt/ui';

const open = defineModel<boolean>();
const emit = defineEmits(['submitted']);

type State = { names: { name?: string }[] };
const state = reactive<State>({ names: [{}] });

function onSubmit(_e: FormSubmitEvent<State>) {
  emit('submitted', state.names);
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add guests"
    description="Enter guests' names to add them to the guest list."
    class="z-50 min-h-96"
    @after:leave="() => (state.names = [{}])">
    <template #body>
      <UForm :state="state" class="flex flex-col gap-4" @submit="onSubmit">
        <UFormField v-for="(item, index) in state.names" :key="index" label="Name">
          <UInput placeholder="New guest" class="w-full" v-model="item.name" />
        </UFormField>
        <UButton
          icon="i-lucide-plus"
          label="New guest"
          color="secondary"
          variant="outline"
          class="w-fit"
          @click="state.names.push({})" />
        <UButton type="submit" class="w-fit">Add guests</UButton>
      </UForm>
    </template>
  </UModal>
</template>
