-- Remove only the two QA submissions created during end-to-end testing.
-- Real registrations, including "team brasil", are intentionally untouched.
DELETE FROM players WHERE team_id IN ('059c6681-3169-4a7a-ace2-6b5b838e9e45','e7cce02d-1f05-45ad-8d2c-40085dcf3ea3');
--> statement-breakpoint
DELETE FROM team_coaches WHERE team_id IN ('059c6681-3169-4a7a-ace2-6b5b838e9e45','e7cce02d-1f05-45ad-8d2c-40085dcf3ea3');
--> statement-breakpoint
DELETE FROM team_responsibles WHERE team_id IN ('059c6681-3169-4a7a-ace2-6b5b838e9e45','e7cce02d-1f05-45ad-8d2c-40085dcf3ea3');
--> statement-breakpoint
DELETE FROM registrations WHERE team_id IN ('059c6681-3169-4a7a-ace2-6b5b838e9e45','e7cce02d-1f05-45ad-8d2c-40085dcf3ea3');
--> statement-breakpoint
DELETE FROM teams WHERE id IN ('059c6681-3169-4a7a-ace2-6b5b838e9e45','e7cce02d-1f05-45ad-8d2c-40085dcf3ea3');
