<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Email reply selectors and validation share src/lib/languages.ts.
Login-specific languages and browser detection live in auth-i18n.ts, sharing saved choices with the landing page without requiring new landing translations.
Page-specific SEO titles and descriptions belong in leaf route head() declarations, not root defaults, to avoid duplicated metadata; canonical links must also remain leaf-only.

Payments: catalog and environment use credit-catalog.ts; environment-scoped balance RPCs, atomic fulfillment and adjustment ledgers keep test purchases and duplicates from funding live usage. Checkout orders are created server-side for the authenticated UUID and bound to the provider transaction before checkout; fulfillment never trusts browser custom data. Refund reconciliation runs server-side before entitlement reads and assistant use, paginating purchases and approved adjustments (notification subscriptions do not guarantee refund events); entitlement is cumulative over tax-inclusive line adjustments with monotonic snapshots and signed reservation accounting, so stale reads, rounding and chargeback reversals cannot duplicate credits. Completed bound orders are reconciled from the provider on entitlement reads via the same fulfillment helper as signed events.
Assistant credits use request UUIDs, cached answers and idempotent failure release; expired reservations return idempotently after five minutes while provider calls time out earlier. Photos bind by digest, are re-encoded and validated locally, sent inline through authenticated Responses only, never stored as bytes; use low reasoning and settled balances. assistant-links opens HTTP(S) links separately; The assistant does not read websites; links in answers only open in a new tab.
Phone login uses a private immutable number-to-account mapping and verifies actual Auth identity before credential rotation; profile contacts never identify login or admin promotion targets. Sign-in and code checks share one Twilio Verify service with per-number rate limits across SMS/voice and an hourly per-number code limit.
Account deletion and support/privacy/copyright requests are persisted with owner reads and admin-only review; deletion never auto-deletes financial or shared content before a retention review; an in-app request does not replace the required public operator contact.
Admin access is checked against the signed-in user's own role row through the authenticated client before privileged reads; admin listings are paginated to protect names.
Retired «Da ricordare» endpoints stay inert: the email hook authenticates then returns without sending, the calls endpoint answers 410; preserve unmanaged email scheduler authentication.
Writing style is stored locally as `traduchat:font` and applied on the root element before render, so navigation and reloads keep the typography without a flash. Private files use signed links; conversation photos open in an in-app pinch, wheel and pan viewer.
Removing a chat attachment from Storico records a per-user hidden item; deleting a received message records a per-user row in public.chat_hidden_messages (room loading, home inbox, realtime adds and the offline cache filter them), so personal removals never delete shared chat messages or storage files.
Offline translation is retired; the root unregisters its specific worker and removes only its page caches. Keep chat cache/outbox separate to preserve existing messages. Recovery links stay on the public auth screen until a recovery session is confirmed.
Assistant preflight runs independent quota checks concurrently and overlaps photo digest preparation with credit reconciliation; both must finish before reservation and provider use.
Sent messages are editable only by authors; regeneration avoids stale translations. Optional case-insensitive unique nicknames lead conversation names; admin shows both names. Opt-in calls have separate one-to-one and bounded group simple-peer paths; RPCs enforce room membership, device ownership and atomic admission. Call minutes (all calls) go to the highest-balance participant via call-payer.ts, idempotent per minute. Both reuse persistent translated chat, lazy cached tickets and temporary TURN; separate paths preserve one-to-one behavior.
Voice notes share WAV recording and room direction in calls. Chat helpers resolve reading; audio inbox queues only new received vocals after opt-in. Emoji keep the text/outbox path.
The home inbox lists only received messages from joined rooms and refreshes from the existing realtime stream.
The video-call simulation demo is removed; real calls live in rooms, use short-lived Twilio TURN credentials, and stop all media tracks and timers on exit. Calls never record audio or video.
Call mute targets remote video across fullscreen, leaving mic and voice notes unchanged; local Web Audio feedback closes after its beep.
- Storie: public.profile_stories (foto nel bucket status-photos, scadenza 24h via expires_at); contatti via private.shares_room_with; funzioni in src/lib/stories.functions.ts.
- PageTranslator auto-translates UI into the preferred reading language (cached); mark user text and self-translated pages translate="no". Pages rendering copy from a flat array must render every entry; inserting one shifts later labels.
Open-app call alerts mount once in the root for authenticated matches; use RLS reads and the recent inbox, with device-local per-user room read watermarks so the badge never claims a cross-device total. Inbox excludes system rows but retains null file kinds (text).
Payment completion events without catalog metadata must fetch the completed transaction through the authenticated provider API before fulfillment; only a previously server-bound transaction/order can receive credits, because signed events omit import metadata and checkout custom data can be replaced.
Newsletter choices are immutable authenticated consent events written by a serializing RPC using verified Auth email; owner notifications use a fixed template and event-based idempotency, never the app email service for campaigns.
