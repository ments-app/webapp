"use client";

import { Plus, X, TrendingUp } from 'lucide-react';

type FundingRound = {
  investor: string;
  amount: string;
  round_type: string;
  round_date: string;
  is_public: boolean;
};

type Incubator = {
  program_name: string;
  year: number | '';
};

type AwardItem = {
  award_name: string;
  year: number | '';
};

type Step5Props = {
  fundingRounds: FundingRound[];
  incubators: Incubator[];
  awards: AwardItem[];
  isActivelyRaising: boolean;
  onFundingChange: (rounds: FundingRound[]) => void;
  onIncubatorsChange: (incubators: Incubator[]) => void;
  onAwardsChange: (awards: AwardItem[]) => void;
  onRaisingChange: (raising: boolean) => void;
};

const roundTypes = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'other', label: 'Other' },
];

export function Step5FundingRecognition({
  fundingRounds, incubators, awards, isActivelyRaising,
  onFundingChange, onIncubatorsChange, onAwardsChange, onRaisingChange,
}: Step5Props) {

  // Funding rounds
  const addRound = () => {
    onFundingChange([...fundingRounds, { investor: '', amount: '', round_type: '', round_date: '', is_public: true }]);
  };
  const removeRound = (i: number) => onFundingChange(fundingRounds.filter((_, idx) => idx !== i));
  const updateRound = (i: number, field: string, value: string | boolean) => {
    const updated = [...fundingRounds];
    updated[i] = { ...updated[i], [field]: value };
    onFundingChange(updated);
  };

  // Incubators
  const addIncubator = () => onIncubatorsChange([...incubators, { program_name: '', year: '' }]);
  const removeIncubator = (i: number) => onIncubatorsChange(incubators.filter((_, idx) => idx !== i));
  const updateIncubator = (i: number, field: string, value: string | number) => {
    const updated = [...incubators];
    updated[i] = { ...updated[i], [field]: value };
    onIncubatorsChange(updated);
  };

  // Awards
  const addAward = () => onAwardsChange([...awards, { award_name: '', year: '' }]);
  const removeAward = (i: number) => onAwardsChange(awards.filter((_, idx) => idx !== i));
  const updateAward = (i: number, field: string, value: string | number) => {
    const updated = [...awards];
    updated[i] = { ...updated[i], [field]: value };
    onAwardsChange(updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Funding & Recognition</h2>
        <p className="text-sm text-muted-foreground">Showcase your milestones (all optional)</p>
      </div>

      {/* Actively Raising Toggle */}
      <div className="flex items-center justify-between p-4 bg-accent/20 border border-border/50 rounded-xl">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Actively Raising</p>
            <p className="text-xs text-muted-foreground">Show a &quot;Raising&quot; badge on your profile</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRaisingChange(!isActivelyRaising)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isActivelyRaising ? 'bg-green-500' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isActivelyRaising ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Funding Rounds */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Funding Rounds</h3>
        <div className="space-y-3">
          {fundingRounds.map((round, i) => (
            <div key={i} className="p-4 bg-accent/20 border border-border/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Round {i + 1}</span>
                <button type="button" onClick={() => removeRound(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={round.round_type}
                  onChange={(e) => updateRound(i, 'round_type', e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Round type</option>
                  {roundTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
                <input
                  type="text"
                  value={round.amount}
                  onChange={(e) => updateRound(i, 'amount', e.target.value)}
                  placeholder="Amount (e.g. $500K)"
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={round.investor}
                  onChange={(e) => updateRound(i, 'investor', e.target.value)}
                  placeholder="Investor name"
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="date"
                  value={round.round_date}
                  onChange={(e) => updateRound(i, 'round_date', e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRound} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" /> Add Funding Round
        </button>
      </div>

      {/* Incubators */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Incubators / Accelerators</h3>
        <div className="space-y-2">
          {incubators.map((inc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={inc.program_name}
                onChange={(e) => updateIncubator(i, 'program_name', e.target.value)}
                placeholder="Program name"
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="number"
                value={inc.year}
                onChange={(e) => updateIncubator(i, 'year', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="Year"
                className="w-24 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button type="button" onClick={() => removeIncubator(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIncubator} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" /> Add Incubator
        </button>
      </div>

      {/* Awards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Awards / Recognitions</h3>
        <div className="space-y-2">
          {awards.map((award, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={award.award_name}
                onChange={(e) => updateAward(i, 'award_name', e.target.value)}
                placeholder="Award name"
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="number"
                value={award.year}
                onChange={(e) => updateAward(i, 'year', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="Year"
                className="w-24 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button type="button" onClick={() => removeAward(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addAward} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" /> Add Award
        </button>
      </div>
    </div>
  );
}
