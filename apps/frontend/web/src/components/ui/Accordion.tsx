'use client';

import clsx from 'clsx';
import { Fragment, useId, useState, type ComponentProps, type ReactNode } from 'react';
import { Icon } from '@/icons';

export type AccordionProps = Omit<ComponentProps<'div'>, 'defaultValue'> & {
  items: { value: string; title: ReactNode; content?: ReactNode }[];
  defaultValue?: string;
};

export function Accordion({ items, defaultValue, className, ...props }: AccordionProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultValue);
  return (
    <div className={clsx('sa-acc', className)} {...props}>
      {items.map(({ value, title, content }, i) => (
        <Fragment key={value}>
          <button
            type="button"
            id={`${id}-${value}-t`}
            className="sa-acc__btn"
            aria-expanded={open === value}
            aria-controls={open === value ? `${id}-${value}` : undefined}
            style={i > 0 ? { borderTop: '1px solid var(--card-border)' } : undefined}
            onClick={() => setOpen(open === value ? undefined : value)}
          >
            {title}
            <Icon name="chevron-down" />
          </button>
          {open === value && content && (
            <div
              role="region"
              id={`${id}-${value}`}
              aria-labelledby={`${id}-${value}-t`}
              className="sa-acc__panel"
            >
              {content}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
