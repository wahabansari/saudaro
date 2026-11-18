# Content voice

**Plain, precise, respectful.** Written for busy trade professionals, many reading in a second language.

## Principles
- Short sentences, active voice, concrete nouns. One idea per sentence.
- Say the next step. "Add a delivery port to publish" beats "Fix errors".
- Use trade terms exactly as the buyer knows them: RFQ, quotation, Incoterm, FOB, MOQ, bill of lading.
- No hype ("revolutionary", "seamless"), no exclamation marks, no jokes in errors.
- Sentence case everywhere, including buttons and headings. "Post an RFQ", not "Post An RFQ".

## Buttons: verb + object
Post an RFQ · Send quotation · Accept quotation · Upload documents · Download PDF · Ask a question · Withdraw quotation.

## Statuses
Written as words from the API: "Under negotiation", "In production", "Needs info". Never show the snake_case.

## Messages
| Type | Pattern | Example |
|---|---|---|
| Success | What happened, to what | "Quotation QT-2026-0412 sent." |
| Error | What failed, how to fix | "coa-batch-77.pdf is over 10 MB. Choose a smaller file." |
| Empty | Fact, reason, action | "No quotations yet. Exporters reply within 2 days on average." (only if true) |
| Confirm | Name the object and consequence | "Withdraw QT-2026-0412? The importer will be notified." |

## Numbers and data
- Currency before amount with a space: `USD 1,240.00`. Unit after: `/ MT`.
- Dates: `14 Mar 2026` (day, short month, year). Times 24-hour with zone when relevant.
- References always in the data style (tabular, slashed zero): `RFQ-2026-00418`.
- Countries by name, never flags alone.

## Headline examples
"Trade with proof." · "Find verified exporters." · "Every certificate, before you ask." · "Post an RFQ in minutes."
