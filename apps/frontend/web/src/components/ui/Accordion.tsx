import * as AccordionPrimitive from '@radix-ui/react-accordion';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon } from '@/icons';

const KEEP_CLOSED_VISIBLE = 'data-[state=closed]:![animation:none]';

export type AccordionProps = ComponentProps<typeof AccordionPrimitive.Root>;
export type AccordionItemProps = ComponentProps<typeof AccordionPrimitive.Item>;
export type AccordionTriggerProps = ComponentProps<typeof AccordionPrimitive.Trigger>;
export type AccordionContentProps = ComponentProps<typeof AccordionPrimitive.Content>;

export function Accordion({ className, ...props }: AccordionProps) {
  return <AccordionPrimitive.Root className={clsx('sa-acc', className)} {...props} />;
}

export function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      className={clsx(
        'border-t border-solid border-card-border first:border-t-0',
        KEEP_CLOSED_VISIBLE,
        className,
      )}
      {...props}
    />
  );
}

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className={KEEP_CLOSED_VISIBLE}>
      <AccordionPrimitive.Trigger
        className={clsx(
          'sa-acc__btn',
          KEEP_CLOSED_VISIBLE,
          '[&>svg]:ease-pop [&>svg]:transition-transform [&>svg]:duration-[200ms] [&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <Icon name="chevron-down" size={20} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, ...props }: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={clsx('sa-acc__panel', KEEP_CLOSED_VISIBLE, className)}
      {...props}
    />
  );
}
