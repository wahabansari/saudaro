The exporter's sample documents, shown beside the product so importers find everything without asking. This is the core differentiator of SAUDARO.

## Anatomy
Type icon, file name, document type label (from `DEAL_DOCUMENT_TYPES`: certificate, product_specification, packing_list, commercial_invoice, bill_of_lading, inspection_report, …), size and date in mono, state badge, Preview and Download buttons.

## States
Available, locked to verified importers (lock icon and "Verified importers only"), expired (warning badge with date), uploading.

## Rules
- File names truncate at the end; the full name is in a Tooltip and in the preview.
- Download is a real link with `download` attribute and file size in the label.
- Group tiles by document type with a heading.

**Build with:** Custom on shadcn `Card` and `Button`.. 
