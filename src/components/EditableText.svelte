<script lang="ts">
  interface Props {
    tag?: string;
    value: string;
    canEdit: boolean;
    className?: string;
    style?: string;
    onchange: (value: string) => void;
  }

  let { tag = 'span', value, canEdit, className = '', style = '', onchange }: Props = $props();

  let isEditing = $state(false);
  let initialValue = $state(value);
  let element: HTMLElement | null = $state(null);
  let cancelled = $state(false);

  function enableEditing() {
    if (!canEdit) return;
    initialValue = value;
    isEditing = true;
    cancelled = false;
    requestAnimationFrame(() => {
      if (element) {
        element.focus({ preventScroll: true });
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }

  function commitChanges() {
    if (!element) return;
    const nextValue = element.innerText.trim();
    onchange(nextValue);
    isEditing = false;
  }

  function cancelChanges() {
    if (element) {
      element.innerText = initialValue;
    }
    cancelled = true;
    isEditing = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isEditing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitChanges();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelChanges();
    }
  }

  function handleBlur() {
    if (!isEditing) return;
    if (cancelled) {
      cancelled = false;
      return;
    }
    commitChanges();
  }

  $effect(() => {
    if (!isEditing && element && element.innerText !== value) {
      element.innerText = value;
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
  this={tag}
  bind:this={element}
  class="{className} {canEdit ? 'editable' : ''} {isEditing ? 'editing' : ''}"
  style={style || undefined}
  contenteditable={isEditing}
  onclick={enableEditing}
  onblur={handleBlur}
  onkeydown={handleKeydown}
  role={canEdit ? 'textbox' : undefined}
  aria-label={canEdit ? 'Редактируемый текст' : undefined}
  tabindex={canEdit ? 0 : undefined}
>{value}</svelte:element>
