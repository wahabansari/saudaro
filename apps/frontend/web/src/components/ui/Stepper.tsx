import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon } from '@/icons';

export type StepperProps = ComponentProps<'div'> & {
  steps: string[];
  current: number;
};

export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <div className={clsx('@container', className)} {...props}>
      <ol className="sa-steps @max-md:flex-wrap @max-md:gap-y-3">
        {steps.map((label, i) => (
          <li
            key={label}
            className={clsx('sa-step', i < current && 'sa-step--done')}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="sa-step__n">{i < current ? <Icon name="check" /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
