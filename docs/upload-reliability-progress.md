# Upload reliability — completion audit (2026-11-02)

## Delivered behavior and evidence

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Editable filename title | Single upload initializes title without extension; batch already did. Manual edits retained. | Chrome browser test with Bengali filename and manual title |
| Remember selections | Last app, per-app folder/custom folder mode/name, compression and bitrate in versioned localStorage. Restore readiness prevents overwriting saved values. | Browser reload/app-switch/custom-folder/audio-options/corrupt-JSON checks |
| Same API/dashboard identity | Exact `(appId, assetId)` composite match, independent of folder. UI displays both. No extra prefix invented: server has never prefixed DB asset IDs. App namespace remains in storage path. | Real upload cross-folder replacement and composite uniqueness tests |
| Safe replacement | Unique storage keys; advisory transaction lock by app+asset; DB write before old-object deletion. Failed DB write cleans uploaded object. | Real optimizer+Postgres with mocked S3: concurrent uploads, S3 outage, DB-trigger failure |
| Reliable Telegram events | Upload and outbox event commit together. Leased worker, retry-after/global cooldown, bounded retries, error/message ID history and manual retry. | Actual worker + mocked fetch: 429, no early retry, successful retry, dedup, interrupted lease reclaim, multi-event drain, disabled settings, timeout/exhaustion |
| Secure direct completion | Signed expiring app/asset/bucket/key/URL ticket, storage existence check, enforced App Check, actual storage MIME. Completed event marker prevents stale completion resurrection. | Ticket field tampering tests and actual API handler missing-file/replay/cross-folder tests |
| Cleanup | Durable cleanup jobs for superseded and abandoned upload keys; skips currently referenced objects and retries failed deletion. | Failure then retry and referenced-object protection tests |
| Audit improvements | Trash deletion preserves DB rows when physical deletion fails; Telegram HTML/URL escaping and field bounds. | Source review, TypeScript, scoped lint |

## Commands verified

- `npm run build`: production build passes.
- `npx tsc --noEmit`: passes.
- `DATABASE_URL=postgresql://localhost:5432/mms_upload_reliability_test npm run test:uploads`: 7 tests pass (multiple failure/recovery assertions per test).
- `npm run test:upload-form`: real Chrome checks pass against isolated local Next dev server (see README setup).
- Scoped ESLint on every changed implementation/test/script: passes.
- `git diff --check`: passes.
- Database workflow: `npm run db:push` using `src/db/schema.ts`. Standalone migration SQL and helper removed at user request.

## Operational limits and remaining audit findings

- Code is not deployed or pushed. Minute cron configuration is included in vercel.json; a host supporting that frequency and CRON_SECRET must run it after deployment. Other hosts can schedule the documented authenticated endpoint. Do not claim the production scheduler is active.
- Existing direct-upload clients must send the returned upload_token with completion; update clients with the server release. Standard multipart API remains unchanged. No matching direct-upload client was found in the provided Android source.
- No real Telegram messages were sent during tests. Old notification misses cannot be reconstructed because previous code kept no delivery history. New sent status means Telegram accepted the message; it does not prove a phone displayed a notification.
- Telegram may duplicate a message if a process crashes after Telegram accepts it but before the sent acknowledgment is stored. Exactly-once network delivery is not offered by Telegram sendMessage; stable event keys suppress application re-enqueue duplicates.
- Repository-wide lint reports 8 pre-existing errors and 25 warnings outside the changed checked files. No blanket unrelated refactor was made.
- npm audit reports 24 dependency advisories (2 low, 22 moderate). Suggested resolutions include major downgrades to ESLint/Drizzle/Swagger; these were not automatically applied. This is a short upload/security audit, not a complete penetration test.
