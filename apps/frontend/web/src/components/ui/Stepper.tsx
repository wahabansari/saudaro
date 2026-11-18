import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon } from '@/icons';

export type StepperProps = ComponentProps<'ol'> & {
  steps: string[];
  current: number;
};

export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <ol className={clsx('sa-steps', className)} {...props}>
      {steps.map((label, index) => {
        const done = index < current;
        return (
          <li
            key={label}
            className={clsx('sa-step', done && 'sa-step--done')}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="sa-step__n">{done ? <Icon name="check" size={20} /> : index + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
