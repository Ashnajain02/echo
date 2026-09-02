import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FutureLetterNodeView from './FutureLetterNodeView';

/**
 * "Future Letter" block — an inline composer a user can drop into an entry
 * while writing (via the mail icon in RichTextEditor's toolbar), for a short
 * letter to their future self. Rendered live as an editable inline composer
 * by FutureLetterNodeView while the editor is mounted; once sealed it
 * collapses to a small, quiet envelope mark — like a real sealed envelope,
 * not re-openable or even labeled here.
 *
 * The message travels invisibly in a `data-message` attribute so it
 * survives draft autosave/reload; it's read back out and turned into a real
 * future_letters row (then stripped) by processPendingFutureLetters at
 * publish/save time. See @/utils/futureLetters.
 */
export const FutureLetterNode = Node.create({
  name: 'futureLetter',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      message: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-message') || '',
        renderHTML: (attrs) => (attrs.message ? { 'data-message': attrs.message } : {}),
      },
      sealed: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-sealed') === 'true',
        renderHTML: (attrs) => ({ 'data-sealed': attrs.sealed ? 'true' : 'false' }),
      },
      // Set once processPendingFutureLetters turns this chip into a real
      // future_letters row — lets the read-only view (JournalEntryFullView)
      // find this exact DOM node and portal the live, interactive card
      // (sealed countdown / open / reveal + reply) directly into it, so the
      // whole lifecycle plays out in this one box instead of a second one
      // bolted on elsewhere.
      letterId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-letter-id') || null,
        renderHTML: (attrs) => (attrs.letterId ? { 'data-letter-id': attrs.letterId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-future-letter]' }];
  },

  // Static fallback markup — only used where there's no editor/NodeView
  // mounted (e.g. InteractiveContent's read-only dangerouslySetInnerHTML,
  // or editor.getHTML() serialization). An un-sealed node renders nothing
  // visible: if a composer was abandoned mid-draft and saved anyway, it
  // shouldn't masquerade as a real sealed letter when read back.
  renderHTML({ node, HTMLAttributes }) {
    if (!node.attrs.sealed) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-future-letter': 'true', style: 'display:none' })];
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-future-letter': 'true',
        class: 'future-letter-envelope-wrap',
        contenteditable: 'false',
      }),
      [
        'http://www.w3.org/2000/svg svg',
        {
          viewBox: '0 0 64 48',
          class: 'future-letter-envelope-svg',
          role: 'img',
          'aria-label': 'A sealed letter',
        },
        ['rect', { x: '2', y: '2', width: '60', height: '44', rx: '3', class: 'future-letter-envelope-body' }],
        ['path', { d: 'M2,2 L62,2 L32,26 Z', class: 'future-letter-envelope-flap' }],
        ['circle', { cx: '32', cy: '24', r: '3.5', class: 'future-letter-envelope-seal' }],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FutureLetterNodeView);
  },
});
