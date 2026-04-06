import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const GhostText = Extension.create({
  name: 'ghostText',

  addStorage() {
    return {
      text: '',
    };
  },

  addCommands() {
    return {
      setGhostText:
        (text) =>
        ({ editor, tr, dispatch }) => {
          this.storage.text = text;
          // Force a view update to render the decoration
          if (dispatch) dispatch(tr.setMeta('ghostTextUpdated', true));
          return true;
        },
      clearGhostText:
        () =>
        ({ editor, tr, dispatch }) => {
          this.storage.text = '';
          if (dispatch) dispatch(tr.setMeta('ghostTextUpdated', true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;

    return [
      new Plugin({
        key: new PluginKey('ghostText'),
        props: {
          decorations(state) {
            const { text } = storage;
            if (!text) return DecorationSet.empty;

            const { selection } = state;
            const { to } = selection;

            // Only show if selection is empty (just a cursor)
            if (!selection.empty) return DecorationSet.empty;

            const widget = Decoration.widget(to, () => {
              const container = document.createElement('span');
              container.className = 'nolan-ghost-text';
              
              // Handle multi-line suggestions
              const lines = text.split('\n');
              lines.forEach((line, index) => {
                const span = document.createElement('span');
                span.textContent = line;
                container.appendChild(span);
                if (index < lines.length - 1) {
                  container.appendChild(document.createElement('br'));
                }
              });
              
              return container;
            }, {
              side: 1, // Stay to the right of the cursor
            });

            return DecorationSet.create(state.doc, [widget]);
          },

          handleKeyDown(view, event) {
            const { state, dispatch } = view;
            const { text } = storage;

            if (!text) return false;

            // Tab to accept
            if (event.key === 'Tab') {
              event.preventDefault();
              const { to } = state.selection;
              
              // Insert the ghost text as real text
              const tr = state.tr.insertText(text, to);
              storage.text = ''; // Clear after accepting
              dispatch(tr);
              return true;
            }

            // Any other key clears the ghost text
            storage.text = '';
            dispatch(state.tr.setMeta('ghostTextUpdated', true));
            return false;
          },

          handleDOMEvents: {
            mousedown(view) {
              if (storage.text) {
                storage.text = '';
                view.dispatch(view.state.tr.setMeta('ghostTextUpdated', true));
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
