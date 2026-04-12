"use client";

import { RefreshCw } from "lucide-react";

export default function EditablePanel({ panelData, onUpdate }) {
  if (!panelData) return null;

  const handleTopTextChange = (e) => {
    onUpdate({ ...panelData, topText: e.target.value });
  };

  const handleBottomTextChange = (e) => {
    onUpdate({ ...panelData, bottomText: e.target.value });
  };

  return (
    <div id="comic-canvas" className="w-[800px] bg-white rounded flex flex-col p-8 text-black shadow-2xl relative">
      
      {/* Top Banner Text */}
      <div className="w-full bg-[#fdfdd0] border-4 border-black p-4 text-center font-bold font-sans uppercase mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] relative group">
        <textarea 
          value={panelData.topText}
          onChange={handleTopTextChange}
          className="w-full bg-transparent border-none outline-none resize-none text-center font-bold focus:bg-yellow-100/50"
          rows={2}
        />
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full aspect-[16/9] border-4 border-black mb-6 bg-gray-200 group overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <img 
          src={panelData.imageUrl} 
          alt="Comic Panel" 
          className="w-full h-full object-cover"
        />
        
        {/* Hover Regenerate Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm">
           <div className="px-6 py-3 bg-white text-black font-bold flex items-center gap-2 rounded hover:scale-105 active:scale-95 transition-all">
             <RefreshCw size={18} />
             REGENERATE IMAGE
           </div>
        </div>

        {/* Speech Bubbles (Draggable mock) */}
        {panelData.bubbles && panelData.bubbles.map((bubble, idx) => (
          <div 
            key={idx}
            className="absolute bg-white border-[3px] border-black px-6 py-3 rounded-[50%] font-bold text-sm uppercase text-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] cursor-move hover:bg-gray-100"
            style={{ top: `${bubble.y}%`, left: `${bubble.x}%`, transform: 'translate(-50%, -50%)'}}
          >
            {bubble.text}
            {/* The little tail */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-black"></div>
            <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[10px] border-t-white"></div>
          </div>
        ))}
      </div>

      {/* Bottom Banner Text */}
      <div className="w-[80%] mx-auto bg-white border-4 border-black p-4 text-center font-bold font-sans rounded-[40px] uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] group relative">
        <textarea 
          value={panelData.bottomText}
          onChange={handleBottomTextChange}
          className="w-full bg-transparent border-none outline-none resize-none text-center font-bold focus:bg-gray-100/50"
          rows={3}
        />
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </div>
      </div>

    </div>
  );
}
