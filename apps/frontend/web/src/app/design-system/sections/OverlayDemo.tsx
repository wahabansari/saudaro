'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

/** Renders a Radix popper panel in normal flow, where the preview places it. */
export const STATIC_POPPER =
  '[&_[data-radix-popper-content-wrapper]]:!static [&_[data-radix-popper-content-wrapper]]:![transform:none]';

/** Positions a popper panel like the preview's .sa-pop__panel: absolute, 6px below its relative parent. */
export const ANCHORED =
  'relative [&_[data-radix-popper-content-wrapper]]:!absolute [&_[data-radix-popper-content-wrapper]]:![transform:none] [&_[data-radix-popper-content-wrapper]]:!left-0 [&_[data-radix-popper-content-wrapper]]:!top-[calc(100%+6px)]';
export const ANCHORED_END =
  'relative [&_[data-radix-popper-content-wrapper]]:!absolute [&_[data-radix-popper-content-wrapper]]:![transform:none] [&_[data-radix-popper-content-wrapper]]:!left-auto [&_[data-radix-popper-content-wrapper]]:!right-0 [&_[data-radix-popper-content-wrapper]]:!top-[calc(100%+6px)]';

export const comboOf = (frame: HTMLElement | null) =>
  frame?.querySelector<HTMLElement>('.sa-combo') ?? undefined;

export const labelStyle: CSSProperties = {
  font: '500 14px/20px var(--font-sans)',
  display: 'block',
  marginBottom: 6,
};

export const noop = () => undefined;
export const keepFocus = (event: Event) => event.preventDefault();

type FrameProps = { name: string; children: (frame: HTMLDivElement | null) => ReactNode };

export function OverlayDemo({ name, children }: FrameProps) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name} ref={setFrame}>
        {children(frame)}
      </div>
    </section>
  );
}
