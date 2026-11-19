'use client';

import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { ChangeEvent, ComponentPropsWithRef, DragEvent, MouseEvent, ReactNode } from 'react';
import { Icon } from '@/icons';

export type FileUploadProps = Omit<ComponentPropsWithRef<'div'>, 'children' | 'onDrop'> & {
  accept?: string;
  multiple?: boolean;
  hint?: ReactNode;
  onFiles?: (files: File[]) => void;
  over?: boolean;
};

export function FileUpload({
  accept,
  multiple = false,
  hint,
  onFiles,
  over: overProp,
  className,
  ...props
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const over = overProp ?? dragging;

  function pick(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length) onFiles?.(multiple ? list : list.slice(0, 1));
  }

  function handleClick(event: MouseEvent) {
    if (event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.click();
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    pick(event.target.files);
    event.target.value = '';
  }

  return (
    <div
      className={clsx('sa-drop', className)}
      data-over={over || undefined}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      {...props}
    >
      {over ? (
        <strong>Drop to upload</strong>
      ) : (
        <>
          <div className="sa-empty__icon" style={{ margin: '0 auto 12px' }}>
            <Icon name="upload" size={20} />
          </div>
          <strong>Drag files here</strong> or{' '}
          <a className="sa-link" href="#">
            browse
          </a>
          {hint ? (
            <div className="sa-hint" style={{ marginTop: 6 }}>
              {hint}
            </div>
          ) : null}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sa-sr"
        tabIndex={-1}
        aria-label="Drag files here or browse"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
    </div>
  );
}
