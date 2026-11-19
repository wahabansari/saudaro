'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { CommandPalette, type CommandGroup } from '@/components/ui/CommandPalette';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dialog, DialogClose } from '@/components/ui/Dialog';
import {
  Menu,
  MenuCheckItem,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
} from '@/components/ui/Menu';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Popover } from '@/components/ui/Popover';
import { Sheet } from '@/components/ui/Sheet';
import { Tooltip } from '@/components/ui/Tooltip';
import { UserMenu } from '@/components/ui/UserMenu';
import { Icon } from '@/icons';

const COUNTRIES = [
  { value: 'DE', label: 'Germany', flag: 'DE' },
  { value: 'NL', label: 'Netherlands', flag: 'NL' },
  { value: 'AE', label: 'United Arab Emirates', flag: 'AE' },
  { value: 'GB', label: 'United Kingdom', flag: 'GB' },
  { value: 'US', label: 'United States', flag: 'US' },
  { value: 'SG', label: 'Singapore', flag: 'SG' },
];
const CERTS = [
  { value: 'halal', label: 'Halal', count: 412 },
  { value: 'iso', label: 'ISO 22000', count: 368 },
  { value: 'haccp', label: 'HACCP', count: 297 },
  { value: 'organic', label: 'Organic (USDA)', count: 141 },
  { value: 'kosher', label: 'Kosher', count: 96 },
];
const COMMANDS: CommandGroup[] = [
  {
    heading: 'Go to',
    items: [
      { label: 'Dashboard', icon: 'home', keys: ['G', 'D'] },
      { label: 'RFQs', icon: 'clipboard', keys: ['G', 'R'] },
      { label: 'Exporters', icon: 'factory' },
    ],
  },
  {
    heading: 'Create',
    items: [
      { label: 'New RFQ', icon: 'plus', keys: ['N'] },
      { label: 'New quotation', icon: 'receipt' },
    ],
  },
  {
    heading: 'Recent',
    items: [
      { label: 'ISO-22000-certificate-2026.pdf', icon: 'pdf' },
      { label: 'Basmati rice 1121 Steam', icon: 'package' },
    ],
  },
];

const Btn = (props: ButtonProps) => <Button variant="secondary" {...props} />;

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section id={name} aria-labelledby={`${name}-h`}>
      <h3 id={`${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

function ChoiceMenu() {
  const [sort, setSort] = useState('new');
  const [verified, setVerified] = useState(true);
  const [samples, setSamples] = useState(false);
  return (
    <Menu trigger={<Btn>Sort and show</Btn>}>
      <MenuLabel>Sort by</MenuLabel>
      <MenuRadioGroup value={sort} onValueChange={setSort}>
        <MenuRadioItem value="new">Newest first</MenuRadioItem>
        <MenuRadioItem value="price">Lowest price</MenuRadioItem>
        <MenuRadioItem value="docs">Most documents</MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuLabel>Show</MenuLabel>
      <MenuCheckItem checked={verified} onCheckedChange={setVerified}>
        Verified exporters only
      </MenuCheckItem>
      <MenuCheckItem checked={samples} onCheckedChange={setSamples}>
        With sample documents
      </MenuCheckItem>
    </Menu>
  );
}

export function OverlaysView() {
  return (
    <div className="grid gap-8">
      <Section name="Dialog">
        <Dialog
          trigger={<Btn variant="danger">Withdraw quotation</Btn>}
          title="Withdraw quotation QT-2026-0412?"
          actions={
            <>
              <DialogClose asChild>
                <Btn variant="ghost">Keep quotation</Btn>
              </DialogClose>
              <DialogClose asChild>
                <Btn variant="danger">Withdraw</Btn>
              </DialogClose>
            </>
          }
        >
          The importer will be notified and can no longer accept it. You can send a new quotation afterwards.
        </Dialog>
      </Section>
      <Section name="Popover">
        <Popover trigger={<Btn>Incoterms</Btn>} title="Incoterms">
          <span className="sa-muted">
            FOB: the seller delivers onboard the vessel. The buyer pays freight and insurance from there.
          </span>
          <a className="sa-link" href="#">
            Read the full guide
          </a>
        </Popover>
      </Section>
      <Section name="Sheet">
        <Sheet trigger={<Btn>Filters</Btn>} title="Filters">
          <label className="sa-check">
            <input type="checkbox" defaultChecked />
            <span className="sa-check__box">
              <Icon name="check" size={20} />
            </span>
            Verified exporters only
          </label>
          <label className="sa-check">
            <input type="checkbox" />
            <span className="sa-check__box">
              <Icon name="check" size={20} />
            </span>
            Has certificates
          </label>
          <button type="button" className="sa-btn">
            Show 124 results
          </button>
        </Sheet>
      </Section>
      <Section name="Tooltip">
        <Tooltip content="Incoterms define who pays for freight and insurance">
          <button type="button" className="sa-iconbtn" aria-label="About incoterms">
            <Icon name="info" size={20} />
          </button>
        </Tooltip>
      </Section>
      <Section name="Combobox">
        <Combobox
          className="max-w-[360px]"
          label="Destination country"
          searchLabel="Search countries"
          options={COUNTRIES}
          defaultValue="NL"
        />
      </Section>
      <Section name="CommandPalette">
        <CommandPalette groups={COMMANDS} trigger={<Btn>Open command palette (Ctrl K)</Btn>} />
      </Section>
      <Section name="DatePicker">
        <div className="flex flex-wrap items-start gap-6">
          <DatePicker className="w-[240px]" label="Quotation valid until" min={new Date()} />
          <DatePicker className="w-[320px]" label="Shipment window" range />
        </div>
      </Section>
      <Section name="Menu">
        <div className="flex flex-wrap items-start gap-6">
          <Menu
            trigger={
              <Btn>
                Actions
                <Icon name="chevron-down" size={20} />
              </Btn>
            }
          >
            <MenuLabel>Actions</MenuLabel>
            <MenuItem icon="edit" keys={['E']}>
              Edit quotation
            </MenuItem>
            <MenuItem icon="copy" keys={['D']}>
              Duplicate
            </MenuItem>
            <MenuItem icon="send">Send to buyer</MenuItem>
            <MenuItem icon="download">Download PDF</MenuItem>
            <MenuSeparator />
            <MenuItem icon="trash" danger>
              Withdraw
            </MenuItem>
            <MenuItem icon="archive" disabled>
              Archive (not available)
            </MenuItem>
          </Menu>
          <ChoiceMenu />
        </div>
      </Section>
      <Section name="MultiSelect">
        <MultiSelect
          className="max-w-[380px]"
          label="Certifications"
          searchLabel="Search certifications"
          options={CERTS}
          defaultValue={['halal', 'haccp']}
        />
      </Section>
      <Section name="UserMenu">
        <UserMenu name="Muhammad Wahab" email="wahab@exporter.example" />
      </Section>
    </div>
  );
}
