'use client';

import * as D from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/icons';

export type CommandItem = { label: string; icon: IconName; keys?: string[]; onSelect?: () => void };
export type CommandGroup = { heading: string; items: CommandItem[] };
export type CommandPaletteProps = { groups: CommandGroup[]; trigger?: ReactNode };

const ITEM = 'sa-menu__item data-[selected=true]:bg-grey-100';
const HINTS: [string[], string][] = [
  [['↑', '↓'], 'Navigate'],
  [['↵'], 'Open'],
  [['Esc'], 'Close'],
];

export function CommandPalette({ groups, trigger }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      {trigger && (
        <D.Trigger asChild className="data-[state=closed]:![animation:none]">
          {trigger}
        </D.Trigger>
      )}
      <D.Portal>
        <D.Overlay className="sa-scrim fixed inset-0 z-modal !place-items-start">
          <D.Content className="sa-cmd @container mx-auto mt-10" aria-describedby={undefined}>
            <D.Title className="sr-only">Command palette</D.Title>
            <Command label="Command palette" loop>
              <div className="sa-cmd__in">
                <Icon name="search" size={20} />
                <Command.Input placeholder="Search or jump to…" aria-label="Search commands" />
                <span className="sa-kbd">Esc</span>
              </div>
              <Command.List className="sa-cmd__list">
                <Command.Empty className="sa-combo__empty">No results</Command.Empty>
                {groups.map((g) => (
                  <Command.Group
                    key={g.heading}
                    heading={<span className="sa-menu__label block">{g.heading}</span>}
                  >
                    {g.items.map((item) => (
                      <Command.Item
                        key={item.label}
                        className={ITEM}
                        onSelect={() => {
                          item.onSelect?.();
                          setOpen(false);
                        }}
                      >
                        <Icon name={item.icon} size={20} />
                        {item.label}
                        {item.keys && (
                          <span className="sa-menu__end !hidden @sm:!flex">
                            {item.keys.map((k) => (
                              <kbd key={k} className="sa-kbd">
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
            <div className="sa-cmd__foot flex-wrap">
              {HINTS.map(([keys, text]) => (
                <span key={text}>
                  {keys.map((k) => (
                    <kbd key={k} className="sa-kbd">
                      {k}
                    </kbd>
                  ))}
                  {text}
                </span>
              ))}
            </div>
          </D.Content>
        </D.Overlay>
      </D.Portal>
    </D.Root>
  );
}
