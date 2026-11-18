The negotiation view for one quotation. Events come from `negotiation_events`: counter_offer, clarification_request, clarification_response, revision_submitted, accept_intent, decline, note.

## Anatomy
Message bubbles (mine on the right, `action` fill; theirs on the left, `card-sunken`), offer cards for counter offers showing changed fields, system events as centred captions, composer with attachment and Send.

## Rules
- Counter-offer cards show a before/after of each changed term.
- Every message shows author, company and time (caption, mono for time).
- The thread is append-only; edits are not offered, only a new message.
- New messages announce via `aria-live="polite"`.

**Build with:** Custom composed from Card, Badge, Textarea and Button.. 
