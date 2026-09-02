'use client';

import React from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, MapPin, SlidersHorizontal, RotateCcw } from 'lucide-react';

export interface FilterState {
  keyword: string;
  city: string;
  workArrangement: string;
  experienceLevel: string;
  maxDistanceKm: number | undefined;
  minSalary: number;
}

interface JobFiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

export function JobFilters({ filters, onChange, onReset }: JobFiltersProps) {
  const cities = ['All Cities', 'Cebu City', 'Taguig / BGC', 'Makati City', 'Manila', 'Davao City'];
  const arrangements = ['All', 'Hybrid', 'Remote', 'On-site'];
  const levels = ['All Levels', 'Entry Level', 'Mid Level', 'Senior Level', 'Lead / Manager'];
  const radiusOptions = [
    { label: 'Any distance', value: undefined },
    { label: 'Within 5 km', value: 5 },
    { label: 'Within 10 km', value: 10 },
    { label: 'Within 25 km', value: 25 },
    { label: 'Within 50 km', value: 50 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border p-5 md:p-6 shadow-soft space-y-5">
      {/* Primary search bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Input
            placeholder="Search job title, skills, or company..."
            icon={<Search className="w-4 h-4" />}
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          />
        </div>
        <div>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary filter chips & sliders */}
      <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Work Arrangement */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Work Arrangement</label>
          <select
            value={filters.workArrangement}
            onChange={(e) => onChange({ ...filters, workArrangement: e.target.value })}
            className="w-full h-10 rounded-xl border border-border bg-white px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
          >
            {arrangements.map((arr) => (
              <option key={arr} value={arr}>{arr}</option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Experience Level</label>
          <select
            value={filters.experienceLevel}
            onChange={(e) => onChange({ ...filters, experienceLevel: e.target.value })}
            className="w-full h-10 rounded-xl border border-border bg-white px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
          >
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* Distance Radius */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Proximity Radius</label>
          <select
            value={filters.maxDistanceKm === undefined ? 'any' : filters.maxDistanceKm.toString()}
            onChange={(e) =>
              onChange({
                ...filters,
                maxDistanceKm: e.target.value === 'any' ? undefined : Number(e.target.value),
              })
            }
            className="w-full h-10 rounded-xl border border-border bg-white px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
          >
            {radiusOptions.map((opt) => (
              <option key={opt.label} value={opt.value === undefined ? 'any' : opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Salary Slider / Filter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700">Min Salary</span>
            <span className="font-bold text-mint-700">
              {filters.minSalary > 0 ? `₱${filters.minSalary.toLocaleString()} / mo` : 'Any'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100000"
            step="5000"
            value={filters.minSalary}
            onChange={(e) => onChange({ ...filters, minSalary: Number(e.target.value) })}
            className="w-full accent-mint-500 cursor-pointer h-2 bg-slate-100 rounded-lg"
          />
        </div>
      </div>

      {/* Reset Filter Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onReset}
          className="text-xs text-muted hover:text-dark flex items-center gap-1.5 font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
        </button>
      </div>
    </div>
  );
}
