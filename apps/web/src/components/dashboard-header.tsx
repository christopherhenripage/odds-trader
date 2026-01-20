'use client';

import { useState, useEffect } from 'react';
import { RegionSelector, REGIONS, NZ_NOTICE, type RegionCode } from './region-selector';
import { Info } from 'lucide-react';

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
    <div className="space-y-4">
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

      {/* NZ-specific notice */}
      {region === 'nz' && (
        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-cyan-400">{NZ_NOTICE.title}</h3>
              <p className="text-sm text-white/70 mt-1">{NZ_NOTICE.description}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {NZ_NOTICE.bookmakers.map((book) => (
                  <a
                    key={book.name}
                    href={book.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors"
                  >
                    {book.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
