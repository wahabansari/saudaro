'use client';

import { useState, type ReactNode } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { CommandPalette, type CommandPaletteGroup } from '@/components/ui/CommandPalette';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { UserMenu } from '@/components/ui/UserMenu';
import { ANCHORED, ANCHORED_END, comboOf, labelStyle, noop, OverlayDemo } from './OverlayDemo';

const COUNTRIES = [
  { value: 'de', label: 'Germany', flag: 'DE' },
  { value: 'nl', label: 'Netherlands', flag: 'NL' },
  { value: 'ae', label: 'United Arab Emirates', flag: 'AE' },
  { value: 'gb', label: 'United Kingdom', flag: 'GB' },
  { value: 'us', label: 'United States', flag: 'US' },
  { value: 'sg', label: 'Singapore', flag: 'SG' },
];

const CERTIFICATIONS = [
  { value: 'halal', label: 'Halal', count: 412 },
  { value: 'iso-22000', label: 'ISO 22000', count: 368 },
  { value: 'haccp', label: 'HACCP', count: 297 },
  { value: 'organic', label: 'Organic (USDA)', count: 141 },
  { value: 'kosher', label: 'Kosher', count: 96 },
];

const COMMANDS: CommandPaletteGroup[] = [
  {
    heading: 'Go to',
    items: [
      { label: 'Dashboard', icon: 'home', shortcut: ['G', 'D'] },
      { label: 'RFQs', icon: 'clipboard', shortcut: ['G', 'R'] },
      { label: 'Exporters', icon: 'factory' },
    ],
  },
  {
    heading: 'Create',
    items: [
      { label: 'New RFQ', icon: 'plus', shortcut: ['N'] },
      { label: 'New quotation', icon: 'receipt' },
    ],
  },
  {
    heading: 'Recent',
    items: [
      { label: 'ISO-22000-certificate-2026.pdf', icon: 'file' },
      { label: 'Basmati rice 1121 Steam', icon: 'package' },
    ],
  },
];

type FieldProps = { label: string; children: ReactNode };

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="sa-label" style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function ComboboxDemo() {
  return (
    <OverlayDemo name="Combobox">
      {(frame) => (
        <div style={{ display: 'grid', gap: 20, maxWidth: 360 }}>
          <Field label="Destination country">
            <Combobox
              className={ANCHORED}
              open={frame !== null}
              container={comboOf(frame)}
              options={COUNTRIES}
              value="nl"
              onValueChange={noop}
              placeholder="Select a country"
              searchPlaceholder="Search countries"
            />
          </Field>
          <div style={{ height: 250 }} />
        </div>
      )}
    </OverlayDemo>
  );
}

export function CommandPaletteDemo() {
  return (
    <OverlayDemo name="CommandPalette">
      {(frame) => (
        <CommandPalette
          open={frame !== null}
          container={frame ?? undefined}
          defaultValue="RFQs"
          onOpenChange={noop}
          groups={COMMANDS}
          placeholder="Search or jump to…"
        />
      )}
    </OverlayDemo>
  );
}

export function MultiSelectDemo() {
  return (
    <OverlayDemo name="MultiSelect">
      {(frame) => (
        <div style={{ maxWidth: 380 }}>
          <label style={labelStyle}>Certifications</label>
          <MultiSelect
            aria-label="Certifications"
            className={ANCHORED}
            open={frame !== null}
            container={comboOf(frame)}
            options={CERTIFICATIONS}
            values={['halal', 'haccp']}
            onValuesChange={noop}
            placeholder="Select certifications"
            searchPlaceholder="Search certifications"
          />
          <div style={{ height: 290 }} />
        </div>
      )}
    </OverlayDemo>
  );
}

function UserMenuFrame() {
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div
        ref={setRow}
        className={ANCHORED_END}
        style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 360 }}
      >
        <UserMenu
          open={row !== null}
          container={row ?? undefined}
          name="Muhammad Wahab"
          email="wahab@exporter.example"
          initials="MW"
        />
      </div>
      <div style={{ height: 300 }} />
    </>
  );
}

export function UserMenuDemo() {
  return <OverlayDemo name="UserMenu">{() => <UserMenuFrame />}</OverlayDemo>;
}
