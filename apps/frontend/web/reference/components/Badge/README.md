Compact label for status, category or count. The label text is always present; colour reinforces it, never carries it.

## Tones
Neutral, info, success, warning, danger, outline, solid. Sizes: default 24px, large 28px. Pill shape (`sa-badge--pill`) for counts and tags.

## Status mapping
Use exactly these values from the API docs. Never invent a status or tone.
### RFQ (`rfqs.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `published` | info | Published |
| `paused` | warning | Paused |
| `closed` | neutral | Closed |
| `expired` | outline | Expired |
| `cancelled` | danger | Cancelled |
| `awarded` | success | Awarded |

### Quotation (`quotations.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `submitted` | info | Submitted |
| `under_negotiation` | warning | Under negotiation |
| `accepted` | success | Accepted |
| `rejected` | danger | Rejected |
| `withdrawn` | outline | Withdrawn |
| `expired` | outline | Expired |
| `superseded` | outline | Superseded |

### Deal (`deals.status`)
| Value | Tone | Label |
|---|---|---|
| `active` | info | Active |
| `in_production` | info | In production |
| `shipped` | info | Shipped |
| `delivered` | success | Delivered |
| `completed` | success | Completed |
| `cancelled` | danger | Cancelled |
| `disputed` | danger | Disputed |

### Verification case (`verification_cases.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `submitted` | info | Submitted |
| `in_review` | info | In review |
| `needs_info` | warning | Needs info |
| `approved` | success | Approved |
| `rejected` | danger | Rejected |
| `expired` | outline | Expired |
| `revoked` | danger | Revoked |


## Rules
- Each tone has an icon so it survives greyscale and colour-blindness.
- Sentence case, no all-caps, snake_case becomes words.
- Badges are not buttons. If clickable, use a Chip.
- Text and fill pairs are verified: success 6.0:1, warning 7.2:1, danger 5.7:1, info 9.1:1.

**Build with:** shadcn `Badge` with `cva` tones.. Wrap status values in a single `StatusBadge` helper that holds the mapping above.
