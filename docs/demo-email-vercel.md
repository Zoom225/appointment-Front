# Demo confirmation email on Vercel

Demo bookings remain in the current browser session and are created as `CONFIRMED` before the email request starts. The Angular app then calls the same-origin `/api/demo/send-confirmation` Function. Real bookings continue to use Spring Boot and never call this Function.

The Vercel Functions read their configuration only from server-side environment variables:

- `APP_PUBLIC_URL`
- `DEMO_TOKEN_SECRET`
- `DEMO_SMTP_USERNAME`
- `DEMO_SMTP_PASSWORD`
- `DEMO_SMTP_PORT`
- `DEMO_SMTP_HOST`
- `DEMO_MAIL_ENABLED`
- `DEMO_MAIL_FROM`

Keep these values in Vercel's environment settings. Do not add them to Angular environment files, browser configuration, or source control. Set `DEMO_MAIL_ENABLED` to `true` to activate sending; any other value leaves booking local and reports that mail is disabled.

The mail Function creates a signed, stateless verification token that expires after 30 days. The QR code contains the public `/verify-demo?token=...` URL. The token intentionally contains the public name, reference, booking time, reason, and confirmation status; it contains no email address or user identifier. Since demo appointments are not stored on a server, the QR verifies the snapshot made at booking and cannot reflect a later local cancellation or reset.

The send endpoint applies a small per-process IP limit and a strict request body limit. Vercel Functions are stateless and scale across instances, so this in-memory limit is best-effort and is not a persistent abuse-prevention system. Add a shared rate-limiting service or Vercel Firewall rule if public volume requires stronger protection.

`vercel.json` keeps the SPA fallback as its final rewrite. Vercel checks deployed files and Functions before applying that fallback, so `/api/demo/*` resolves to Functions while `/verify-demo` loads Angular.
