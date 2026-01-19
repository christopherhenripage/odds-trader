'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUniqueSports } from '@/lib/actions/opportunities';

export function OpportunitiesFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sports, setSports] = useState<string[]>([]);

  useEffect(() => {
    getUniqueSports().then(setSports);
  }, []);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (name: string, value: string) => {
    const queryString = createQueryString(name, value);
    router.push(`${pathname}?${queryString}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          value={searchParams.get('type') || 'all'}
          onValueChange={(value) => handleFilterChange('type', value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ARB">Arbitrage</SelectItem>
            <SelectItem value="MIDDLE">Middle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Sport</Label>
        <Select
          value={searchParams.get('sport') || 'all'}
          onValueChange={(value) => handleFilterChange('sport', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {sports.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Market</Label>
        <Select
          value={searchParams.get('market') || 'all'}
          onValueChange={(value) => handleFilterChange('market', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            <SelectItem value="h2h">Moneyline</SelectItem>
            <SelectItem value="totals">Totals</SelectItem>
            <SelectItem value="spreads">Spreads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Min Edge %</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          className="w-[100px]"
          placeholder="0"
          value={searchParams.get('minEdge') || ''}
          onChange={(e) => handleFilterChange('minEdge', e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Min Width</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          className="w-[100px]"
          placeholder="0"
          value={searchParams.get('minWidth') || ''}
          onChange={(e) => handleFilterChange('minWidth', e.target.value)}
        />
      </div>
    </div>
  );
}
