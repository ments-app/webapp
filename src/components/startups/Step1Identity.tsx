"use client";

import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';

type Step1Props = {
  data: {
    brand_name: string;
    registered_name: string;
    legal_status: string;
    cin: string;
    founded_date: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
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

const businessModels = ['B2B', 'B2C', 'B2B2C'];

export function Step1Identity({ data, onChange }: Step1Props) {
  const [countries] = useState<ICountry[]>(() => Country.getAllCountries());
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');

  // Initialize country/state codes from saved data
  useEffect(() => {
    if (data.country && !selectedCountryCode) {
      const found = countries.find(c => c.name === data.country);
      if (found) {
        setSelectedCountryCode(found.isoCode);
        const countryStates = State.getStatesOfCountry(found.isoCode);
        setStates(countryStates);

        if (data.state) {
          const foundState = countryStates.find(s => s.name === data.state);
          if (foundState) {
            setSelectedStateCode(foundState.isoCode);
            setCities(City.getCitiesOfState(found.isoCode, foundState.isoCode));
          }
        } else if (data.city) {
          // Fallback: find which state this city belongs to
          for (const st of countryStates) {
            const stateCities = City.getCitiesOfState(found.isoCode, st.isoCode);
            if (stateCities.some(c => c.name === data.city)) {
              setSelectedStateCode(st.isoCode);
              setCities(stateCities);
              break;
            }
          }
        }
      }
    }
  }, [data.country, data.state, data.city, countries, selectedCountryCode]);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.isoCode === countryCode);
    setSelectedCountryCode(countryCode);
    setSelectedStateCode('');
    setCities([]);
    onChange('country', country?.name || '');
    onChange('state', '');
    onChange('city', '');
    setStates(countryCode ? State.getStatesOfCountry(countryCode) : []);
  };

  const handleStateChange = (stateCode: string) => {
    const st = states.find(s => s.isoCode === stateCode);
    setSelectedStateCode(stateCode);
    onChange('state', st?.name || '');
    onChange('city', '');
    setCities(stateCode ? City.getCitiesOfState(selectedCountryCode, stateCode) : []);
  };

  const handleCityChange = (cityName: string) => {
    onChange('city', cityName);
  };

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

      {/* Founded Date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Founded Date</label>
        <input
          type="date"
          value={data.founded_date}
          onChange={(e) => onChange('founded_date', e.target.value)}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Address Line 1 <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <input
            type="text"
            value={data.address_line1}
            onChange={(e) => onChange('address_line1', e.target.value)}
            placeholder="Street address, building"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Address Line 2 <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <input
            type="text"
            value={data.address_line2}
            onChange={(e) => onChange('address_line2', e.target.value)}
            placeholder="Apartment, suite, floor"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Country, State & City */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
          <select
            value={selectedCountryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
          <select
            value={selectedStateCode}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={!selectedCountryCode}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
          <select
            value={data.city}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={!selectedStateCode}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
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
