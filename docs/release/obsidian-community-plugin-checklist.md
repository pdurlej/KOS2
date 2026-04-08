# Obsidian Community Plugins Checklist

This checklist is for preparation only. Do not submit until each item is green.

## Packaging

- [ ] `manifest.json` has the intended public version and description
- [ ] `versions.json` includes the same version mapped to the supported minimum Obsidian version
- [ ] `main.js`, `manifest.json`, and `styles.css` are attached to the matching GitHub release
- [ ] release tag matches the shipped commit

## Product surface

- [ ] plugin name, description, and screenshots are KOS2-first and no longer framed as Copilot
- [ ] README install steps work on a clean vault
- [ ] README explains local-first setup and optional cloud path clearly
- [ ] hero image and product preview are suitable for public listing traffic

## Quality gates

- [ ] `npm test -- --runInBand`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] manual smoke on a clean Obsidian vault
- [ ] local Ollama setup path verified end-to-end

## Plugin review readiness

- [ ] no committed API keys, secrets, or tracked `.env` files
- [ ] no dead links in README or docs
- [ ] issue templates no longer refer to Copilot where that would confuse public users
- [ ] license and upstream attribution stay explicit

## Submission prep

- [ ] prepare the Community Plugins submission PR against the Obsidian repo
- [ ] confirm repository topics, short description, and social preview are final
- [ ] prepare short release notes for reviewers
