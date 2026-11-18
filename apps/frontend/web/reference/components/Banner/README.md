A persistent message about the whole page or account (verification pending, maintenance, expiring documents). Different from Alert (inline, about one thing) and Toast (temporary).

## Rules
- Icon, one sentence, one optional action, optional dismiss.
- Warning banners are not dismissible until the cause is fixed.
- `role="status"`; urgent ones use `role="alert"`.

**Build with:** Custom on shadcn `Alert`.. 
