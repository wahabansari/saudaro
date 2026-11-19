'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/icons';
import { FilterPanel } from '@/components/ui/FilterDropdown';
import { ColumnPickerPanel, type ColumnPickerItem } from '@/components/ui/GridMenus';

const noop = () => undefined;

function Foot() {
  return (
    <div className="sa-fil__foot">
      <button type="button" className="sa-btn sa-btn--text sa-btn--sm">
        Clear
      </button>
      <button type="button" className="sa-btn sa-btn--sm">
        Apply
      </button>
    </div>
  );
}

function PortOption({ checked, count, children }: { checked?: boolean; count: number; children: ReactNode }) {
  return (
    <li>
      <label className="sa-check">
        <input type="checkbox" defaultChecked={checked} />
        <span className="sa-check__box">
          <Icon name="check" />
        </span>
        <span>{children}</span>
        <small>{count}</small>
      </label>
    </li>
  );
}

const NUMERIC_STYLE = { fontFeatureSettings: "'lnum','cv05'" } as const;

/**
 * The four filter panels of the FilterDropdown preview, shown open. The port, quantity and
 * deadline frames are literal preview markup: their sample state (counts, thumb positions,
 * pressed preset) does not follow from the panel logic.
 */
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
        <div className="sa-fil__head">
          <strong>Destination port</strong>
          <small>5 of 28</small>
        </div>
        <div className="sa-fil__body">
          <div className="sa-search" style={{ width: '100%' }}>
            <Icon name="search" />
            <input type="search" defaultValue="ham" aria-label="Search ports" />
            <button type="button" className="sa-search__clear" aria-label="Clear search">
              <Icon name="x" />
            </button>
          </div>
          <ul className="sa-fil__list">
            <PortOption checked count={12}>
              <mark style={{ background: 'var(--warning-bg)', color: 'inherit' }}>Ham</mark>burg, Germany
            </PortOption>
            <PortOption count={3}>
              Ham<span></span>ilton, Canada
            </PortOption>
            <PortOption count={0}>Ho Chi Minh, Vietnam</PortOption>
          </ul>
          <div className="sa-combo__foot" style={{ border: 0, padding: 0 }}>
            Showing 2 matches
          </div>
        </div>
        <Foot />
      </div>
      <div className="sa-fil" role="dialog" aria-label="Filter Quantity (MT)">
        <div className="sa-fil__head">
          <strong>Quantity (MT)</strong>
          <small>Range</small>
        </div>
        <div className="sa-fil__body">
          <div className="sa-fil__2">
            <div>
              <label className="sa-lbl" htmlFor="ds-grid-n1">
                Min
              </label>
              <input
                className="sa-input"
                id="ds-grid-n1"
                defaultValue="20"
                inputMode="numeric"
                style={NUMERIC_STYLE}
              />
            </div>
            <div>
              <label className="sa-lbl" htmlFor="ds-grid-n2">
                Max
              </label>
              <input
                className="sa-input"
                id="ds-grid-n2"
                defaultValue="1,500"
                inputMode="numeric"
                style={NUMERIC_STYLE}
              />
            </div>
          </div>
          <div className="sa-slider" role="group" aria-label="Quantity range">
            <span className="sa-slider__track"></span>
            <span className="sa-slider__fill" style={{ left: '8%', right: '40%' }}></span>
            <span
              className="sa-slider__thumb"
              tabIndex={0}
              role="slider"
              aria-label="Minimum"
              aria-valuemin={0}
              aria-valuemax={1500}
              aria-valuenow={20}
              style={{ left: '8%' }}
            ></span>
            <span
              className="sa-slider__thumb"
              tabIndex={0}
              role="slider"
              aria-label="Maximum"
              aria-valuemin={20}
              aria-valuemax={2500}
              aria-valuenow={1500}
              style={{ left: '60%' }}
            ></span>
          </div>
        </div>
        <Foot />
      </div>
      <div className="sa-fil" role="dialog" aria-label="Filter Deadline">
        <div className="sa-fil__head">
          <strong>Deadline</strong>
          <small>Date range</small>
        </div>
        <div className="sa-fil__body">
          <div className="sa-fil__2">
            <div>
              <label className="sa-lbl" htmlFor="ds-grid-d1">
                From
              </label>
              <input className="sa-input" id="ds-grid-d1" defaultValue="01 Dec 2026" />
            </div>
            <div>
              <label className="sa-lbl" htmlFor="ds-grid-d2">
                To
              </label>
              <input className="sa-input" id="ds-grid-d2" defaultValue="31 Dec 2026" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="sa-chip" aria-pressed="false">
              Today
            </button>
            <button type="button" className="sa-chip" aria-pressed="false">
              Next 7 days
            </button>
            <button type="button" className="sa-chip" aria-pressed="true">
              This month
            </button>
          </div>
        </div>
        <Foot />
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
          countLabel="10 of 12"
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
