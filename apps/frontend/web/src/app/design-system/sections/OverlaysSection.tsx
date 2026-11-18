'use client';

import { MenuDemo, DatePickerDemo } from './OverlayChoices';
import { ComboboxDemo, CommandPaletteDemo, MultiSelectDemo, UserMenuDemo } from './OverlayMenus';
import { DialogDemo, PopoverDemo, SheetDemo, TooltipDemo } from './OverlayPanels';

export function OverlaysSection() {
  return (
    <>
      <DialogDemo />
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
