import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Sparkles, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const CharacterNode = ({ data, id: nodeId, selected }) => {
  const { label, role, traits, image_url, project_id } = data;
  const [isGenerating, setIsGenerating] = useState(false);
  const token = useAuthStore(state => state.session?.access_token);

  const handleGenerate = async (e) => {
    e.stopPropagation();
    if (isGenerating || !project_id) return;

    try {
      setIsGenerating(true);
      await apiFetch(`/api/projects/${project_id}/characters/${label}/generate-image`, {
        method: 'POST'
      }, token);
      
      // Force a re-fetch of the graph in the parent if possible, but for now 
      // the user will see it on next load or refresh.
      // In a real app we'd trigger a context refresh here.
      window.location.reload(); // Simple refresh to show the new image
    } catch (err) {
      console.error("Failed to generate character image:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`
      relative w-56 bg-[#131316]/90 backdrop-blur-xl rounded-xl border transition-all duration-300
      ${selected ? 'border-[#ba9eff] shadow-[0_0_20px_rgba(186,158,255,0.3)]' : 'border-white/10'}
    `}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/5 rounded-t-xl">
        <User size={12} className="text-[#ba9eff]" />
        <span className="text-[10px] font-bold tracking-widest text-[#ba9eff] uppercase">Character</span>
      </div>

      {/* Image Area */}
      <div className="relative h-32 w-full overflow-hidden bg-black/40 group">
        {image_url ? (
          <img 
            src={image_url} 
            alt={label} 
            className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-110" 
          />
        ) : (
          <div 
            onClick={handleGenerate}
            className={`
              w-full h-full flex flex-col items-center justify-center gap-2 text-white/20 transition-all 
              ${!isGenerating ? 'cursor-pointer hover:bg-white/5 hover:text-white/40' : ''}
            `}
          >
            {isGenerating ? (
              <Loader2 size={24} className="animate-spin text-[#ba9eff]" />
            ) : (
              <>
                <Sparkles size={24} />
                <span className="text-[9px] uppercase tracking-tighter">AI Vision Pending</span>
                <span className="text-[7px] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">Click to Reveal</span>
              </>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131316] to-transparent opacity-60 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-1">
        <h3 className="text-sm font-bold text-white tracking-wide">{label}</h3>
        {role && (
          <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{role}</p>
        )}
        
        {traits?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {traits.slice(0, 2).map((trait, i) => (
              <span key={i} className="text-[8px] bg-[#ba9eff]/10 text-[#ba9eff] px-1.5 py-0.5 rounded border border-[#ba9eff]/20">
                {trait}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-[#ba9eff]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#ba9eff]" />
      <Handle type="source" position={Position.Left} className="!bg-[#ba9eff]/40" />
      <Handle type="target" position={Position.Right} className="!bg-[#ba9eff]/40" />
    </div>
  );
};

export default memo(CharacterNode);
