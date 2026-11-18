Shows which verification levels a company holds (`company_verification_levels`). Verification builds buyer confidence, so it appears on every exporter card, product page and quotation.

## Levels
`email`, `phone`, `business_registration`, `business_address`, `authorized_representative`, `documents_reviewed`, `independent_check`.

## Variants
- **Summary**: shield icon and "Verified" plus count, used on cards.
- **Level chip**: one level, with tooltip explaining what was checked and when it expires.
- **Expired / revoked**: neutral outline with a clock icon. Never hide a lapsed level silently.

## Rules
- The word "Verified" always accompanies the shield.
- Tooltip lists level, date granted, expiry.

**Build with:** Custom component on shadcn `Badge` and `Tooltip`.. 
