import type { ReactNode } from 'react';

type Props = {
  name: string;
  children: ReactNode;
};

export function LayoutFrame({ name, children }: Props) {
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}
