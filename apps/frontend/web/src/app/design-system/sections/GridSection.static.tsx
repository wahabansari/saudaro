'use client';

import { Icon } from '@/icons';
import { FilterPanel } from '@/components/ui/FilterDropdown';
import { ColumnPickerPanel, type ColumnPickerItem } from '@/components/ui/GridMenus';
import type { GridFilterOption } from '@/components/ui/DataGrid.types';

const noop = () => undefined;

const PORTS: GridFilterOption[] = [
  { value: 'Hamburg, Germany', count: 12 },
  { value: 'Hamilton, Canada', count: 3 },
  { value: 'Ho Chi Minh, Vietnam', count: 0 },
];

/** The four filter panels of the FilterDropdown preview, shown open. */
export function FilterPanels() {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4,max-content)', gap: 24, alignItems: 'start' }}
    >
      <div className="sa-fil" role="dialog" aria-label="Filter Product">
        <FilterPanel
          label="Product"
          type="text"
          value={{ type: 'text', value: 'basmati' }}
          onApply={noop}
          onClose={noop}
        />
      </div>
      <div className="sa-fil" role="dialog" aria-label="Filter Destination port">
        <FilterPanel
          label="Destination port"
          type="enum"
          value={{ type: 'enum', values: ['Hamburg, Germany'] }}
          options={PORTS}
          searchLabel="Search ports"
          defaultQuery="ham"
          onApply={noop}
          onClose={noop}
        />
      </div>
      <div className="sa-fil" role="dialog" aria-label="Filter Quantity (MT)">
        <FilterPanel
          label="Quantity (MT)"
          type="number"
          value={{ type: 'number', min: 20, max: 1500 }}
          bounds={[0, 2500]}
          onApply={noop}
          onClose={noop}
        />
      </div>
      <div className="sa-fil" role="dialog" aria-label="Filter Deadline">
        <FilterPanel
          label="Deadline"
          type="date"
          value={{ type: 'date', from: '2026-12-01', to: '2026-12-31' }}
          onApply={noop}
          onClose={noop}
        />
      </div>
    </div>
  );
}

const COLUMN_LABELS = [
  'RFQ ref',
  'Product',
  'HS code',
  'Quantity (MT)',
  'Incoterm',
  'Destination port',
  'Status',
  'Target price',
  'Documents',
];
const HIDDEN_COLUMNS = ['Incoterm', 'Documents'];

const COLUMNS: ColumnPickerItem[] = COLUMN_LABELS.map((label) => ({
  id: label,
  label,
  isVisible: !HIDDEN_COLUMNS.includes(label),
  isLocked: label === 'RFQ ref',
}));

/** The three menus of the GridMenus preview, shown open. */
export function GridMenusStatic() {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <ul className="sa-menu" role="menu" aria-label="Column menu">
        <li className="sa-menu__label" role="presentation">
          Status
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="filter" />
          Filter…
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="pushpin" />
          Pin to left
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="eye-off" />
          Hide column
        </li>
      </ul>
      <div className="sa-fil" role="dialog" aria-label="Columns" style={{ width: 260 }}>
        <ColumnPickerPanel
          columns={COLUMNS}
          onToggle={noop}
          onReset={noop}
          done={
            <button type="button" className="sa-btn sa-btn--sm">
              Done
            </button>
          }
        />
      </div>
      <ul className="sa-menu" role="menu" aria-label="Row actions">
        <li className="sa-menu__item" role="menuitem" data-active>
          <Icon name="eye" />
          View RFQ
          <span className="sa-menu__end">
            <kbd className="sa-kbd">↵</kbd>
          </span>
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="send" />
          Send quotation
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="copy" />
          Duplicate
        </li>
        <li className="sa-menu__item" role="menuitem">
          <Icon name="upload" />
          Download documents
        </li>
        <li className="sa-menu__sep" role="separator" />
        <li className="sa-menu__item sa-menu__item--danger" role="menuitem">
          <Icon name="trash" />
          Delete RFQ
        </li>
      </ul>
    </div>
  );
}
