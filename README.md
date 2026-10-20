# tutorOS Connect
<!-- TUTOROS_CONNECT_STATIC_V1 -->

Lightweight entry page for the existing TutorOS installation.
This repository is NOT the classroom, Telegram bot, database, video store or HTTP proxy.

## Deployment target: Netlify Free

The owner rejected Render's card verification. Use the EXISTING repository on Netlify;
do not create a duplicate repository, buy a domain, add a payment method or upgrade a plan.
The retained render.yaml is historical and is not used by Netlify. Do not rerun the old
Render provisioning script to deploy this version.

1. Sign in to Netlify and select the Free plan (not a paid trial).
2. Add new project -> Import an existing project -> GitHub.
3. Grant access to this repository only: blakhacker39-maker/tutoros-connect.
4. Production branch: main; base directory: repository root; publish directory: site.
   netlify.toml supplies the no-dependencies echo build command and HTTP headers.
5. Disable branch deploys and deploy previews in Netlify. The ignore command also skips
   non-main/preview builds and commits that do not change site/ or netlify.toml.
6. Publish only this static page and check that it is accessible in a private browser
   without a Netlify login. New teams may start projects private; make only the entry
   page public. Do not disable authentication on the TutorOS classroom.

The Free plan has a monthly hard credit limit, not unlimited availability. Keep all
lesson video, documents and board events OFF this static host. Do not add Functions,
Forms, a database, analytics scripts or an Agent Runner to this project.

## Boundaries

- Only site/ is publicly served. No third-party scripts, fonts or analytics.
- site/config.json contains a public installation identifier, not an access token.
- Invitations remain in URL fragments; they are not sent in requests to the static host.
- Route candidates come from active-origins.json at the root of the routes branch in
  this same repository, as pinned in site/config.json. Route updates do not change main
  and must not trigger production deployments.
- Browser probes require protocol-1 installation and authenticated WebSocket checks.
- enabled:false intentionally remains until local integration and failover acceptance.
- No Board/TutorGram code, student data, credentials or lesson assets are published here.

## Activation is a separate local change

After the real Netlify URL exists, the existing Board needs a guarded update:
1. Allow the EXACT configured gateway origin/path in connectConfig, stableJoin and
   usePublicAccess. Never whitelist all netlify.app sites or arbitrary user URLs.
2. Use the same pinned routes-branch manifest for entry, host verification and tablet recovery.
3. Publish public route metadata only, with bounded refresh/expiry/retries and no site rebuild.
4. Permit challenge CORS only from the exact gateway; preserve teacher/student authentication.
5. Verify backup routes, real external student join, same-room reconnect and QR equality.
6. Enable the page only after verifying deployed config and local client integration.

The invitation is stable; the browser address can change after redirecting to a tunnel.
An already open classroom needs its own reconnect/failover integration. A static page
alone cannot migrate a live WebSocket or make an unavailable relay work.
Tailscale is not assumed eligible for free commercial use. The existing board, bot, VPN
and direct invitations remain untouched by these hosting-only repository changes.
