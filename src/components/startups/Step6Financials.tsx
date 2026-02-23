"use client";

import { Briefcase, Plus, X, TrendingUp } from 'lucide-react';

type FundingRound = {
  investor: string;
  amount: string;
  round_type: string;
  round_date: string;
  is_public: boolean;
};

type Step6Props = {
  data: {
    revenue_amount: string;
    revenue_currency: string;
    revenue_growth: string;
    traction_metrics: string;
    total_raised: string;
    investor_count: string;
    is_actively_raising: boolean;
  };
  fundingRounds: FundingRound[];
  onChange: (field: string, value: string | boolean) => void;
  onFundingChange: (rounds: FundingRound[]) => void;
};

const roundTypes = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'other', label: 'Other' },
];

const currencies = ['USD', 'INR', 'EUR', 'GBP', 'SGD', 'AED'];

export function Step6Financials({ data, fundingRounds, onChange, onFundingChange }: Step6Props) {
  const addRound = () => {
    onFundingChange([...fundingRounds, { investor: '', amount: '', round_type: '', round_date: '', is_public: true }]);
  };

  const removeRound = (i: number) => onFundingChange(fundingRounds.filter((_, idx) => idx !== i));

  const updateRound = (i: number, field: string, value: string | boolean) => {
    const updated = [...fundingRounds];
    updated[i] = { ...updated[i], [field]: value };
    onFundingChange(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Financials</h2>
          <p className="text-sm text-muted-foreground">Revenue and funding details (all optional)</p>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (Monthly)</label>
            <input
              type="text"
              value={data.revenue_amount}
              onChange={(e) => onChange('revenue_amount', e.target.value)}
              placeholder="e.g. 50,000"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
            <select
              value={data.revenue_currency}
              onChange={(e) => onChange('revenue_currency', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">MoM Growth</label>
            <input
              type="text"
              value={data.revenue_growth}
              onChange={(e) => onChange('revenue_growth', e.target.value)}
              placeholder="e.g. 15%"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Traction Metrics */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Traction Metrics</label>
        <textarea
          value={data.traction_metrics}
          onChange={(e) => onChange('traction_metrics', e.target.value)}
          placeholder="Share your key traction numbers (e.g. 10K MAU, 500 paying customers, 2M app downloads, 30% MoM user growth, 85% retention rate...)"
          rows={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Funding Summary */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Funding Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Total Raised</label>
            <input
              type="text"
              value={data.total_raised}
              onChange={(e) => onChange('total_raised', e.target.value)}
              placeholder="e.g. $1.5M"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Number of Investors</label>
            <input
              type="number"
              value={data.investor_count}
              onChange={(e) => onChange('investor_count', e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
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
          onClick={() => onChange('is_actively_raising', !data.is_actively_raising)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${data.is_actively_raising ? 'bg-green-500' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${data.is_actively_raising ? 'translate-x-5' : ''}`} />
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
        <button
          type="button"
          onClick={addRound}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Funding Round
        </button>
      </div>
    </div>
  );
}
