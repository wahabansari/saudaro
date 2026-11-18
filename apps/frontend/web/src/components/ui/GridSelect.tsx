'use client';

import * as Select from '@radix-ui/react-select';
import { Icon } from '@/icons';

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  'aria-label': string;
  id?: string;
  side?: 'top' | 'bottom';
};

/** Small listbox used inside the grid (rows per page, filter condition). */
export function GridSelect({ value, options, onValueChange, side = 'bottom', ...rest }: Props) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="sa-combo__trigger data-[state=closed]:![animation:none]" {...rest}>
        <Select.Value />
        <Select.Icon asChild>
          <Icon name="chevron-down" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="sa-combo__panel z-dropdown"
          position="popper"
          side={side}
          sideOffset={6}
          style={{ minWidth: 'var(--radix-select-trigger-width)', width: 'auto' }}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="sa-opt">
                <Select.ItemText>{option.label}</Select.ItemText>
                {option.value === value ? <Icon name="check" className="ml-auto" /> : null}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
