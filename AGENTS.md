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

- Profile and chat photo uploads share a browser-only compression helper, loaded dynamically; this avoids server image processing and retains original files when compression fails or increases size.
- Registration validation lives in a browser-safe pure helper shared with tests; keep profile metadata separate from authentication credentials.
- The contacts tab and panel share ContactList; PeerCallsProvider owns global incoming/outgoing WebRTC media and uses participant-only call_sessions with authenticated mutation RPCs. Directory RPC exposes only discoverable user IDs/usernames, never profile private fields. Native WebRTC fetches short-lived Twilio TURN credentials via an authenticated server function, falling back to STUN; relays are needed on mobile/restrictive networks.
- Private conference rooms use Twilio Video with browser-only dynamic SDK loading; authenticated server functions issue room-scoped short-lived HS256 tokens only after RLS membership checks. Twilio Video signing keys are separate from the gateway connection key; client-created rooms require Twilio Group Room configuration.
- Camera translation uses authenticated multimodal server functions and request-local Responses helpers; translated text and originals persist in participant-only camera_translations, with chat polling for receipt and no photo persistence until explicitly shared.
- Shared Avatar loads short-lived profile-photo URLs via narrow authenticated RPCs; only the current photo of a discoverable contact is readable, without exposing private profile fields or granting photo mutations to others.
- Account menu data follows the app's authenticated user ID and clears on identity changes; this prevents stale profiles and missing-session errors after sign-out/sign-in without a reload.
- Profile password changes verify an email recovery OTP before updating credentials; the destination comes from the authenticated account, never editable profile metadata.
- Presentation styling is scoped to app and call wrappers with semantic CSS tokens; authentication, data access and media lifecycle remain unchanged when previewing visual drafts.

- Translated voice notes use chat_messages with a private audio_path and participant-only signed storage URLs; the existing conversation polling delivers both text and voice consistently.
- Group creation uses the authenticated contact directory rather than sample-data names, so participant choices match registered accounts.
- Message beeps and hidden-tab browser notices share one account-scoped browser preference and global received-message poll; suppress history, duplicates and outgoing messages independently of incognito. Request browser permission only from the Bip toggle; notices contain no message content and use an existing messaging worker when available, without registering an app-shell worker.
