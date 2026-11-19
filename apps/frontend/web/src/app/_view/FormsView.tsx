'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/icons';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Checkbox } from '@/components/ui/Checkbox';
import { FileUpload } from '@/components/ui/FileUpload';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Radio } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  marginBottom: 16,
};
const tag: CSSProperties = {
  font: '600 12px/16px var(--font-mono)',
  color: 'var(--grey-700)',
  width: '100%',
};
const grid = (gap: number, maxWidth = 420): CSSProperties => ({ display: 'grid', gap, maxWidth });

const Row = ({ title, children, muted }: { title: string; children: ReactNode; muted?: boolean }) => (
  <>
    <div style={muted ? { ...tag, color: 'var(--ground-muted)' } : tag}>{title}</div>
    <div style={row}>{children}</div>
  </>
);

const Section = ({ name, children }: { name: string; children: ReactNode }) => (
  <section id={name} aria-labelledby={`${name}-h`}>
    <h3 id={`${name}-h`} className="text-h4">
      {name}
    </h3>
    <div data-ds-component={name}>{children}</div>
  </section>
);

const iconButtons = [
  { icon: 'more', label: 'More actions' },
  { icon: 'copy', label: 'Copy reference' },
  { icon: 'send', label: 'Send message', variant: 'filled' },
  { icon: 'x', label: 'Close', size: 'sm' },
  { icon: 'star', label: 'Focus', className: 'sa-focus' },
] as const;

export function FormsView() {
  return (
    <>
      <Section name="Button">
        <div>
          <Row title="CARD · TYPES">
            <Button>Submit RFQ</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="outline">Compare</Button>
            <Button variant="dashed">
              <Icon name="plus" size={20} />
              Add document
            </Button>
            <Button variant="text">Cancel</Button>
            <Button variant="link" href="#">
              Learn more
            </Button>
          </Row>
          <Row title="DANGER">
            <Button variant="danger">Withdraw</Button>
            <Button variant="danger-soft">
              <Icon name="trash" size={20} />
              Delete
            </Button>
          </Row>
          <Row title="SIZES · ICONS">
            <Button size="sm">Small 32</Button>
            <Button>Medium 40</Button>
            <Button size="lg">Large 48</Button>
            <Button>
              <Icon name="plus" size={20} />
              <span>New RFQ</span>
            </Button>
            <Button variant="secondary">
              Continue
              <Icon name="arrow-right" size={20} />
            </Button>
          </Row>
          <Row title="STATES">
            <Button className="sa-focus">Focus ring</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
            <Button loading>Submitting</Button>
          </Row>
        </div>
        <div
          className="sa-ground"
          style={{
            marginTop: 12,
            padding: 20,
            borderRadius: 12,
            background: 'var(--ground)',
            border: '1px solid var(--ground-border)',
          }}
        >
          <Row title="NAVY GROUND · INVERSE" muted>
            <Button variant="inverse">Post an RFQ</Button>
            <Button variant="inverse-outline">Browse exporters</Button>
            <Button variant="inverse-ghost">Sign in</Button>
            <Button variant="inverse" className="sa-focus">
              Focus
            </Button>
            <Button variant="inverse" disabled>
              Disabled
            </Button>
          </Row>
        </div>
      </Section>

      <Section name="ButtonGroup">
        <div>
          <ButtonGroup aria-label="View" options={['Grid', 'List', 'Map']} />
        </div>
      </Section>

      <Section name="IconButton">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {iconButtons.map(({ icon, label, ...rest }) => (
            <IconButton key={icon} aria-label={label} {...rest}>
              <Icon name={icon} size={20} />
            </IconButton>
          ))}
        </div>
      </Section>

      <Section name="Checkbox">
        <div style={grid(0)}>
          <Checkbox label="Halal certified" />
          <Checkbox label="ISO 22000" defaultChecked />
          <Checkbox label="Organic (not available)" disabled />
        </div>
      </Section>

      <Section name="FileUpload">
        <div style={grid(12, 520)}>
          <FileUpload hint="PDF, JPG or PNG, up to 10 MB" accept=".pdf,.jpg,.png" />
          <div className="sa-drop" data-over="true">
            <strong>Drop to upload</strong>
          </div>
        </div>
      </Section>

      <Section name="Input">
        <div style={grid(16)}>
          <Input
            label="Product name"
            required
            placeholder="e.g. Basmati rice 1121"
            hint="Use the trade name buyers search for."
          />
          <Input label="Search" icon="search" placeholder="Search products or HS code" />
          <Input
            label="Quantity (MT)"
            className="sa-mono"
            defaultValue="0"
            error="Enter a quantity of 1 or more"
          />
          <Input label="Company" defaultValue="Locked by admin" disabled />
          <Input label="Focus" className="sa-focus" defaultValue="Focused" />
        </div>
      </Section>

      <Section name="NumberInput">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', padding: 8 }}>
          <NumberInput label="Containers (20 ft)" defaultValue={2} aria-label="Containers" />
          <NumberInput label="Disabled minimum" defaultValue={1} min={1} aria-label="Minimum" />
        </div>
      </Section>

      <Section name="Radio">
        <div style={{ maxWidth: 420 }}>
          <Radio name="r" label="Sea freight" defaultChecked />
          <br />
          <Radio name="r" label="Air freight" />
          <br />
          <Radio name="r" label="Rail (not available)" disabled />
        </div>
      </Section>

      <Section name="Select">
        <div style={grid(16)}>
          <Select label="Incoterm" options={['FOB', 'CIF', 'EXW']} defaultValue="FOB" />
          <Select label="Currency" options={['USD']} defaultValue="USD" disabled />
        </div>
      </Section>

      <Section name="Slider">
        <div style={{ ...grid(40), padding: '36px 12px 12px' }}>
          <Slider aria-label="Maximum price" defaultValue={[450]} max={1000} format={(v) => `USD ${v}`} />
          <Slider
            aria-label="Quantity range"
            defaultValue={[200, 700]}
            max={1000}
            thumbLabels={['Minimum', 'Maximum']}
          />
        </div>
      </Section>

      <Section name="Switch">
        <div style={{ display: 'grid', maxWidth: 420 }}>
          <Switch label="Email me new RFQs" defaultChecked />
          <Switch label="Show profile publicly" />
        </div>
      </Section>

      <Section name="Textarea">
        <div style={{ maxWidth: 420 }}>
          <Textarea
            label="Special requirements"
            placeholder="Packaging, labelling, certificates needed"
            hint="0 / 500"
          />
        </div>
      </Section>
    </>
  );
}
