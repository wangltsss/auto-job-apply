import { cleanText } from './text.js';

interface InternalFieldInput {
  tagName: string;
  typeAttr: string | null;
  idAttr: string | null;
  nameAttr: string | null;
  ariaLabel: string | null;
  role: string | null;
  visible: boolean;
}

export function isInternalControl(input: InternalFieldInput): boolean {
  const type = (input.typeAttr ?? '').toLowerCase();
  const id = cleanText(input.idAttr ?? '').toLowerCase();
  const name = cleanText(input.nameAttr ?? '').toLowerCase();
  const aria = cleanText(input.ariaLabel ?? '').toLowerCase();
  const role = (input.role ?? '').toLowerCase();

  if (type === 'hidden') {
    return true;
  }

  if (!input.visible && role !== 'combobox') {
    return true;
  }

  if (/^iti-\d+__search-input$/.test(id) || /^iti-\d+__search-input$/.test(name)) {
    return true;
  }

  if (id.includes('__search-input') || name.includes('__search-input')) {
    return true;
  }

  if ((id.includes('search') || name.includes('search')) && aria === 'search' && input.tagName === 'input') {
    return true;
  }

  return false;
}

export function shouldMarkOptionsDeferred(type: string, optionsLength: number): boolean {
  if ((type === 'combobox' || type === 'select' || type === 'radio') && optionsLength === 0) {
    return true;
  }
  return false;
}
