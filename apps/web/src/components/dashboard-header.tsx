'use client';

import { useState, useEffect } from 'react';
import { RegionSelector, REGIONS, type RegionCode } from './region-selector';

interface DashboardHeaderProps {
  onRegionChange?: (region: RegionCode) => void;
}

export function DashboardHeader({ onRegionChange }: DashboardHeaderProps) {
  const [region, setRegion] = useState<RegionCode>('us');

  useEffect(() => {
    const saved = localStorage.getItem('odds-trader-region') as RegionCode;
    if (saved && REGIONS[saved]) {
      setRegion(saved);
    }
  }, []);

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
    onRegionChange?.(newRegion);
    // Trigger a page refresh to reload data with new region
    window.location.reload();
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 mt-1">
          Real-time arbitrage and middle opportunities
        </p>
      </div>
      <div className="flex items-center gap-4">
        <RegionSelector onRegionChange={handleRegionChange} />
        <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-neon-green/30 bg-neon-green/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
          </span>
          <span className="text-sm text-neon-green font-mono">LIVE</span>
          <span className="text-xs text-white/40">Auto-refresh 15s</span>
        </div>
      </div>
    </div>
  );
}
