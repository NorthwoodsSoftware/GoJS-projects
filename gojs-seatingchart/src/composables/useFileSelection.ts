import { useDropZone, useFileDialog } from '@vueuse/core';
import { computed, unref, type MaybeRefOrGetter, type MaybeRef } from 'vue';

/**
 * File selection composable.
 * Combine VueUse useDropZone and useFileDialog.
 * https://github.com/vueuse/vueuse/issues/4085
 */
export function useFileSelection(options: UseFileSelectionOptions) {
  // Extract options
  const { dropzone, multiple, allowedDataTypes, onFiles } = options;

  // Data types computed ref
  const dataTypes = computed(() => {
    if (allowedDataTypes) {
      const dataTypes = unref(allowedDataTypes);
      if (typeof dataTypes === 'string') {
        return [dataTypes];
      }
      return dataTypes;
    }
    return undefined;
  });

  // Accept string computed ref
  const accept = computed(() => {
    if (Array.isArray(dataTypes.value)) {
      return dataTypes.value.join(',');
    }
    return '*';
  });

  // Handling of files drop
  const onDrop = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) {
      return;
    }
    if (files instanceof FileList) {
      files = Array.from(files);
    }
    if (files.length > 1 && !multiple) {
      files = [files[0]];
    }
    onFiles(files);
  };

  // Setup dropzone and file dialog composables
  const { isOverDropZone } = useDropZone(dropzone, { dataTypes: allowedDataTypes, onDrop });
  const { onChange, open } = useFileDialog({
    accept: accept.value,
    multiple: multiple
  });

  // Use onChange handler
  onChange((fileList) => onDrop(fileList));

  // Expose interface
  return {
    isOverDropZone,
    chooseFiles: open
  };
}

interface UseFileSelectionOptions {
  allowedDataTypes?: MaybeRef<readonly string[]> | ((types: readonly string[]) => boolean);
  dropzone: MaybeRefOrGetter<HTMLElement | null | undefined>;
  multiple: boolean;
  onFiles: (files: File[] | null) => void;
}
