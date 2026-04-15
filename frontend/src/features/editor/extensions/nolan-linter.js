import { Mark, mergeAttributes } from "@tiptap/core";

export const NolanLinter = Mark.create({
  name: "nolanLinter",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-linter-id"),
        renderHTML: (attributes) => ({
          "data-linter-id": attributes.id,
        }),
      },
      type: {
        default: "spelling", // spelling | inconsistency | creative
        parseHTML: (element) => element.getAttribute("data-linter-type"),
        renderHTML: (attributes) => {
          let className = "nolan-linter-spelling";
          if (attributes.type === "inconsistency") className = "nolan-linter-inconsistency";
          if (attributes.type === "creative") className = "nolan-linter-creative";
          
          return {
            "data-linter-type": attributes.type,
            class: `nolan-linter-mark ${className}`,
          };
        },
      },
      message: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-linter-message"),
        renderHTML: (attributes) => ({
          "data-linter-message": attributes.message,
        }),
      },
      suggestion: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-linter-suggestion"),
        renderHTML: (attributes) => ({
          "data-linter-suggestion": attributes.suggestion,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.nolan-linter-mark",
      },
      // Keep backward compatibility with old critique marks
      {
        tag: "span[data-critique-type]",
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setLinterMark:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetLinterMark:
        (id) =>
        ({ state, dispatch }) => {
          // Removes a specific mark by ID or all if no ID
          if (!id) {
            if (dispatch) {
              const { tr } = state;
              tr.removeMark(0, state.doc.content.size, state.schema.marks[this.name]);
              dispatch(tr);
            }
            return true;
          }
          
          const { tr } = state;
          const { doc } = tr;
          let docChanged = false;

          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks.filter(
                (mark) => mark.type.name === this.name && mark.attrs.id === id
              );
              if (marks.length > 0) {
                tr.removeMark(pos, pos + node.nodeSize, marks[0]);
                docChanged = true;
              }
            }
          });

          if (docChanged) {
            if (dispatch) dispatch(tr);
            return true;
          }
          return false;
        },
      // Custom command to selectively remove all marks dynamically
      clearAllLinterMarks:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        }
    };
  },
});
