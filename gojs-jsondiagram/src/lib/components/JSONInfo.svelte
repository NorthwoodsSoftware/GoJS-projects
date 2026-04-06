<!--
  This modal manages the Monaco code editor. This includes finding the property that the cursor is
  placed on. It also creates the valid/invalid status button and error popup
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PopupBox from '$lib/components/PopupBox.svelte';
  import ButtonPopup from '$lib/components/ButtonPopup.svelte';
  import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
  import { currentTheme } from '$lib/stores';
  import type { DataManager } from '$lib/dataManager.svelte';
  import type { Unsubscriber } from 'svelte/store';

  interface Props {
    dataManager: DataManager;
    selectionChanged: Function; // call this when cursor position changes
  }

  let { dataManager = $bindable(), selectionChanged }: Props = $props();

  let isValid = $state(true);
  let error = $state('');

  const REASON = 'editor';

  let infoDiv: HTMLDivElement;
  let resizeBar: HTMLDivElement;
  let monacoDiv: HTMLDivElement;

  let editor: Monaco.editor.IStandaloneCodeEditor;
  let monaco: typeof Monaco;

  let themeUnsub: Unsubscriber;
  let dataUnsub: Unsubscriber;

  // if it takes longer than debounceLagThresh ms to update the diagram then wait debounceDelay ms
  // after a change to update the diagram
  const debounceDelay = 500; // milliseconds
  const debounceLagThresh = 75; // milliseconds

  let _doDebounce = false; // on next input do debounce delay
  let _debounceTimeout: NodeJS.Timeout | null = null; // keep track of setTimeout for debounce

  // find the list of keys to get to the given value in the given object
  function findKeyPath(obj: any | object, value: any): Array<string | number> {
    if (typeof obj !== 'object' || obj === null) return [];

    const isArr = Array.isArray(obj);

    const arr = Object.entries(obj);
    for (let i = 0; i < arr.length; i++) {
      const k = isArr ? Number(arr[i][0]) : arr[i][0];
      const v = arr[i][1];

      if (v === value) {
        return [k];
      } else {
        const tArr = findKeyPath(obj[k], value);
        if (tArr.length > 0) return [k, ...tArr];
      }
    }

    return [];
  }

  // return true or false if it was successful
  function tryParseAndSelect(
    str: string,
    searchValue: string,
    ignoreLast = false,
    mutate: Function | null = null
  ): boolean {
    let obj = null;
    try {
      obj = JSON.parse(str);
    } catch {
      return false;
    }

    if (obj) {
      let keys = findKeyPath(obj, searchValue);
      if (ignoreLast) keys = keys.slice(0, -1);
      selectionChanged(typeof mutate === 'function' ? mutate(keys) : keys);
    }

    return true;
  }

  // return true or false if it was successful
  function findPathToCursor(
    text: string,
    char: number,
    closeAll: string,
    quotes: number[],
    colons: number[]
  ): boolean {
    let str: string;

    // this should never be a value that already exists in the string
    const searchValue: string = Array.from({ length: 64 }, () => Math.random() + '').join('');
    if (quotes.length % 2 === 1) {
      // inside a quote means either inside a key or inside a value
      // find where the string ends
      let qIdx = -1;
      for (let i = char; i < text.length; i++) {
        const c = text[i];
        const nc = text[i + 1];
        if (c === '\\' && nc === '\\') {
          i++;
          continue;
        } else if (c === '\\' && nc === '"') {
          i++;
          continue;
        }

        if (c === '"') {
          qIdx = i;
          break;
        }
      }

      if (qIdx < 0) return false;

      // guess and check for inside key str
      str = text.substring(0, qIdx + 1);
      str += `: "${searchValue}"`;
      str += closeAll;

      if (tryParseAndSelect(str, searchValue)) return true;

      // if not returned, must be inside value str
      str = text.substring(0, quotes.at(-1));
      str += `"${searchValue}"`;
      str += closeAll;

      if (tryParseAndSelect(str, searchValue)) return true;
    }

    // guess and check if inside non string value
    const check = '0123456789truefals';
    if (check.includes(text[char]) || check.includes(text[char - 1])) {
      // go back to pos of last colon
      if (colons.length) {
        str = text.substring(0, (colons.at(-1) ?? 0) + 1);
        str += `"${searchValue}"`;
        str += closeAll;
        if (tryParseAndSelect(str, searchValue)) return true;
      }
    }

    // guess and check if inside random white space
    str = text.substring(0, char);
    str += `"${Math.random()}": "${searchValue}"`;
    str += closeAll;
    if (tryParseAndSelect(str, searchValue, true)) return true;

    str = text.substring(0, char);
    str += `,"${Math.random()}": "${searchValue}"`;
    str += closeAll;
    if (tryParseAndSelect(str, searchValue, true)) return true;

    str = text.substring(0, char);
    str += `"${Math.random()}": "${searchValue}",`;
    str += closeAll;
    if (tryParseAndSelect(str, searchValue, true)) return true;

    // guess and check if inside a list
    str = text.substring(0, char);
    str += `"${searchValue}"`;
    str += closeAll;
    if (tryParseAndSelect(str, searchValue)) return true;

    // check if we are inside a null value, still inside the list
    const alphaCheck = 'nul';
    if (alphaCheck.includes(text[char]) && alphaCheck.includes(text[char - 1])) {
      // it is given that we are not inside a string so we can walk backwards
      let testChar = char;
      while (text[testChar] !== ',' && testChar > 0) testChar--;
      str = text.substring(0, testChar + 1);
      str += `"${searchValue}"`;
      str += closeAll;
      if (tryParseAndSelect(str, searchValue, false)) return true;
    }

    str = text.substring(0, char);
    str += `,"${searchValue}"`;
    str += closeAll;
    // if we need to add an element to the end of the list then we must -1 from idx
    if (
      tryParseAndSelect(str, searchValue, false, (arr: Array<number>) => {
        arr[arr.length - 1] -= 1;
        return arr;
      })
    )
      return true;

    return false;
  }

  onMount(async () => {
    monaco = (await import('../monaco')).default;

    editor = monaco.editor.create(monacoDiv, {
      minimap: { enabled: false },
      lineNumbersMinChars: 4,
      scrollBeyondLastLine: false,
      automaticLayout: false
    });
    const model = monaco.editor.createModel(dataManager.toJSON(), 'json');
    editor.setModel(model);

    editor.onDidChangeModelContent(e => {
      // if whole content was changed at once then don't run this, this happens when propagating
      // updates from the diagram
      if (e.isFlush) return;

      const text = editor.getValue();

      let parsedObj: any;
      try {
        parsedObj = JSON.parse(text);
        isValid = true;
      } catch (e) {
        error = e + '';
        error = error.replace('SyntaxError: ', '');
        error = error.replace('JSON.parse: ', '');
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      // measure how long it takes to update the data, if it's taking too long then start a timeout
      // to do the update after the user stops inputing new data
      if (_debounceTimeout) {
        clearTimeout(_debounceTimeout);
      }

      if (_doDebounce) {
        _debounceTimeout = setTimeout(() => {
          dataManager.updateDataFromObject(parsedObj, undefined, REASON).then(time => {
            if (time > debounceLagThresh) {
              _doDebounce = true;
            } else {
              _doDebounce = false;
            }
          });
        }, debounceDelay);
      } else {
        dataManager.updateDataFromObject(parsedObj, undefined, REASON).then(time => {
          if (time > debounceLagThresh) {
            _doDebounce = true;
          } else {
            _doDebounce = false;
          }
        });
      }
    });

    editor.onDidChangeCursorPosition((e: any) => {
      // when the JSON is "flushed" it resets cursor position to 0. In that case do nothing
      if (e.source === 'model') return;

      const position = e.position;
      const row = position.lineNumber;
      const col = position.column;

      const text = editor.getValue() as string;
      const char =
        text
          .split('\n')
          .slice(0, row - 1)
          .reduce((prev, cur) => prev + cur.length + 1, 0) +
        col -
        1;

      // iterate through from the beggining summing open and closed stuff
      let nBrace = 0; // 0 = not enclosed in any
      let nBracket = 0; // 0 = not enclosed in any

      const colons: number[] = []; // list of colon positions
      const quotes: number[] = []; // list of quote positions
      const bbList: string[] = []; // close brace/bracket list

      for (let n = 0; n < char; n++) {
        const pc = text[n - 1];
        const c = text[n];
        const nc = text[n + 1];

        // skip \\ and \"
        if (c === '\\' && nc === '\\') {
          n++;
          continue;
        } else if (c === '\\' && nc === '"') {
          n++;
          continue;
        }

        if (c === '"') {
          quotes.push(n);
          continue;
        }

        // if even then this is not inside quotes
        if (quotes.length % 2 === 0) {
          switch (c) {
            case ':':
              colons.push(n);
              break;
            case '{':
              bbList.push('}');
              nBrace++;
              break;
            case '}':
              bbList.pop(); // assume correct
              nBrace--;
              break;
            case '[':
              bbList.push(']');
              nBracket++;
              break;
            case ']':
              bbList.pop(); // assume correct
              nBracket--;
              break;
            default:
              break;
          }
        }
      }

      // string for closing all brackets and braces
      const closeAll = bbList.reverse().reduce((prev, cur) => prev + cur.toString(), '');

      if (!findPathToCursor(text, char, closeAll, quotes, colons)) {
        if (quotes.length) {
          findPathToCursor(text, quotes.at(-1) ?? -1, closeAll, quotes.slice(0, -1), colons);
        }
      }
    });

    themeUnsub = currentTheme.subscribe(theme => {
      if (theme === 'dark') monaco.editor.setTheme('vs-dark');
      else monaco.editor.setTheme('vs');
    });

    const resizeListener = (ev: MouseEvent) => {
      const x = ev.clientX;
      const parent = infoDiv.parentElement;

      if (parent)
        infoDiv.style.width = `calc(max(min(${(x / window.innerWidth) * 100}vw, 85vw), 15vw))`;
      else infoDiv.style.width = `calc(max(min(${x}px, 85vw), 15vw))`;

      editor.layout();

      ev.stopPropagation();
    };
    resizeBar.addEventListener('mousedown', () => {
      window.addEventListener('mousemove', resizeListener);
    });
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', resizeListener);
    });

    // monaco doesn't resize when the window grows on its own so do it manually
    const diff = window.innerHeight - monacoDiv.clientHeight;
    window.addEventListener('resize', (ev: UIEvent) => {
      if (!monacoDiv) return;
      monacoDiv.style.height = `calc(100vh - ${diff}px)`;
      editor.layout();
    });
  });

  onDestroy(() => {
    monaco?.editor.getModels().forEach(model => model.dispose());
    editor?.dispose();
    if (themeUnsub) themeUnsub();
    if (dataUnsub) dataUnsub();
  });

  dataUnsub = dataManager.subscribe((pairs, keys, reason) => {
    if (!editor || reason === REASON) return;
    const json = dataManager.toJSON();

    editor.setValue(json);

    // clear selection when dataManager is source of change, this happens when a file is loaded
    if (reason === '') selectionChanged(null);
  }, false); // false to get notified after dataManager.data is updated
