'use client';

import { useId, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import clsx from 'clsx';
import { Icon } from '@/icons';
import { Check, ComboSelect, NO_ANIMATION, SearchField } from './GridParts';
import {
  formatDate,
  formatNumber,
  isEmptyFilter,
  type FilterKind,
  type FilterValue,
  type RangeFilter,
} from './dataGridFilters';

type Option = { value: string; count: number };
type Draft<V> = { draft: V; setDraft: (draft: V) => void };

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label className="sa-lbl" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextBody({ draft, setDraft }: Draft<string>) {
  const id = useId();
  return (
    <>
      <Field id={`${id}-op`} label="Condition">
        <div className="sa-combo">
          <ComboSelect
            id={`${id}-op`}
            value="Contains"
            onValueChange={() => undefined}
            options={['Contains']}
          />
        </div>
      </Field>
      <Field id={`${id}-text`} label="Value">
        <SearchField id={`${id}-text`} label="Value" clearLabel="Clear" value={draft} onChange={setDraft} />
      </Field>
    </>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return text;
  const end = at + query.length;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-warning-bg text-current">{text.slice(at, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function EnumBody({
  label,
  draft,
  setDraft,
  options,
}: Draft<string[]> & { label: string; options: Option[] }) {
  const [query, setQuery] = useState('');
  const shown = options.filter((o) => o.value.toLowerCase().includes(query.toLowerCase()));
  const toggle = (value: string) =>
    setDraft(draft.includes(value) ? draft.filter((v) => v !== value) : [...draft, value]);
  return (
    <>
      <SearchField
        label={`Search ${label}`}
        placeholder={`Search ${label}`}
        clearLabel="Clear search"
        value={query}
        onChange={setQuery}
      />
      {!query && (
        <Check
          checked={options.length > 0 && draft.length === options.length}
          onChange={(e) => setDraft(e.target.checked ? options.map((o) => o.value) : [])}
        >
          Select all
        </Check>
      )}
      <ul className="sa-fil__list">
        {shown.map((o) => (
          <li key={o.value}>
            <Check checked={draft.includes(o.value)} onChange={() => toggle(o.value)}>
              <span>
                <Highlight text={o.value} query={query} />
              </span>
              <small>{o.count}</small>
            </Check>
          </li>
        ))}
      </ul>
      {query && <div className="sa-combo__foot border-0 p-0">Showing {shown.length} matches</div>}
    </>
  );
}

function RangeBody({
  kind,
  draft,
  setDraft,
  range,
}: Draft<RangeFilter> & { kind: 'number' | 'date'; range: [number, number] }) {
  const id = useId();
  const labels = kind === 'number' ? { from: 'Min', to: 'Max' } : { from: 'From', to: 'To' };
  const thumbs = [draft.from, draft.to].map((v, i) => {
    const n = Number((v ?? '').replace(/,/g, ''));
    return v && !Number.isNaN(n) ? n : (range[i] ?? 0);
  });
  const today = new Date();
  const [y, m, d] = [today.getFullYear(), today.getMonth(), today.getDate()];
  const presets = [
    ['Today', today, today],
    ['Next 7 days', today, new Date(y, m, d + 7)],
    ['This month', new Date(y, m, 1), new Date(y, m + 1, 0)],
  ] as const;
  return (
    <>
      <div className="sa-fil__2">
        {(['from', 'to'] as const).map((key) => (
          <Field key={key} id={`${id}-${key}`} label={labels[key]}>
            <input
              className="sa-input"
              id={`${id}-${key}`}
              inputMode={kind === 'number' ? 'numeric' : undefined}
              value={draft[key] ?? ''}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      {kind === 'number' ? (
        <Slider.Root
          className="sa-slider"
          aria-label="Range"
          min={range[0]}
          max={range[1]}
          value={thumbs}
          onValueChange={([from = 0, to = 0]) => setDraft({ from: formatNumber(from), to: formatNumber(to) })}
        >
          <Slider.Track className="sa-slider__track">
            <Slider.Range className="sa-slider__fill" />
          </Slider.Track>
          <Slider.Thumb className="sa-slider__thumb" aria-label="Minimum" />
          <Slider.Thumb className="sa-slider__thumb" aria-label="Maximum" />
        </Slider.Root>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map(([label, from, to]) => (
            <button
              key={label}
              type="button"
              className="sa-chip"
              aria-pressed={draft.from === formatDate(from) && draft.to === formatDate(to)}
              onClick={() => setDraft({ from: formatDate(from), to: formatDate(to) })}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const emptyDrafts: Record<FilterKind, FilterValue> = { text: '', enum: [], number: {}, date: {} };
const SUBTITLES = { text: 'Text', enum: '', number: 'Range', date: 'Date range' };

export type FilterDropdownProps = {
  label: string;
  kind: FilterKind;
  value?: FilterValue;
  onChange: (value: FilterValue | undefined) => void;
  options?: Option[];
  range?: [number, number];
};

function Panel({ label, kind, value, onChange, options = [], range = [0, 100] }: FilterDropdownProps) {
  const [draft, setDraft] = useState<FilterValue>(value ?? emptyDrafts[kind]);
  const bodies: Record<FilterKind, ReactNode> = {
    text: <TextBody draft={draft as string} setDraft={setDraft} />,
    enum: <EnumBody label={label} draft={draft as string[]} setDraft={setDraft} options={options} />,
    number: <RangeBody kind="number" draft={draft as RangeFilter} setDraft={setDraft} range={range} />,
    date: <RangeBody kind="date" draft={draft as RangeFilter} setDraft={setDraft} range={range} />,
  };
  const footer: [string, string, FilterValue | undefined][] = [
    ['Clear', 'sa-btn--text', undefined],
    ['Apply', '', isEmptyFilter(draft) ? undefined : draft],
  ];
  return (
    <>
      <div className="sa-fil__head">
        <strong>{label}</strong>
        <small>{kind === 'enum' ? `${(draft as string[]).length} selected` : SUBTITLES[kind]}</small>
      </div>
      <div className="sa-fil__body">{bodies[kind]}</div>
      <div className="sa-fil__foot">
        {footer.map(([name, variant, next]) => (
          <Popover.Close key={name} asChild>
            <button
              type="button"
              className={clsx('sa-btn sa-btn--sm', variant)}
              onClick={() => onChange(next)}
            >
              {name}
            </button>
          </Popover.Close>
        ))}
      </div>
    </>
  );
}

export function FilterDropdown(props: FilterDropdownProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={clsx('sa-th__btn', props.value && 'is-active', NO_ANIMATION)}
          aria-label={`Filter ${props.label}`}
          aria-haspopup="dialog"
        >
          <Icon name="filter" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="sa-fil z-dropdown"
          aria-label={`Filter ${props.label}`}
          align="start"
          sideOffset={6}
        >
          <Panel {...props} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
