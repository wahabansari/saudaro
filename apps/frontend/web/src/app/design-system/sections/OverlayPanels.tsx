'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Popover, PopoverContent } from '@/components/ui/Popover';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { Tooltip } from '@/components/ui/Tooltip';
import { Icon } from '@/icons';
import { keepFocus, OverlayDemo, STATIC_POPPER } from './OverlayDemo';

export function DialogDemo() {
  return (
    <OverlayDemo name="Dialog">
      {(frame) =>
        frame && (
          <Dialog open modal={false}>
            <DialogContent
              container={frame}
              overlayProps={{ style: { minHeight: 300, borderRadius: 12 } }}
              onOpenAutoFocus={keepFocus}
            >
              <DialogTitle>Withdraw quotation QT-2026-0412?</DialogTitle>
              <DialogDescription>
                The importer will be notified and can no longer accept it. You can send a new quotation
                afterwards.
              </DialogDescription>
              <DialogActions>
                <button type="button" className="sa-btn sa-btn--ghost">
                  Keep quotation
                </button>
                <button type="button" className="sa-btn sa-btn--danger">
                  Withdraw
                </button>
              </DialogActions>
            </DialogContent>
          </Dialog>
        )
      }
    </OverlayDemo>
  );
}

function PopoverFrame() {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setFrame}
      className={STATIC_POPPER}
      style={{ minHeight: 200, padding: 20, background: 'var(--ground)', borderRadius: 12 }}
    >
      {frame && (
        <Popover open>
          <PopoverContent container={frame} aria-label="Incoterms" onOpenAutoFocus={keepFocus}>
            <strong>Incoterms</strong>
            <span className="sa-muted">
              FOB: the seller delivers onboard the vessel. The buyer pays freight and insurance from there.
            </span>
            <a className="sa-link" href="#">
              Read the full guide
            </a>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function PopoverDemo() {
  return <OverlayDemo name="Popover">{() => <PopoverFrame />}</OverlayDemo>;
}

export function SheetDemo() {
  return (
    <OverlayDemo name="Sheet">
      {(frame) =>
        frame && (
          <Sheet open modal={false}>
            <SheetContent
              title="Filters"
              container={frame}
              overlayProps={{
                style: { minHeight: 320, borderRadius: 12, padding: 0, justifyItems: 'end' },
              }}
              aria-describedby={undefined}
              onOpenAutoFocus={keepFocus}
            >
              <label className="sa-check">
                <input type="checkbox" defaultChecked />
                <span className="sa-check__box">
                  <Icon name="check" size={20} />
                </span>
                Verified exporters only
              </label>
              <label className="sa-check">
                <input type="checkbox" />
                <span className="sa-check__box">
                  <Icon name="check" size={20} />
                </span>
                Has certificates
              </label>
              <button type="button" className="sa-btn">
                Show 124 results
              </button>
            </SheetContent>
          </Sheet>
        )
      }
    </OverlayDemo>
  );
}

function TooltipFrame() {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setFrame} className={STATIC_POPPER}>
      {frame && (
        <Tooltip open container={frame} content="Incoterms define who pays for freight and insurance">
          <span />
        </Tooltip>
      )}
    </div>
  );
}

export function TooltipDemo() {
  return <OverlayDemo name="Tooltip">{() => <TooltipFrame />}</OverlayDemo>;
}

export function InteractiveDialog() {
  return (
    <div data-ds-interactive="Dialog">
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="sa-btn sa-btn--danger">
            Withdraw
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Withdraw quotation QT-2026-0412?</DialogTitle>
          <DialogDescription>
            The importer will be notified and can no longer accept it. You can send a new quotation
            afterwards.
          </DialogDescription>
          <DialogActions>
            <DialogClose asChild>
              <button type="button" className="sa-btn sa-btn--ghost">
                Keep quotation
              </button>
            </DialogClose>
            <DialogClose asChild>
              <button type="button" className="sa-btn sa-btn--danger">
                Withdraw
              </button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}
