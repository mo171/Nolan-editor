import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MapPin } from 'lucide-react';

const LocationNode = ({ data, selected }) => {
  return (
    <div className={`
      px-6 py-4 bg-[#0d1612]/90 backdrop-blur-xl border-2 rounded-2xl w-48 text-center transition-all duration-300
      ${selected ? 'border-[#69ffca] shadow-[0_0_20px_rgba(105,255,202,0.3)]' : 'border-[#69ffca]/20'}
    `}>
      <div className="flex flex-col items-center gap-2">
        <MapPin size={16} className="text-[#69ffca]" />
        <div>
          <span className="text-[9px] font-bold text-[#69ffca]/60 uppercase tracking-widest">Location</span>
          <h3 className="text-sm font-bold text-white tracking-wide">{data.label}</h3>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="!bg-[#69ffca]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#69ffca]" />
    </div>
  );
};

export default memo(LocationNode);
