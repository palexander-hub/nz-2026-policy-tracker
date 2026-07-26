# NZ 2026 Policy Tracker

A free, neutral tracker for comparing confirmed New Zealand 2026 election commitments from official party sources.

Tracked parties:

- National
- Labour
- ACT
- New Zealand First
- Green Party
- Te Pāti Māori
- The Opportunity Party (TOP)

## What appears on the site

A visible entry must:

- be a decided commitment for the 2026 general election
- have `electionYear: 2026`
- have `status: "Confirmed 2026 policy"`
- use a direct official party source
- describe the commitment neutrally and factually

Do not publish government achievements, delivery records, 2023 policies, commentary, attacks on other parties, candidate announcements, general values, or uncertain proposals. If the official source is ambiguous, omit it.

Older entries may remain in `data/policies.json` as an archive, but the app never renders entries without `electionYear: 2026`.

## Files

- `index.html` — tracker markup
- `styles.css` — responsive visual design
- `app.js` — filtering, search, comparison, and 2026-only rendering
- `data/policies.json` — policy data
- `data/source-watch.json` — generated source-health output
- `scripts/check_sources.py` — official source checker
- `scripts/verify_setup.sh` — setup and data checks
- `scripts/serve_local.sh` — local preview helper
- `.github/workflows/check-sources.yml` — daily source-health check
- `HANDOFF.md` — migration and operating guide

## Run locally

```sh
./scripts/verify_setup.sh
./scripts/serve_local.sh 8000
```

Open `http://127.0.0.1:8000/`.

## Automatic policy updates

A Codex scheduled task checks the seven official party policy indexes. It adds and updates confirmed 2026 election commitments directly, refreshes source-watch data, validates the site, and publishes changes. It does not create a review queue or GitHub review issues.

The separate GitHub Action runs daily as a lightweight source-health check. It records reachability and content hashes in `data/source-watch.json`; it does not write policy summaries.

## Deployment

GitHub Pages publishes the repository root from `main`:

`https://palexander-hub.github.io/nz-2026-policy-tracker/`

There is no backend, database, paid API, secret, or build step.
