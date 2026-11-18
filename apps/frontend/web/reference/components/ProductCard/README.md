The main catalog unit. It must answer "can I buy this and can I trust it" at a glance.

## Anatomy
Photo (4:3), title, exporter name with VerificationBadge, price range and unit (mono), MOQ, Incoterm, document count chip ("8 documents").

## Rules
- Price is "From USD 980 / MT"; always unit and currency.
- Document count is a link target: it jumps to the Documents tab.
- One link target (title). Favourite is an IconButton with `aria-pressed`.
- Loading uses the Skeleton; missing photo uses Placeholder.

**Build with:** shadcn `Card` + `Badge`.. 