</script>

<div bind:this={infoDiv} class="relative flex w-90 flex-col overflow-visible">
  <div bind:this={monacoDiv} class="h-full w-full"></div>
  <div
    bind:this={resizeBar}
    class="absolute right-0 z-50 h-full w-2 translate-x-1/2 cursor-w-resize bg-blue-500 opacity-0 transition-opacity duration-200 hover:opacity-100"
  ></div>

  <div
    class="bg-ui-primary border-ui-secondary center flex flex-row place-content-between border-t-2 px-1 font-mono"
  >
    <ButtonPopup
      text={isValid ? `&#10003; Valid` : `&#10005; Invalid`}
      textColor={$currentTheme === 'light'
        ? isValid
          ? 'var(--color-green-600)'
          : 'var(--color-rose-600)'
        : isValid
          ? 'var(--color-green-400)'
          : 'var(--color-rose-400)'}
      trigger={'hover'}
    >
      {#if !isValid}
        <PopupBox background={'var(--ui-error)'} desiredSpot="top">
          <p class="px-3 py-1 text-white">{error}</p>
        </PopupBox>
      {/if}
    </ButtonPopup>

    <div id="loading" class="mx-1 flex flex-row flex-nowrap items-center gap-1 text-xs">
      <img
        class="spinner dark:invert"
        src="/images/circle-notch.png"
        style="width: 16px; height: 16px"
        alt=""
      />
      <span id="complete" class="">&#10003;</span>
      <span>Loading</span>
    </div>
  </div>
</div>

<style>
  #loading {
    animation: fadeIn 0.2s cubic-bezier(0.7, 0, 0.84, 0) forwards;
  }

  #complete {
    display: none;
  }
  :global(.complete) #complete {
    display: unset;
  }

  :global(.complete) .spinner {
    display: none;
  }
  .spinner {
    will-change: transform;
    display: unset;
    animation: spin 1s linear infinite;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
