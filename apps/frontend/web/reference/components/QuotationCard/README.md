Summary of one quotation, shown to the importer when comparing and to the exporter when tracking.

## Anatomy
Reference (mono), exporter, status Badge, price per unit and total (mono, right aligned), Incoterm, payment terms, validity date, attached documents count, actions: Accept, Counter, Ask a question.

## Rules
- Accept is Primary and opens a confirm Dialog showing the final terms.
- Show "Valid until" with date; under 48 hours uses a warning badge.
- Revisions show "Revision 3" and link to history (append-only, from quotation_status_history).

**Build with:** shadcn `Card` + `Badge` + `Dialog`.. 
