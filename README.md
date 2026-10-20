# tutorOS Connect
<!-- TUTOROS_CONNECT_STATIC_V1 -->

Lightweight, private-data-free entry page for an existing TutorOS installation.
This repository is NOT the classroom, Telegram bot, database, or an HTTP proxy.

Deploy `main` as a Render **Static Site** in the owner's existing workspace `111`.
The Blueprint defines one static service only; review the Render screen before approving.
Do not add a paid instance, database, card or upgrade for this deployment.
Static-site bandwidth/build allowances still apply; this is not an unlimited hosting promise.

## Boundaries

- Only `site/` is publicly served. No third-party scripts, fonts or analytics.
- `site/config.json` contains a public installation identifier, not an access token.
- Invitations remain in URL fragments and are not part of requests to Render.
- Route candidates are read from `routes/active-origins.json` on the **routes branch**;
  changes there must never redeploy the main-branch static site.
- Browser probes require protocol-1 installation and authenticated WebSocket checks.
- This first publication intentionally has `enabled:false`: it cannot replace working
  invitations before local gateway configuration, route publishing, and fallback tests pass.
- No source code, database, configuration secrets or lesson assets from Board/TutorGram
  are uploaded by the provisioning script.

## Activation is a separate local change

After the Render URL exists, the existing Board needs a guarded, tested update:
1. Accept the exact configured Render gateway in connectConfig, stableJoin, usePublicAccess.
2. Use the same pinned routes-branch manifest for student entry, host verification and trusted-tablet recovery.
3. Publish public route metadata only, with bounded retries/expiry and no site rebuild.
4. Permit challenge CORS only from the exact gateway; preserve all authentication.
5. Verify every usable backup, external student join, same-room reconnect and QR equality.
6. Turn enabled on only after verifying the deployed config belongs to this installation.

Tailscale is not assumed to be eligible for commercial free use. A relay failure cannot be
repaired by a static page alone; at least one verified relay must be available.
Existing direct invitations and the running board remain untouched by initial provisioning.
