import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type NegotiationOfferChange = {
  label: string;
  /** Preformatted previous value, shown struck through. */
  before: string;
  /** Preformatted new value. */
  after: string;
};

export type NegotiationItem =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; mine?: boolean; text: string; author: string; time: string }
  | {
      kind: 'offer';
      id: string;
      mine?: boolean;
      title: string;
      changes: readonly NegotiationOfferChange[];
      author: string;
      time: string;
    }
  | { kind: 'event'; id: string; text: string };

export type NegotiationThreadProps = Omit<ComponentProps<'section'>, 'children'> & {
  /** Reference such as "QT-2026-0412". */
  reference: string;
  title: string;
  /** Status word from the enum, for example "Under negotiation". */
  statusLabel: string;
  items: readonly NegotiationItem[];
  /** Unique id for the composer field, so its label can point at it. */
  composerId: string;
  onAccept?: () => void;
  onCounter?: () => void;
  onAttach?: () => void;
};

function Meta({ author, time }: { author: string; time: string }) {
  return <div className="sa-msg__meta">{`${author} · ${time}`}</div>;
}

export function NegotiationThread({
  reference,
  title,
  statusLabel,
  items,
  composerId,
  onAccept,
  onCounter,
  onAttach,
  className,
  ...rest
}: NegotiationThreadProps) {
  return (
    <section className={clsx('sa-mp', className)} aria-label={`Negotiation for ${reference}`} {...rest}>
      <div className="sa-mp__head" style={{ paddingBottom: 14, borderBottom: '1px solid var(--grey-200)' }}>
        <div>
          <span className="sa-mp__ref">{reference}</span>
          <h3 className="sa-mp__title" style={{ margin: 0 }}>
            {title}
          </h3>
        </div>
        <span className="sa-badge sa-badge--warning">
          <Icon name="warn" size={20} />
          {statusLabel}
        </span>
      </div>
      <div className="sa-thread" aria-live="polite">
        {items.map((item) => {
          if (item.kind === 'day') {
            return (
              <span key={item.id} className="sa-thread__day">
                {item.label}
              </span>
            );
          }
          if (item.kind === 'event') {
            return (
              <span key={item.id} className="sa-event">
                <Icon name="ok" size={20} />
                {item.text}
              </span>
            );
          }
          if (item.kind === 'offer') {
            return (
              <div
                key={item.id}
                className={clsx('sa-msg', item.mine && 'sa-msg--me')}
                style={{ maxWidth: '88%' }}
              >
                <div className="sa-offer">
                  <span className="sa-badge sa-badge--warning" style={{ justifySelf: 'start' }}>
                    <Icon name="warn" size={20} />
                    {item.title}
                  </span>
                  {item.changes.map((change) => (
                    <div key={change.label} className="sa-offer__row">
                      <span>{change.label}</span>
                      <b>
                        <s>{change.before}</s>
                        {change.after}
                      </b>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="sa-btn sa-btn--sm" onClick={onAccept}>
                      Accept offer
                    </button>
                    <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={onCounter}>
                      Counter
                    </button>
                  </div>
                </div>
                <Meta author={item.author} time={item.time} />
              </div>
            );
          }
          return (
            <div key={item.id} className={clsx('sa-msg', item.mine && 'sa-msg--me')}>
              <div className="sa-msg__bubble">{item.text}</div>
              <Meta author={item.author} time={item.time} />
            </div>
          );
        })}
      </div>
      <form className="sa-composer" onSubmit={(event) => event.preventDefault()}>
        <label
          className="sa-label"
          htmlFor={composerId}
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
        >
          Message
        </label>
        <textarea id={composerId} className="sa-textarea" rows={1} placeholder="Write a message" />
        <div className="sa-mp__row">
          <button type="button" className="sa-iconbtn" aria-label="Attach a document" onClick={onAttach}>
            <Icon name="download" size={20} />
          </button>
          <button type="submit" className="sa-btn">
            <Icon name="send" size={20} />
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
