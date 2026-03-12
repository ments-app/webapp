"use client";

import { useState, useEffect, useRef } from 'react';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';
import { Building2, User, Handshake, ShieldCheck, BrainCircuit, DraftingCompass, Zap, Globe2, Medal, ChevronDown, MapPin, Lightbulb, Search, Calendar } from 'lucide-react';
import type { EntityType } from '@/api/startups';

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
  entityType?: EntityType;
};

const legalStatuses = [
  { value: 'not_registered', label: 'Not Registered', desc: 'Pre-incorporation', icon: Lightbulb },
  { value: 'sole_proprietorship', label: 'Sole Prop', desc: 'Individual ownership', icon: User },
  { value: 'llp', label: 'LLP', desc: 'Limited Liability', icon: Handshake },
  { value: 'pvt_ltd', label: 'Pvt Ltd', desc: 'Private Limited', icon: Building2 },
];

const stages = [
  { value: 'ideation', label: 'Ideation', icon: BrainCircuit },
  { value: 'mvp', label: 'MVP', icon: DraftingCompass },
  { value: 'scaling', label: 'Scaling', icon: Zap },
  { value: 'expansion', label: 'Expansion', icon: Globe2 },
  { value: 'maturity', label: 'Maturity', icon: Medal },
];

const businessModels = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'B2B2C', label: 'B2B2C' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

const inputClass = "w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors";
const labelClass = "block text-sm font-medium text-foreground mb-1.5";

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`${inputClass} flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 truncate text-sm ${value ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {selectedLabel || placeholder}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-background border border-border/60 rounded-xl shadow-lg py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-2.5 text-sm text-muted-foreground/60">No results</div>
          ) : (
            filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery('');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent/40 transition-colors ${
                  o.value === value ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MonthYearPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const selectedMonth = parsed ? parsed.getMonth() : -1;
  const selectedYear = parsed ? parsed.getFullYear() : -1;

  const handleChange = (month: number, year: number) => {
    if (month >= 0 && year > 0) {
      const m = String(month + 1).padStart(2, '0');
      onChange(`${year}-${m}-01`);
    }
  };

  const selectStyle = `${inputClass} appearance-none pr-8 cursor-pointer`;

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
      <div className="relative flex-1">
        <select
          value={selectedMonth >= 0 ? selectedMonth : ''}
          onChange={e => {
            const m = Number(e.target.value);
            handleChange(m, selectedYear > 0 ? selectedYear : currentYear);
          }}
          className={selectStyle}
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <div className="relative flex-1">
        <select
          value={selectedYear > 0 ? selectedYear : ''}
          onChange={e => {
            const y = Number(e.target.value);
            handleChange(selectedMonth >= 0 ? selectedMonth : 0, y);
          }}
          className={selectStyle}
        >
          <option value="">Year</option>
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

export function Step1Identity({ data, onChange, entityType }: Step1Props) {
  const isOrgProject = entityType === 'org_project';
  const [countries] = useState<ICountry[]>(() => Country.getAllCountries());
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');

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
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {isOrgProject ? 'Project Identity' : 'Startup Identity'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">The essentials — tell us who you are</p>
      </div>

      {/* Brand & Legal Section */}
      <div className="space-y-5">
        <div className={isOrgProject ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
          <div>
            <label className={labelClass}>
              {isOrgProject ? 'Project Name' : 'Brand Name'} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={data.brand_name}
              onChange={(e) => onChange('brand_name', e.target.value)}
              placeholder={isOrgProject ? 'e.g. Avishkar Hyperloop' : 'e.g. Acme Technologies'}
              className={inputClass}
            />
          </div>
          {!isOrgProject && (
            <div>
              <label className={labelClass}>
                Registered / Legal Name
              </label>
              <input
                type="text"
                value={data.registered_name}
                onChange={(e) => onChange('registered_name', e.target.value)}
                placeholder="e.g. Acme Technologies Pvt. Ltd."
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Legal Structure — hidden for org projects */}
        {!isOrgProject && (
          <div>
            <label className={labelClass}>
              Legal Structure <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {legalStatuses.map((ls) => {
                const Icon = ls.icon;
                const selected = data.legal_status === ls.value;
                return (
                  <button
                    key={ls.value}
                    type="button"
                    onClick={() => onChange('legal_status', ls.value)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 transition-colors ${
                      selected ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'
                    }`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-sm font-semibold block ${selected ? 'text-foreground' : 'text-foreground/80'}`}>{ls.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{ls.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CIN (conditional — startups only) */}
        {!isOrgProject && (data.legal_status === 'llp' || data.legal_status === 'pvt_ltd') && (
          <div>
            <label className={labelClass}>
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              CIN / LLPIN
            </label>
            <input
              type="text"
              value={data.cin}
              onChange={(e) => onChange('cin', e.target.value)}
              placeholder="e.g. U72200KA2020PTC123456"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Stage & Model */}
      <div className="space-y-5">
        <div>
          <label className={labelClass}>
            Current Stage <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => {
              const Icon = s.icon;
              const selected = data.stage === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange('stage', s.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {!isOrgProject && (
          <div>
            <label className={labelClass}>Business Model</label>
            <div className="flex gap-2">
              {businessModels.map((bm) => {
                const selected = data.business_model === bm.value;
                return (
                  <button
                    key={bm.value}
                    type="button"
                    onClick={() => onChange('business_model', selected ? '' : bm.value)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`}
                  >
                    {bm.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Contact & Location */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>Location & Contact</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {isOrgProject ? 'Contact Email' : 'Startup Email'}
              {!isOrgProject && <span className="text-red-400"> *</span>}
              {isOrgProject && <span className="text-muted-foreground/60 font-normal text-xs"> (Optional)</span>}
            </label>
            <input
              type="email"
              value={data.startup_email}
              onChange={(e) => onChange('startup_email', e.target.value)}
              placeholder={isOrgProject ? 'team@project.com' : 'hello@startup.com'}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Founded Date</label>
            <MonthYearPicker
              value={data.founded_date}
              onChange={(v) => onChange('founded_date', v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Country</label>
            <SearchableSelect
              options={countries.map(c => ({ value: c.isoCode, label: c.name }))}
              value={selectedCountryCode}
              onChange={handleCountryChange}
              placeholder="Select country"
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <SearchableSelect
              options={states.map(s => ({ value: s.isoCode, label: s.name }))}
              value={selectedStateCode}
              onChange={handleStateChange}
              placeholder="Select state"
              disabled={!selectedCountryCode}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <SearchableSelect
              options={cities.map(c => ({ value: c.name, label: c.name }))}
              value={data.city}
              onChange={handleCityChange}
              placeholder="Select city"
              disabled={!selectedStateCode}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Address Line 1 <span className="text-muted-foreground/60 font-normal text-xs">(Optional)</span></label>
            <input
              type="text"
              value={data.address_line1}
              onChange={(e) => onChange('address_line1', e.target.value)}
              placeholder="Street address, building"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address Line 2 <span className="text-muted-foreground/60 font-normal text-xs">(Optional)</span></label>
            <input
              type="text"
              value={data.address_line2}
              onChange={(e) => onChange('address_line2', e.target.value)}
              placeholder="Apartment, suite, floor"
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
