'use client';

import type { CSSProperties, ReactNode } from 'react';
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
import { Icon } from '@/icons';

const buttonRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  marginBottom: 16,
};
const buttonTitle: CSSProperties = {
  font: '600 12px/16px var(--font-mono)',
  color: 'var(--grey-700)',
  width: '100%',
};
const groundTitle: CSSProperties = { ...buttonTitle, color: 'var(--ground-muted)' };
const groundPanel: CSSProperties = {
  padding: 20,
  borderRadius: 12,
  background: 'var(--ground)',
  border: '1px solid var(--ground-border)',
  marginTop: 12,
};
const iconRow: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' };
const numberRow: CSSProperties = {
  display: 'flex',
  gap: 24,
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  padding: 8,
};

function Demo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

function ButtonDemo() {
  return (
    <>
      <div>
        <div style={buttonTitle}>CARD · TYPES</div>
        <div style={buttonRow}>
          <Button>Submit RFQ</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">Compare</Button>
          <Button variant="dashed">
            <Icon name="plus" size={20} />
            Add document
          </Button>
          <Button variant="text">Cancel</Button>
          <Button variant="link" asChild>
            <a href="#">Learn more</a>
          </Button>
        </div>
        <div style={buttonTitle}>DANGER</div>
        <div style={buttonRow}>
          <Button variant="danger">Withdraw</Button>
          <Button variant="danger-soft">
            <Icon name="trash" size={20} />
            Delete
          </Button>
        </div>
        <div style={buttonTitle}>SIZES · ICONS</div>
        <div style={buttonRow}>
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
        </div>
        <div style={buttonTitle}>STATES</div>
        <div style={buttonRow}>
          <Button className="sa-focus">Focus ring</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button loading>Submitting</Button>
        </div>
      </div>
      <div className="sa-ground" style={groundPanel}>
        <div style={groundTitle}>NAVY GROUND · INVERSE</div>
        <div style={buttonRow}>
          <Button variant="inverse">Post an RFQ</Button>
          <Button variant="inverse-outline">Browse exporters</Button>
          <Button variant="inverse-ghost">Sign in</Button>
          <Button variant="inverse" className="sa-focus">
            Focus
          </Button>
          <Button variant="inverse" disabled>
            Disabled
          </Button>
        </div>
      </div>
    </>
  );
}

function IconButtonDemo() {
  return (
    <div style={iconRow}>
      <IconButton icon="more" aria-label="More actions" />
      <IconButton icon="copy" aria-label="Copy reference" />
      <IconButton icon="send" variant="filled" aria-label="Send message" />
      <IconButton icon="x" size="sm" aria-label="Close" />
      <IconButton icon="star" className="sa-focus" aria-label="Focus" />
    </div>
  );
}

function InputDemo() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
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
  );
}

function SelectDemo() {
  return (
    <div style={{ maxWidth: 420, display: 'grid', gap: 16 }}>
      <Select
        label="Incoterm"
        defaultValue="fob"
        options={[
          { value: 'fob', label: 'FOB' },
          { value: 'cif', label: 'CIF' },
          { value: 'exw', label: 'EXW' },
        ]}
      />
      <Select label="Currency" defaultValue="usd" disabled options={[{ value: 'usd', label: 'USD' }]} />
    </div>
  );
}

function SliderDemo() {
  return (
    <div style={{ display: 'grid', gap: 40, padding: '36px 12px 12px', maxWidth: 420 }}>
      <Slider
        aria-label="Maximum price"
        max={1000}
        defaultValue={[450]}
        thumbLabels={['Maximum price']}
        formatValue={(value) => `USD ${value}`}
      />
      <Slider
        aria-label="Quantity range"
        max={1000}
        defaultValue={[200, 700]}
        thumbLabels={['Minimum', 'Maximum']}
      />
    </div>
  );
}

export function FormsSection() {
  return (
    <>
      <Demo name="Button">
        <ButtonDemo />
      </Demo>
      <Demo name="ButtonGroup">
        <div>
          <ButtonGroup
            aria-label="View"
            defaultValue="grid"
            items={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
              { value: 'map', label: 'Map' },
            ]}
          />
        </div>
      </Demo>
      <Demo name="IconButton">
        <IconButtonDemo />
      </Demo>
      <Demo name="Checkbox">
        <div style={{ display: 'grid', gap: 0, maxWidth: 420 }}>
          <Checkbox label="Halal certified" />
          <Checkbox label="ISO 22000" defaultChecked />
          <Checkbox label="Organic (not available)" disabled />
        </div>
      </Demo>
      <Demo name="FileUpload">
        <div style={{ maxWidth: 520, display: 'grid', gap: 12 }}>
          <FileUpload hint="PDF, JPG or PNG, up to 10 MB" />
          <FileUpload over />
        </div>
      </Demo>
      <Demo name="Input">
        <InputDemo />
      </Demo>
      <Demo name="NumberInput">
        <div style={numberRow}>
          <NumberInput label="Containers (20 ft)" defaultValue={2} min={1} aria-label="Containers" />
          <NumberInput label="Disabled minimum" defaultValue={1} min={1} aria-label="Minimum" />
        </div>
      </Demo>
      <Demo name="Radio">
        <div style={{ maxWidth: 420 }}>
          <Radio name="ds-radio" label="Sea freight" defaultChecked />
          <br />
          <Radio name="ds-radio" label="Air freight" />
          <br />
          <Radio name="ds-radio" label="Rail (not available)" disabled />
        </div>
      </Demo>
      <Demo name="Select">
        <SelectDemo />
      </Demo>
      <Demo name="Slider">
        <SliderDemo />
      </Demo>
      <Demo name="Switch">
        <div style={{ display: 'grid', maxWidth: 420 }}>
          <Switch label="Email me new RFQs" defaultChecked />
          <Switch label="Show profile publicly" />
        </div>
      </Demo>
      <Demo name="Textarea">
        <div style={{ maxWidth: 420 }}>
          <Textarea
            label="Special requirements"
            placeholder="Packaging, labelling, certificates needed"
            hint="0 / 500"
          />
        </div>
      </Demo>
    </>
  );
}
