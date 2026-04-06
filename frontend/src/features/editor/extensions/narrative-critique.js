import { Mark, mergeAttributes } from "@tiptap/core";

export const NarrativeCritique = Mark.create({
  name: "narrativeCritique",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: "violet",
        parseHTML: (element) => element.getAttribute("data-critique-type"),
        renderHTML: (attributes) => ({
          "data-critique-type": attributes.type,
          class: attributes.type === "blue" ? "critique-blue" : "critique-violet",
        }),
      },
      message: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-critique-message"),
        renderHTML: (attributes) => ({
          "data-critique-message": attributes.message,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-critique-type]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCritique:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleCritique:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetCritique:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
