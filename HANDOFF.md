# NZ 2026 Policy Tracker Handoff

Last updated: 2026-06-20

This document is the moving-to-a-new-machine guide for the NZ 2026 Election Policy Tracker.

## Project Snapshot

- Repository: `git@github.com:palexander-hub/nz-2026-policy-tracker.git`
- Public site: `https://palexander-hub.github.io/nz-2026-policy-tracker/`
- Branch: `main`
- Current production model: free static GitHub Pages site
- Runtime: plain HTML, CSS, and JavaScript
- Backend/database/API/secrets: none
- Policy data file: `data/policies.json`
- Source monitor output: `data/source-watch.json`
- Daily source monitor: `.github/workflows/check-sources.yml`
- Latest local source-watch timestamp at handoff: `2026-06-19T19:09:48Z`
- Latest policy data timestamp at handoff: `2026-05-21`

The tracker is a neutral, official-source guide. It should not publish AI-written political policy summaries automatically. Source monitoring can flag official source changes, but a person should review and edit `data/policies.json`.

## What To Copy Or Recreate

The repository contains the website and automation. It does not contain credentials.

You need one of these on the new machine:

1. A working GitHub SSH identity that can push to `palexander-hub/nz-2026-policy-tracker`.
2. Or the existing repo-specific private key, moved securely to:

   ```sh
   ~/.ssh/nz_2026_policy_tracker_ed25519
   ```

Do not commit the SSH key to this repository. If copying the key, use a secure channel such as a password manager, encrypted transfer, or direct local transfer. Then lock down permissions:

```sh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/nz_2026_policy_tracker_ed25519
```

The push helper in this repo defaults to that key path, but you can override it with `NZ_POLICY_TRACKER_SSH_KEY`.

## New Machine Setup

Install or confirm these tools:

- `git`
- `python3`
- `node`
- a browser

Clone the repo:

```sh
mkdir -p ~/Code/Personal/01-Active-Projects
cd ~/Code/Personal/01-Active-Projects
GIT_SSH_COMMAND='ssh -i ~/.ssh/nz_2026_policy_tracker_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' git clone git@github.com:palexander-hub/nz-2026-policy-tracker.git 02-NZ-ELECTION
cd 02-NZ-ELECTION
```

Verify the clone:

```sh
./scripts/verify_setup.sh
```

If Node or Python are installed outside your normal `PATH`, pass them explicitly:

```sh
NODE_BIN=/path/to/node PYTHON_BIN=/path/to/python3 ./scripts/verify_setup.sh
```

Serve locally:

```sh
./scripts/serve_local.sh 8000
```

If needed, `serve_local.sh` also accepts `PYTHON_BIN=/path/to/python3`.

Then open:

```text
http://127.0.0.1:8000/
```

Use a local server rather than opening `index.html` directly, because the app fetches JSON files from `data/`.

## Normal Edit Workflow

1. Pull the latest `main`.
2. Edit the relevant file.
3. Run:

   ```sh
   ./scripts/verify_setup.sh
   ```

4. If you changed the frontend, also browser-check desktop and mobile.
5. Commit.
6. Push:

   ```sh
   ./scripts/push_main.sh
   ```

The helper runs the equivalent of:

```sh
GIT_SSH_COMMAND='ssh -i ~/.ssh/nz_2026_policy_tracker_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' git push origin HEAD:main
```

If your key lives somewhere else:

```sh
NZ_POLICY_TRACKER_SSH_KEY=/path/to/key ./scripts/push_main.sh
```

GitHub Pages deploys from `main` at the repository root. There is no build command.

## File Map

- `index.html` - static page structure, navigation, hero, policy panel, source ledger
- `styles.css` - full visual design and responsive layout
- `app.js` - client-side data loading, party filters, topic buttons, panel rendering
- `assets/hero-policy-tracker.png` - editorial hero composite
- `data/policies.json` - human-maintained official-source policy entries
- `data/source-watch.json` - generated source-watch output, usually updated by GitHub Actions
- `scripts/check_sources.py` - official source checker using Python standard library only
- `scripts/verify_setup.sh` - local sanity checks for a clone or edit
- `scripts/serve_local.sh` - local static server wrapper
- `scripts/push_main.sh` - SSH-key-aware push helper
- `.github/workflows/check-sources.yml` - scheduled source monitoring and issue creation
- `README.md` - public-facing project overview
- `HANDOFF.md` - this migration and maintenance guide

## Policy Data Rules

Edit `data/policies.json` for policy content.

Each policy entry should have:

- `partyId`
- `topic`
- `subtopic`
- `title`
- `status`
- `sourceType`
- `lastChecked`
- `summary`
- `officialSource.label`
- `officialSource.url`
- `tags`

Allowed statuses are:

- `Published policy`
- `Announcement`
- `Government record`
- `Historic/older policy`
- `Needs review`

Keep summaries neutral, short, and tied to the official source. Use only official party sources or official government record pages. Do not use news articles, commentary, social posts, or interpretation as source material for summaries.

When adding a new topic:

1. Add the topic to the `topics` array in `data/policies.json`.
2. Add or update policy entries using that exact topic string.
3. Add display copy and an icon mapping in `TOPIC_COPY` inside `app.js`.
4. Browser-check the topic button on desktop and mobile.

