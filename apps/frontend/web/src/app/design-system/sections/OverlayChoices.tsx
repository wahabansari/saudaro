'use client';

import { useState, type ReactNode } from 'react';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/Menu';
import { Icon } from '@/icons';
import { labelStyle, noop, OverlayDemo, STATIC_POPPER } from './OverlayDemo';

const VALID_RANGE = { start: new Date(2026, 11, 8), end: new Date(2026, 11, 15) };
const EARLIEST = new Date(2026, 11, 2);

function DatePickerFrame() {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setFrame}
      className={STATIC_POPPER}
      style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}
    >
      <div style={{ width: 240 }}>
        <label style={labelStyle}>Quotation valid until</label>
        <DatePicker
          mode="range"
          aria-label="Valid until"
          value={VALID_RANGE}
          onValueChange={noop}
          minDate={EARLIEST}
          open={frame !== null}
          container={frame ?? undefined}
        />
      </div>
    </div>
  );
}

export function DatePickerDemo() {
  return <OverlayDemo name="DatePicker">{() => <DatePickerFrame />}</OverlayDemo>;
}

function StaticMenu({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  return (
    <div className="sa-pop sa-pop--static">
      <div ref={setPanel} className={`sa-pop__panel ${STATIC_POPPER}`}>
        {panel && (
          <Menu open modal={false}>
            <MenuContent container={panel}>{children}</MenuContent>
          </Menu>
        )}
      </div>
    </div>
  );
}

function MenuFrame() {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className="sa-btn sa-btn--secondary">
              Actions
              <Icon name="chevron-down" size={20} />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon="edit">Edit quotation</MenuItem>
            <MenuItem icon="copy">Duplicate</MenuItem>
            <MenuItem icon="trash" danger>
              Withdraw
            </MenuItem>
          </MenuContent>
        </Menu>
        <p style={{ font: '400 12px/16px var(--font-sans)', color: 'var(--grey-600)', margin: '8px 0 0' }}>
          Click the button: live open and close.
        </p>
      </div>
      <StaticMenu>
        <MenuLabel>Actions</MenuLabel>
        <MenuItem icon="edit" shortcut={['E']}>
          Edit quotation
        </MenuItem>
        <MenuItem icon="copy" shortcut={['D']}>
          Duplicate
        </MenuItem>
        <MenuItem icon="send" data-active="">
          Send to buyer
        </MenuItem>
        <MenuItem icon="download">Download PDF</MenuItem>
        <MenuSeparator />
        <MenuItem icon="trash" danger>
          Withdraw
        </MenuItem>
        <MenuItem icon="lock" disabled>
          Archive (not available)
        </MenuItem>
      </StaticMenu>
      <StaticMenu>
        <MenuLabel>Sort by</MenuLabel>
        <MenuRadioGroup value="newest">
          <MenuRadioItem value="newest">Newest first</MenuRadioItem>
          <MenuRadioItem value="price">Lowest price</MenuRadioItem>
          <MenuRadioItem value="documents">Most documents</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuLabel>Show</MenuLabel>
        <MenuCheckboxItem checked>Verified exporters only</MenuCheckboxItem>
        <MenuCheckboxItem checked={false}>With sample documents</MenuCheckboxItem>
        <MenuSub>
          <MenuSubTrigger>More filters</MenuSubTrigger>
        </MenuSub>
      </StaticMenu>
    </div>
  );
}

export function MenuDemo() {
  return <OverlayDemo name="Menu">{() => <MenuFrame />}</OverlayDemo>;
}
