"use client";

import { Building2 } from 'lucide-react';

type Step1Props = {
  data: {
    brand_name: string;
    registered_name: string;
    legal_status: string;
    cin: string;
    founded_date: string;
    city: string;
    country: string;
    startup_email: string;
    business_model: string;
    stage: string;
  };
  onChange: (field: string, value: string) => void;
};

const legalStatuses = [
  { value: 'not_registered', label: 'Not Registered', desc: 'Pre-incorporation' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', desc: 'Individual ownership' },
  { value: 'llp', label: 'LLP', desc: 'Limited Liability Partnership' },
  { value: 'pvt_ltd', label: 'Pvt Ltd', desc: 'Private Limited Company' },
];

const stages = [
  { value: 'ideation', label: 'Ideation' },
  { value: 'mvp', label: 'MVP' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'maturity', label: 'Maturity' },
];

const businessModels = [
  'SaaS', 'Marketplace', 'D2C', 'B2B', 'B2C', 'Hardware', 'Subscription',
  'Freemium', 'Platform', 'Agency', 'Other',
];

export function Step1Identity({ data, onChange }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Startup Identity</h2>
          <p className="text-sm text-muted-foreground">Core information about your startup</p>
        </div>
      </div>

      {/* Brand Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Brand Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.brand_name}
          onChange={(e) => onChange('brand_name', e.target.value)}
          placeholder="e.g. Acme Technologies"
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Registered / Legal Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Registered / Legal Name
        </label>
        <input
          type="text"
          value={data.registered_name}
          onChange={(e) => onChange('registered_name', e.target.value)}
          placeholder="e.g. Acme Technologies Pvt. Ltd."
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Legal Structure */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Legal Structure <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {legalStatuses.map((ls) => (
            <button
              key={ls.value}
              type="button"
              onClick={() => onChange('legal_status', ls.value)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 ${
                data.legal_status === ls.value
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <span className="text-sm font-medium text-foreground">{ls.label}</span>
              <span className="text-xs text-muted-foreground">{ls.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CIN (conditional) */}
      {(data.legal_status === 'llp' || data.legal_status === 'pvt_ltd') && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            CIN / LLPIN
          </label>
          <input
            type="text"
            value={data.cin}
            onChange={(e) => onChange('cin', e.target.value)}
            placeholder="e.g. U72200KA2020PTC123456"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {/* Year Founded */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Year Founded</label>
        <input
          type="text"
          value={data.founded_date}
          onChange={(e) => onChange('founded_date', e.target.value)}
          placeholder="e.g. 2023"
          maxLength={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* City & Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
          <input
            type="text"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="e.g. Bangalore"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
          <input
            type="text"
            value={data.country}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="e.g. India"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Startup Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={data.startup_email}
          onChange={(e) => onChange('startup_email', e.target.value)}
          placeholder="hello@startup.com"
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Business Model */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Business Model</label>
        <select
          value={data.business_model}
          onChange={(e) => onChange('business_model', e.target.value)}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Select a model</option>
          {businessModels.map((bm) => (
            <option key={bm} value={bm}>{bm}</option>
          ))}
        </select>
      </div>

      {/* Stage */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Current Stage <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange('stage', s.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                data.stage === s.value
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
