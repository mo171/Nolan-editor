import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Type } from 'lucide-react';

const SceneNode = ({ data, selected }) => {
  return (
    <div className={`
      px-6 py-4 bg-[#1a1410]/90 backdrop-blur-xl border-2 rounded-2xl w-48 text-center transition-all duration-300
      ${selected ? 'border-[#ff9d69] shadow-[0_0_20px_rgba(255,157,105,0.3)]' : 'border-[#ff9d69]/20'}
    `}>
      <div className="flex flex-col items-center gap-2">
        <Type size={16} className="text-[#ff9d69]" />
        <div>
          <span className="text-[9px] font-bold text-[#ff9d69]/60 uppercase tracking-widest">Scene / Lore</span>
          <h3 className="text-sm font-bold text-white tracking-wide">{data.label}</h3>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="!bg-[#ff9d69]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#ff9d69]" />
    </div>
  );
};

export default memo(SceneNode);
