# NZ 2026 Policy Tracker

A free static dashboard for comparing New Zealand 2026 election policy positions from official party sources only.

Tracked parties:

- National
- Labour
- ACT
- New Zealand First
- Green Party
- Te Pāti Māori

This is a neutral public tracker. It is not a political opinion site.

## Files

- `index.html` - dashboard markup
- `styles.css` - responsive visual design
- `app.js` - filtering, search, comparison, and rendering
- `data/policies.json` - editable policy data
- `data/source-watch.json` - generated source monitoring output
- `scripts/check_sources.py` - daily official source checker
- `.github/workflows/check-sources.yml` - GitHub Actions schedule

## Add Or Edit Policies

Edit `data/policies.json`.

Each policy entry needs:

- `partyId` matching one of the party IDs
- `topic` matching one of the dashboard topics
- `subtopic`
- `title`
- `status`: `Published policy`, `Announcement`, `Government record`, `Historic/older policy`, or `Needs review`
- `lastChecked` in `YYYY-MM-DD` format
- `summary` written neutrally
- `officialSource.label`
- `officialSource.url`
- `tags` for search

Keep summaries short, factual, and attributable to the official source. If a current 2026 policy is not available, mark the entry as `Needs review` or `Historic/older policy`.

## Deploy With GitHub Pages

1. Create a GitHub repository and add these files.
2. Commit and push to `main`.
3. In GitHub, go to `Settings` -> `Pages`.
4. Set source to `Deploy from a branch`.
5. Choose branch `main` and folder `/root`.
6. Save. GitHub will publish the dashboard at the Pages URL shown in settings.

No backend, database, paid API, secrets, or build step is needed.

## Daily Source Checker

The workflow runs once per day and can also be started manually from the Actions tab.

`scripts/check_sources.py`:

- reads official source URLs from `data/policies.json`
- checks only domains listed in each party's `officialDomains`
- downloads pages using Python standard library tools
- extracts the page title and visible text
- stores a content hash in `data/source-watch.json`
- marks `contentChanged` as `true` when the hash differs from the previous check

The workflow commits changes to `data/source-watch.json` automatically. It does not scrape media sites and does not use paid services.

## Keep The Data Accurate

- Use official party websites, official party documents, or official government record pages only.
- Keep summaries short and mark uncertain entries as `Needs review` until a person has checked the source.
- Update `lastChecked` whenever a policy summary is manually reviewed.
- Prefer exact source pages over broad homepage links.
- Do not mix commentary, media reporting, or personal interpretation into summaries.
- Mark old election material as `Historic/older policy`.
- Mark uncertain or changing material as `Needs review`.
