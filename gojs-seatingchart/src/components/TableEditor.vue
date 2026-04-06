<script setup lang="ts">
import { reactive, ref, watchEffect } from 'vue';
import type { FormError, FormSubmitEvent } from '@nuxt/ui';

const {
  type = 'rect',
  name = 'Table',
  seats = 8,
  mode = 'update'
} = defineProps<{
  type?: string;
  name?: string;
  seats?: number;
  mode: 'create' | 'update';
}>();

const types = ref([
  { label: 'Rectangle', value: 'rect' },
  { label: 'Circle', value: 'circle' },
  { label: 'Head', value: 'head' }
]);

const emit = defineEmits(['submitted']);

type State = { type: string; name: string; seats: number };
const state = reactive({ type, name, seats });
watchEffect(() => {
  state.type = type;
  state.name = name;
  state.seats = seats;
}); // update form state when props change

const validate = (state: Partial<State>): FormError[] => {
  const errors = [];
  if (state.type === 'rect' && state.seats && state.seats % 2 !== 0)
    errors.push({ name: 'seats', message: 'Rectangle tables require even seats.' });
  return errors;
};

function onSubmit(_e: FormSubmitEvent<State>) {
  emit('submitted', { category: state.type, name: state.name, seats: state.seats });
}
</script>

<template>
  <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
    <UFormField label="Table type" name="type">
      <URadioGroup v-model="state.type" :items="types" />
    </UFormField>
    <UFormField label="Table name" name="name">
      <UInput placeholder="Table name" class="w-full" v-model="state.name" />
    </UFormField>
    <UFormField label="Seats" name="seats">
      <UInputNumber
        placeholder="Seats"
        class="w-full"
        :min="0"
        :step="state.type === 'rect' ? 2 : 1"
        v-model="state.seats" />
    </UFormField>
    <UButton type="submit">{{ mode === 'update' ? 'Update' : 'Add' }}</UButton>
  </UForm>
</template>