Housing is intentionally not shown as its own button until there are housing-specific official entries.

## Current Topic Set

- Cost of living (`Tax & Economy`)
- Health
- Education
- Environment and Energy (`Climate & Environment`)
- Public safety (`Law & Justice`)
- Infrastructure
- Public service (`Public Service`)
- Te Tiriti (`Te Tiriti & Constitution`)

## Visual Design Notes

The frontend was rebuilt to be closer in spirit to The Conversation's policy tracker reference:

- visual and image-led
- story-like flow
- mobile-first care
- editorial, not a dashboard
- fewer controls up front
- topic buttons that reveal policy comparison panels
- Luxon and Hipkins as major static background figures

Desktop is considered visually locked unless a future request explicitly changes it. For mobile-only tweaks, keep changes inside:

```css
@media (max-width: 760px) {
  ...
}
```

Before accepting frontend changes, check:

- desktop width around `1280x720`
- mobile width around `390x844`
- no horizontal scrolling
- topic buttons do not clip at the bottom
- party tabs are usable
- both leaders remain visible in the mobile crop

## Source Monitoring

GitHub Actions runs `.github/workflows/check-sources.yml` on this cron:

```yaml
17 17 * * *
```

GitHub schedules use UTC. The workflow can also be run manually from the Actions tab.

The workflow:

1. Checks out the repo.
2. Sets up Python.
3. Runs `python scripts/check_sources.py`.
4. Opens GitHub issues for changed official source pages.
5. Commits `data/source-watch.json` if it changed.

The workflow has:

```yaml
permissions:
  contents: write
  issues: write
```

The source checker reads:

- broad official pages from `watchSources`
- every `officialSource.url` from each policy entry

It only accepts domains listed in each party's `officialDomains`.

Some official sites return HTTP 403 to GitHub Actions or local scripts. That is expected for a few source rows and is recorded in `data/source-watch.json`; it does not necessarily mean the site is broken.

## Manual Source Review Workflow

When a source changes:

1. Open the GitHub issue labelled `source-review`.
2. Open the official source URL.
3. Decide whether the change is a real policy change, a layout/content maintenance edit, a typo, or old material.
4. If the tracker should change, edit `data/policies.json` neutrally.
5. Update `lastChecked`.
6. Run `./scripts/verify_setup.sh`.
7. Commit and push.
8. Close the issue when reviewed.

Do not let the source checker rewrite policy summaries automatically.

## Short URL

Preferred short URL:

```text
https://bit.ly/nz-policy-tracker
```

Target:

```text
https://palexander-hub.github.io/nz-2026-policy-tracker/
```

Fallbacks:

1. `https://bit.ly/nzpolicytracker`
2. `https://bit.ly/nz-2026-policy-tracker`

As of the last check, `https://bit.ly/nz-policy-tracker` returned `404`, so it appeared unclaimed. Creating it requires a Bitly account or API token and should not add secrets to this repo.

## Troubleshooting

### The page is blank locally

Use a local server:

```sh
./scripts/serve_local.sh 8000
```

Then open `http://127.0.0.1:8000/`. Opening `index.html` directly can fail because browser security rules may block JSON fetches.

### Push fails with SSH/auth errors

Check the key exists and permissions are correct:

```sh
ls -l ~/.ssh/nz_2026_policy_tracker_ed25519
chmod 600 ~/.ssh/nz_2026_policy_tracker_ed25519
```

Then try:

```sh
./scripts/push_main.sh
```

If the key has been rotated, set `NZ_POLICY_TRACKER_SSH_KEY=/path/to/new/key`.

### Push is rejected because remote moved

The GitHub Action may have committed a newer `data/source-watch.json`.

Run:

```sh
git fetch origin main
git rebase origin/main
./scripts/verify_setup.sh
./scripts/push_main.sh
```

If there is a conflict, it will usually be in `data/source-watch.json`. Preserve the newest generated source-watch data unless you intentionally reran the checker.

### GitHub Pages does not update immediately

Wait a few minutes, then hard refresh the browser. GitHub Pages and browsers can cache static files briefly.

### Mobile view looks stale

Try a hard refresh or add a temporary cache-busting query string:

```text
https://palexander-hub.github.io/nz-2026-policy-tracker/?v=test
```

Remove the query string when sharing the site.

## Pre-Move Checklist

- [ ] Commit and push all local work.
- [ ] Confirm `git status --short` is clean.
- [ ] Confirm the public site loads.
- [ ] Securely move or recreate the GitHub SSH key.
- [ ] Create the Bitly link if desired.
- [ ] Keep this repo as the source of truth; do not rely on an uncommitted local copy.

## Post-Move Checklist

- [ ] Clone the repository on the new machine.
- [ ] Run `./scripts/verify_setup.sh`.
- [ ] Run `./scripts/serve_local.sh 8000` and open the local site.
- [ ] Confirm SSH push works, ideally with a tiny docs-only test commit or the next real change.
- [ ] Confirm GitHub Actions are still enabled.
- [ ] Confirm GitHub Pages still points to `main` and `/root`.
