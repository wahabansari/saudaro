'use client';

import { useId, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '@/icons';
import { formatDate, formatNumber, parseDate } from './DataGrid.filters';
import type { GridFilterOption, GridFilterValue } from './DataGrid.types';

type BodyProps<T extends GridFilterValue['type']> = {
  draft: Extract<GridFilterValue, { type: T }>;
  onChange: (next: Extract<GridFilterValue, { type: T }>) => void;
};

const MARK_STYLE = { background: 'var(--warning-bg)', color: 'inherit' } as const;
const NUMERIC_STYLE = { fontFeatureSettings: "'lnum','cv05'" } as const;

function SearchField({
  id,
  value,
  onChange,
  label,
  placeholder,
  clearLabel = 'Clear',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  clearLabel?: string;
}) {
  return (
    <div className="sa-search" style={{ width: '100%' }}>
      <Icon name="search" />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="sa-search__clear"
          aria-label={clearLabel}
          onClick={() => onChange('')}
        >
          <Icon name="x" />
        </button>
      ) : null}
    </div>
  );
}

export function TextBody({ draft, onChange }: BodyProps<'text'>) {
  const id = useId();
  return (
    <>
      <div>
        <label className="sa-lbl" htmlFor={`${id}-condition`}>
          Condition
        </label>
        <div className="sa-combo">
          <button type="button" id={`${id}-condition`} className="sa-combo__trigger" disabled>
            <span>Contains</span>
            <Icon name="chevron-down" />
          </button>
        </div>
      </div>
      <div>
        <label className="sa-lbl" htmlFor={id}>
          Value
        </label>
        <SearchField
          id={id}
          label="Value"
          value={draft.value}
          onChange={(value) => onChange({ ...draft, value })}
        />
      </div>
    </>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const start = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (start < 0) return <span>{text}</span>;
  const end = start + query.length;
  return (
    <span>
      {text.slice(0, start)}
      <mark style={MARK_STYLE}>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </span>
  );
}

export function EnumBody({
  draft,
  onChange,
  options,
  searchLabel,
  defaultQuery = '',
}: BodyProps<'enum'> & { options: GridFilterOption[]; searchLabel: string; defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const visible = options.filter((option) =>
    (option.label ?? option.value).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((option) => draft.values.includes(option.value));

  const toggle = (value: string, checked: boolean) =>
    onChange({
      ...draft,
      values: checked ? [...draft.values, value] : draft.values.filter((item) => item !== value),
    });
  const toggleAll = (checked: boolean) => {
    const visibleValues = visible.map((option) => option.value);
    const rest = draft.values.filter((value) => !visibleValues.includes(value));
    onChange({ ...draft, values: checked ? [...rest, ...visibleValues] : rest });
  };

  return (
    <>
      <SearchField
        label={searchLabel}
        placeholder={searchLabel}
        clearLabel="Clear search"
        value={query}
        onChange={setQuery}
      />
      <label className="sa-check">
        <input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAll(e.target.checked)} />
        <span className="sa-check__box">
          <Icon name="check" />
        </span>
        Select all
      </label>
      <ul className="sa-fil__list">
        {visible.map((option) => (
          <li key={option.value}>
            <label className="sa-check">
              <input
                type="checkbox"
                checked={draft.values.includes(option.value)}
                onChange={(e) => toggle(option.value, e.target.checked)}
              />
              <span className="sa-check__box">
                <Icon name="check" />
              </span>
              <Highlighted text={option.label ?? option.value} query={query.trim()} />
              {option.count === undefined ? null : <small>{option.count}</small>}
            </label>
          </li>
        ))}
      </ul>
      {query ? (
        <div className="sa-combo__foot" style={{ border: 0, padding: 0 }}>
          Showing {visible.length} {visible.length === 1 ? 'match' : 'matches'}
        </div>
      ) : null}
    </>
  );
}

const parseNumber = (text: string) => {
  const value = Number(text.replace(/,/g, ''));
  return text.trim() === '' || Number.isNaN(value) ? undefined : value;
};
const toText = (value: number | undefined) => (value === undefined ? '' : formatNumber(value));

export function NumberBody({
  draft,
  onChange,
  bounds,
  label,
}: BodyProps<'number'> & { bounds?: readonly [number, number]; label: string }) {
  const id = useId();
  const [texts, setTexts] = useState({ min: toText(draft.min), max: toText(draft.max) });

  const update = (next: { min: string; max: string }) => {
    setTexts(next);
    onChange({ type: 'number', min: parseNumber(next.min), max: parseNumber(next.max) });
  };

  return (
    <>
      <div className="sa-fil__2">
        <div>
          <label className="sa-lbl" htmlFor={`${id}-min`}>
            Min
          </label>
          <input
            className="sa-input"
            id={`${id}-min`}
            inputMode="numeric"
            style={NUMERIC_STYLE}
            value={texts.min}
            onChange={(e) => update({ ...texts, min: e.target.value })}
          />
        </div>
        <div>
          <label className="sa-lbl" htmlFor={`${id}-max`}>
            Max
          </label>
          <input
            className="sa-input"
            id={`${id}-max`}
            inputMode="numeric"
            style={NUMERIC_STYLE}
            value={texts.max}
            onChange={(e) => update({ ...texts, max: e.target.value })}
          />
        </div>
      </div>
      {bounds ? (
        <Slider.Root
          className="sa-slider"
          aria-label={`${label} range`}
          min={bounds[0]}
          max={bounds[1]}
          minStepsBetweenThumbs={0}
          value={[draft.min ?? bounds[0], draft.max ?? bounds[1]]}
          onValueChange={([min = bounds[0], max = bounds[1]]) =>
            update({ min: formatNumber(min), max: formatNumber(max) })
          }
        >
          <Slider.Track className="sa-slider__track">
            <Slider.Range className="sa-slider__fill" />
          </Slider.Track>
          <Slider.Thumb className="sa-slider__thumb" aria-label="Minimum" />
          <Slider.Thumb className="sa-slider__thumb" aria-label="Maximum" />
        </Slider.Root>
      ) : null}
    </>
  );
}

const isoOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function presets(now: Date) {
  const day = (offset: number) => isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return [
    { label: 'Today', from: day(0), to: day(0) },
    { label: 'Next 7 days', from: day(0), to: day(7) },
    {
      label: 'This month',
      from: isoOf(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: isoOf(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    },
  ];
}

const dateText = (iso: string | undefined) => (iso ? formatDate(iso) : '');

export function DateBody({ draft, onChange }: BodyProps<'date'>) {
  const id = useId();
  const [texts, setTexts] = useState({ from: dateText(draft.from), to: dateText(draft.to) });

  const update = (next: { from: string; to: string }) => {
    setTexts(next);
    onChange({ type: 'date', from: parseDate(next.from), to: parseDate(next.to) });
  };

  return (
    <>
      <div className="sa-fil__2">
        <div>
          <label className="sa-lbl" htmlFor={`${id}-from`}>
            From
          </label>
          <input
            className="sa-input"
            id={`${id}-from`}
            value={texts.from}
            onChange={(e) => update({ ...texts, from: e.target.value })}
          />
        </div>
        <div>
          <label className="sa-lbl" htmlFor={`${id}-to`}>
            To
          </label>
          <input
            className="sa-input"
            id={`${id}-to`}
            value={texts.to}
            onChange={(e) => update({ ...texts, to: e.target.value })}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {presets(new Date()).map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="sa-chip"
            aria-pressed={draft.from === preset.from && draft.to === preset.to}
            onClick={() => {
              setTexts({ from: dateText(preset.from), to: dateText(preset.to) });
              onChange({ type: 'date', from: preset.from, to: preset.to });
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </>
  );
}
