import type { ReactNode } from 'react';

type DemoSectionProps = { name: string; children: ReactNode };

export function DemoSection({ name, children }: DemoSectionProps) {
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}
