'use client';

import { useRef, useState, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Props = Omit<ComponentProps<'div'>, 'onDrop'> & {
  hint?: string;
  accept?: string;
  multiple?: boolean;
  inputLabel?: string;
  onFiles?: (files: File[]) => void;
};

export type FileUploadProps = Props;

export function FileUpload({
  hint,
  accept,
  multiple,
  inputLabel = 'Choose files',
  onFiles,
  className,
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      {...props}
      data-over={over || undefined}
      className={clsx('sa-drop min-w-0', className)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles?.(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        type="file"
        hidden
        aria-label={inputLabel}
        accept={accept}
        multiple={multiple}
        onChange={(e) => onFiles?.(Array.from(e.target.files ?? []))}
      />
      {over ? (
        <strong>Drop to upload</strong>
      ) : (
        <>
          <div className="sa-empty__icon" style={{ margin: '0 auto 12px' }}>
            <Icon name="upload" size={20} />
          </div>
          <strong>Drag files here</strong> or{' '}
          <button
            type="button"
            className="sa-link cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
            onClick={() => input.current?.click()}
          >
            browse
          </button>
          {hint && (
            <div className="sa-hint" style={{ marginTop: 6 }}>
              {hint}
            </div>
          )}
        </>
      )}
    </div>
  );
}
