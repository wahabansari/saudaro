'use client';

import { MenuDemo, DatePickerDemo } from './OverlayChoices';
import { ComboboxDemo, CommandPaletteDemo, MultiSelectDemo, UserMenuDemo } from './OverlayMenus';
import { DialogDemo, InteractiveDialog, PopoverDemo, SheetDemo, TooltipDemo } from './OverlayPanels';

export function OverlaysSection() {
  return (
    <>
      <DialogDemo />
      <InteractiveDialog />
      <PopoverDemo />
      <SheetDemo />
      <TooltipDemo />
      <ComboboxDemo />
      <CommandPaletteDemo />
      <DatePickerDemo />
      <MenuDemo />
      <MultiSelectDemo />
      <UserMenuDemo />
    </>
  );
}
