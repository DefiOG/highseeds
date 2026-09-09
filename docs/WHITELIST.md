# Whitelist setup

Edit `src/data/whitelist.json`, then rebuild and redeploy. The farm's Whitelist button opens `#/whitelist`.

| Setting | Value |
| --- | --- |
| `title`, `description` | Public campaign copy |
| `status` | `coming-soon`, `open`, or `closed` |
| `slots` | Actual whitelist allocation as a positive number, or `null` for unannounced. This is not automatically the NFT supply. |
| `deadlineUtc` | ISO date with timezone, e.g. `2026-10-01T18:00:00Z`, or empty for unannounced |
| `announcementUrl` | HTTPS URL of your official announcement |
| `applicationUrl` | HTTPS URL of your hosted application form |
| `eligibility` | Final eligibility requirements |
| `selectionNotice` | Selection and notification wording |

The page defaults to coming soon. Opening requires `status: "open"`, both valid HTTPS links, and an empty or valid future deadline. A passed deadline closes the application link automatically while the page is open. An invalid deadline keeps applications unavailable. Enforce the same deadline in your form provider, since a visitor can bookmark the form itself.

## Application storage

This page links to a hosted application form; it does not collect or store submissions itself. Create that form later and put its URL in `applicationUrl`. Configure fields for X handle, repost URL, wallet address, and the relevant privacy notice. The provider must handle durable storage, spam protection, duplicate review, and confirmation. Set its confirmation to “Application received,” not “Slot reserved.” Review social actions separately: this website does not verify likes or reposts.

No wallet connection or payment is needed for this application flow. Never ask applicants for a seed phrase or private key.

All JSON settings are public. No `.env` changes are needed for a hosted form link. If a custom backend is added later, keep database credentials and API secrets in server-side environment variables. `VITE_*` values are included in the browser bundle and are not secret.

The shipped configuration does not open a campaign, invent a deadline, assign slots, or register applicants. Fill in the campaign and hosted-form details, then change `status` to `open` to launch.
