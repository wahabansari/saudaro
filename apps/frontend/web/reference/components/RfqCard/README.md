List entry for a published RFQ (`rfqs.status = published`).

## Anatomy
Title, buyer company with VerificationBadge, product category, quantity and unit, target Incoterm and destination port, deadline, quotation count, status Badge, primary action "Send quotation".

## Rules
- Deadline is shown as date and "closes in 3 days" (text), turning `warning` under 48 hours.
- Quotation count is a number only; never show competitor prices.
- Owner view replaces the action with "View quotations".

**Build with:** shadcn `Card` + `Badge` + `Button`.. 
