'use client';

import { useId, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Item =
  | { type: 'day'; text: string }
  | { type: 'event'; text: string }
  | { type: 'message'; text: string; meta: string; me?: boolean }
  | { type: 'offer'; rows: [label: string, from: string, to: string][]; meta: string; me?: boolean };

export type NegotiationThreadProps = ComponentProps<'section'> & {
  reference: string;
  title: string;
  status: string;
  items: Item[];
};

function Entry({ item }: { item: Item }) {
  if (item.type === 'day') return <span className="sa-thread__day">{item.text}</span>;
  if (item.type === 'event') {
    return (
      <span className="sa-event">
        <Icon name="ok" />
        {item.text}
      </span>
    );
  }
  return (
    <div
      className={clsx('sa-msg @max-sm:!max-w-[92%]', item.me && 'sa-msg--me')}
      style={item.type === 'offer' ? { maxWidth: '88%' } : undefined}
    >
      {item.type === 'message' ? (
        <div className="sa-msg__bubble">{item.text}</div>
      ) : (
        <div className="sa-offer">
          <span className="sa-badge sa-badge--warning" style={{ justifySelf: 'start' }}>
            <Icon name="warn" />
            Counter offer
          </span>
          {item.rows.map(([label, from, to]) => (
            <div key={label} className="sa-offer__row">
              <span>{label}</span>
              <b>
                <s>{from}</s>
                {to}
              </b>
            </div>
          ))}
          <div className="flex gap-2">
            <button className="sa-btn sa-btn--sm">Accept offer</button>
            <button className="sa-btn sa-btn--secondary sa-btn--sm">Counter</button>
          </div>
        </div>
      )}
      <div className="sa-msg__meta">{item.meta}</div>
    </div>
  );
}

export function NegotiationThread({
  reference,
  title,
  status,
  items,
  className,
  ...rest
}: NegotiationThreadProps) {
  const id = useId();
  return (
    <div className="@container">
      <section
        className={clsx('sa-mp @max-sm:!p-4', className)}
        aria-label={`Negotiation for ${reference}`}
        {...rest}
      >
        <div className="sa-mp__head" style={{ paddingBottom: 14, borderBottom: '1px solid var(--grey-200)' }}>
          <div className="min-w-0">
            <span className="sa-mp__ref">{reference}</span>
            <h3 className="sa-mp__title" style={{ margin: 0 }}>
              {title}
            </h3>
          </div>
          <span className="sa-badge sa-badge--warning">
            <Icon name="warn" />
            {status}
          </span>
        </div>
        <div className="sa-thread" aria-live="polite">
          {items.map((item, i) => (
            <Entry key={i} item={item} />
          ))}
        </div>
        <form className="sa-composer" onSubmit={(e) => e.preventDefault()}>
          <label className="sa-label sr-only" htmlFor={id}>
            Message
          </label>
          <textarea id={id} className="sa-textarea" rows={1} placeholder="Write a message" />
          <div className="sa-mp__row">
            <button type="button" className="sa-iconbtn" aria-label="Attach a document">
              <Icon name="upload" />
            </button>
            <button className="sa-btn">
              <Icon name="send" />
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
