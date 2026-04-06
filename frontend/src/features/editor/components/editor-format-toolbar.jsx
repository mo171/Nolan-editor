"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Minus,
  Undo2,
  Redo2,
  Wand2,
  LanguagesIcon,
  Palette,
} from "lucide-react";

function ToolbarButton({ onClick, isActive, title, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md text-xs transition-all duration-150 flex items-center gap-1 font-medium
        ${isActive
          ? "bg-primary/15 text-primary shadow-[0_0_8px_rgba(186,158,255,0.2)]"
          : "text-white/40 hover:text-white/80 hover:bg-white/5"
        } ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/8 mx-1 flex-shrink-0" />;
}

function SpecialButton({ onClick, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${className}`}
    >
      {label}
    </button>
  );
}

export function EditorFormatToolbar({ editor }) {
  if (!editor) return null;

  const isActive = (name, attrs) => editor.isActive(name, attrs);

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 bg-[#0e0e11] border-b border-white/5 flex-shrink-0 overflow-x-auto">
      {/* History */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo2 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={isActive("bulletList")}
        title="Bullet List"
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={isActive("code")}
        title="Inline Code"
      >
        <Code size={14} />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify size={14} />
      </ToolbarButton>

      <Divider />

      {/* Highlight */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={isActive("highlight")}
        title="Highlight"
      >
        <Highlighter size={14} />
      </ToolbarButton>

      {/* HR */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Scene Break"
      >
        <Minus size={14} />
      </ToolbarButton>

      <Divider />

      {/* Special Screenplay Buttons */}
      <SpecialButton
        label="+ Scene Break"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="border-white/10 text-white/50 hover:border-primary/40 hover:text-primary/80 bg-white/3"
      />
      <SpecialButton
        label="Call"
        className="border-white/10 text-white/50 hover:border-[#69daff]/40 hover:text-[#69daff]/80 bg-white/3"
      />
      <SpecialButton
        label="Match Style"
        className="border-white/10 text-white/50 hover:border-white/20 hover:text-white/70 bg-white/3"
      />
      <SpecialButton
        label="Translate"
        className="border-white/10 text-white/50 hover:border-white/20 hover:text-white/70 bg-white/3 flex items-center gap-1"
        onClick={() => {}}
      />

      <Divider />

      {/* LIVE indicator */}
      <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-400">LIVE</span>
      </div>
    </div>
  );
}
