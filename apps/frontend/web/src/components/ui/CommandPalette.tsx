'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/icons';
import { Highlight } from './Highlight';

export type CommandPaletteItem = {
  label: string;
  icon: IconName;
  shortcut?: string[];
  onSelect?: () => void;
};

export type CommandPaletteGroup = { heading: string; items: CommandPaletteItem[] };

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandPaletteGroup[];
  placeholder: string;
  emptyLabel?: string;
  container?: HTMLElement;
};

const ITEM =
  'sa-menu__item data-[selected=true]:bg-grey-100 [animation:sa-item-in_340ms_var(--ease-pop)_both]';

type BodyProps = Pick<CommandPaletteProps, 'groups' | 'placeholder' | 'emptyLabel' | 'onOpenChange'>;

function PaletteBody({ groups, placeholder, emptyLabel, onOpenChange }: BodyProps) {
  const [search, setSearch] = useState('');

  return (
    <Command label="Command palette">
      <div className="sa-cmd__in">
        <Icon name="search" size={20} />
        <Command.Input
          placeholder={placeholder}
          aria-label="Search commands"
          value={search}
          onValueChange={setSearch}
        />
        <span className="sa-kbd">Esc</span>
      </div>
      <Command.List className="sa-cmd__list">
        <Command.Empty className="sa-combo__empty">{`${emptyLabel} "${search}"`}</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group.heading}>
            <div className="sa-menu__label" role="presentation">
              {group.heading}
            </div>
            {group.items.map((item) => (
              <Command.Item
                key={item.label}
                value={item.label}
                className={ITEM}
                onSelect={() => {
                  item.onSelect?.();
                  onOpenChange(false);
                }}
              >
                <Icon name={item.icon} size={20} />
                <Highlight text={item.label} query={search} />
                {item.shortcut ? (
                  <span className="sa-menu__end">
                    {item.shortcut.map((key) => (
                      <kbd key={key} className="sa-kbd">
                        {key}
                      </kbd>
                    ))}
                  </span>
                ) : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="sa-cmd__foot">
        <span>
          <kbd className="sa-kbd">↑</kbd>
          <kbd className="sa-kbd">↓</kbd>Navigate
        </span>
        <span>
          <kbd className="sa-kbd">↵</kbd>Open
        </span>
        <span>
          <kbd className="sa-kbd">Esc</kbd>Close
        </span>
      </div>
    </Command>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder,
  emptyLabel = 'No results for',
  container,
}: CommandPaletteProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      onOpenChange(!open);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const content = (
    <DialogPrimitive.Content
      className="sa-cmd"
      aria-label="Command palette"
      aria-describedby={undefined}
      onOpenAutoFocus={container ? (event) => event.preventDefault() : undefined}
    >
      <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
      <PaletteBody
        groups={groups}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        onOpenChange={onOpenChange}
      />
    </DialogPrimitive.Content>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={!container}>
      <DialogPrimitive.Portal container={container}>
        {container ? (
          content
        ) : (
          <DialogPrimitive.Overlay className="sa-scrim fixed inset-0 z-modal items-start pt-16">
            {content}
          </DialogPrimitive.Overlay>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
