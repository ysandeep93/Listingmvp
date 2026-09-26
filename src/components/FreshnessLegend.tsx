import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface Props {
  totalActive: number;
  totalGreen: number;
  totalAmber: number;
  onSimulateAging?: () => void;
}

export const FreshnessLegend: React.FC<Props> = ({
  totalActive,
  totalGreen,
  totalAmber,
  onSimulateAging,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-4 left-3 right-3 sm:right-auto sm:max-w-md z-[990] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-2.5 sm:p-3 text-xs text-slate-700 transition-all">
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
        {/* Fresh Pin Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">≤2d Fresh</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {totalGreen}
          </span>
        </div>

        {/* Amber Pin Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">3–7d</span>
          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {totalAmber}
          </span>
        </div>

        {/* Desktop Self-cleaning Info */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-500 border-l border-slate-200 pl-3 text-[11px]">
          <span>Auto-expires in 7d</span>
        </div>

        {/* Simulate Aging Button */}
        {onSimulateAging && (
          <button
            onClick={onSimulateAging}
            title="Demonstrate 7-day pin expiration"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg text-[10px] sm:text-[11px] border border-slate-200 transition-colors ml-auto active:scale-95 shrink-0"
          >
            ⏱️ +1 Day
          </button>
        )}
      </div>
    </div>
  );
};
