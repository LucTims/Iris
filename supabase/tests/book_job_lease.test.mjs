// Tests des fonctions SQL de la migration 20260925130000_book_job_lease_watchdog
// sur un vrai Postgres (PGlite, Postgres compilé en WASM). Vault, pg_net et
// pg_cron sont remplacés par des bouchons qui enregistrent les appels.
//
// Lancement (PGlite n'est pas une dépendance du projet) :
//   npm i --no-save @electric-sql/pglite
//   node supabase/tests/book_job_lease.test.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const MIGRATION =
  process.argv[2] ||
  fileURLToPath(new URL("../migrations/20260925130000_book_job_lease_watchdog.sql", import.meta.url));
const db = new PGlite();

async function q(sql, params) {
  const r = await db.query(sql, params);
  return r.rows;
}

// --- Environnement Supabase minimal -----------------------------------------
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA extensions;
  CREATE SCHEMA vault;
  CREATE TABLE vault.secrets (name text primary key, secret text, description text);
  CREATE VIEW vault.decrypted_secrets AS SELECT name, secret AS decrypted_secret FROM vault.secrets;
  CREATE FUNCTION vault.create_secret(new_secret text, new_name text, new_description text) RETURNS uuid
    LANGUAGE sql AS $$ INSERT INTO vault.secrets VALUES (new_name, new_secret, new_description); SELECT gen_random_uuid(); $$;
  CREATE SCHEMA net;
  CREATE TABLE net.calls (id serial, url text, body jsonb, headers jsonb, timeout_milliseconds int);
  CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb,
                                headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds int DEFAULT 2000) RETURNS bigint
    LANGUAGE sql AS $$ INSERT INTO net.calls (url, body, headers, timeout_milliseconds) VALUES (url, body, headers, timeout_milliseconds) RETURNING id::bigint; $$;
  CREATE SCHEMA cron;
  CREATE TABLE cron.jobs (name text primary key, schedule text, command text);
  CREATE TABLE cron.job_run_details (end_time timestamptz);
  CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint
    LANGUAGE sql AS $$ INSERT INTO cron.jobs VALUES (job_name, schedule, command)
      ON CONFLICT (name) DO UPDATE SET schedule = excluded.schedule, command = excluded.command RETURNING 1::bigint; $$;

  -- Table telle qu'en production avant la migration
  CREATE TABLE public.book_generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'canceled')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_index INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    chapter_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bible JSONB
  );
  CREATE INDEX idx_book_generation_jobs_status ON public.book_generation_jobs(status);
`);

// Données d'avant migration : un job bloqué depuis 2 jours, un job récent en
// cours (ancien code), un job terminé.
const P = "11111111-1111-4111-8111-111111111111";
const U = "22222222-2222-4222-8222-222222222222";
await q(`INSERT INTO public.book_generation_jobs (id, project_id, user_id, status, current_index, total, updated_at)
  VALUES ('aaaaaaaa-0000-4000-8000-000000000001', $1, $2, 'running', 4, 7, now() - interval '2 days'),
         ('aaaaaaaa-0000-4000-8000-000000000002', $1, $2, 'running', 1, 7, now() - interval '1 minute'),
         ('aaaaaaaa-0000-4000-8000-000000000003', $1, $2, 'completed', 5, 5, now() - interval '3 days')`, [P, U]);

// --- Migration (sans CREATE EXTENSION, indisponibles ici) --------------------
const sql = readFileSync(MIGRATION, "utf8").replace(/^CREATE EXTENSION.*$/gm, "");
await db.exec(sql);
await db.exec(sql); // idempotence : la migration peut être rejouée

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log("ok  -", name);
  } catch (err) {
    failures++;
    console.log("FAIL -", name, "\n     ", err.message);
  }
}

const job = async (id) => (await q(`SELECT * FROM public.book_generation_jobs WHERE id = $1`, [id]))[0];
const claim = async (id, mode) => (await q(`SELECT * FROM public.claim_book_job($1, $2)`, [id, mode]))[0] || null;
// Vieillit un job comme le ferait le nouveau code : updated_at n'est jamais
// plus récent que heartbeat_at.
const age = (id, interval) =>
  q(`UPDATE public.book_generation_jobs SET heartbeat_at = now() - $2::interval, updated_at = now() - $2::interval WHERE id = $1`, [id, interval]);
async function newJob(total = 5, extra = {}) {
  const rows = await q(
    `INSERT INTO public.book_generation_jobs (project_id, user_id, total, lock_token)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [P, U, total, extra.lock_token ?? null]
  );
  return rows[0];
}

await test("migration : le job bloqué depuis 2 jours est clos (failed/stalled), le récent et le terminé sont intacts", async () => {
  assert.equal((await job("aaaaaaaa-0000-4000-8000-000000000001")).status, "failed");
  assert.equal((await job("aaaaaaaa-0000-4000-8000-000000000001")).last_error, "stalled");
  assert.equal((await job("aaaaaaaa-0000-4000-8000-000000000002")).status, "running");
  assert.equal((await job("aaaaaaaa-0000-4000-8000-000000000003")).status, "completed");
  const recent = await job("aaaaaaaa-0000-4000-8000-000000000002");
  assert.ok(recent.heartbeat_at, "heartbeat_at rempli depuis updated_at");
});

await test("migration : URL du worker dans le Vault et tâches pg_cron planifiées (une seule fois)", async () => {
  const secrets = await q(`SELECT * FROM vault.secrets`);
  assert.equal(secrets.length, 1);
  assert.equal(secrets[0].secret, "https://www.irisboom.online/api/generate-book/process");
  const jobs = await q(`SELECT name, schedule FROM cron.jobs ORDER BY name`);
  assert.deepEqual(jobs.map((j) => j.name), ["iris-book-jobs-watchdog", "iris-cron-history-cleanup"]);
  assert.equal(jobs[0].schedule, "* * * * *");
  assert.equal(jobs[1].schedule, "23 3 * * *");
});

await test("droits : anon/authenticated ne peuvent pas exécuter les RPC du bail", async () => {
  const rows = await q(`SELECT has_function_privilege('authenticated', 'public.claim_book_job(uuid, text)', 'EXECUTE') AS a,
                               has_function_privilege('anon', 'public.advance_book_job(uuid, uuid, integer, jsonb)', 'EXECUTE') AS b,
                               has_function_privilege('service_role', 'public.claim_book_job(uuid, text)', 'EXECUTE') AS c,
                               has_function_privilege('service_role', 'public.book_jobs_watchdog_tick()', 'EXECUTE') AS d`);
  assert.deepEqual(rows[0], { a: false, b: false, c: true, d: false });
});

await test("un job tenu par un worker vivant n'est jamais pris (relais, éditeur, tâche planifiée)", async () => {
  const j = await newJob(5, { lock_token: "bbbbbbbb-0000-4000-8000-000000000001" });
  assert.equal(await claim(j.id, "hop"), null);
  assert.equal(await claim(j.id, "watchdog"), null);
  await age(j.id, "90 seconds");
  assert.equal(await claim(j.id, "sweep"), null, "90 s < 2 min : vivant");
});

await test("un worker muet depuis plus de 2 min est remplacé (compté comme reprise)", async () => {
  const j = await newJob(5, { lock_token: "bbbbbbbb-0000-4000-8000-000000000002" });
  await age(j.id, "3 minutes");
  const c = await claim(j.id, "watchdog");
  assert.ok(c);
  assert.notEqual(c.lock_token, "bbbbbbbb-0000-4000-8000-000000000002");
  assert.equal(c.resume_count, 1);
  assert.equal(c.stall_count, 1);
  assert.equal(c.lock_pending, false);
});

await test("job libéré : le relais le prend tout de suite, l'éditeur après 20 s, la tâche planifiée après 2 min", async () => {
  const j = await newJob(5);
  // libéré à l'instant
  assert.equal(await claim(j.id, "watchdog"), null);
  assert.equal(await claim(j.id, "sweep"), null);
  const hop = await claim(j.id, "hop");
  assert.ok(hop, "relais immédiat");
  assert.equal(hop.resume_count, 0, "un relais normal n'est pas une reprise");
  // un second relais concurrent échoue (bail tenu)
  assert.equal(await claim(j.id, "hop"), null);

  const k = await newJob(5);
  await age(k.id, "25 seconds");
  assert.equal(await claim(k.id, "sweep"), null, "tâche planifiée : 25 s < 2 min");
  const w = await claim(k.id, "watchdog");
  assert.ok(w, "éditeur : 25 s > 20 s");
  assert.equal(w.resume_count, 1);
});

await test("job de l'ancien code qui avance encore (updated_at récent, heartbeat_at ancien) : jamais repris", async () => {
  const j = await newJob(7);
  await q(`UPDATE public.book_generation_jobs SET heartbeat_at = now() - interval '5 minutes', updated_at = now() - interval '10 seconds' WHERE id = $1`, [j.id]);
  assert.equal(await claim(j.id, "watchdog"), null);
  assert.equal(await claim(j.id, "sweep"), null);
  // Bloqué ensuite (plus aucune progression depuis 3 min) : repris.
  await q(`UPDATE public.book_generation_jobs SET updated_at = now() - interval '3 minutes' WHERE id = $1`, [j.id]);
  assert.ok(await claim(j.id, "sweep"));
});

await test("mode inconnu refusé", async () => {
  const j = await newJob(5);
  await assert.rejects(() => claim(j.id, "whatever"));
});

await test("jamais de reprise d'un job qui n'est plus running", async () => {
  const j = await newJob(5);
  await q(`UPDATE public.book_generation_jobs SET status = 'canceled' WHERE id = $1`, [j.id]);
  await age(j.id, "10 minutes");
  assert.equal(await claim(j.id, "sweep"), null);
});

await test("3 reprises sans progrès au même chapitre : la 4e clôt le job (failed/stalled)", async () => {
  const j = await newJob(5);
  for (let i = 1; i <= 3; i++) {
    await age(j.id, "3 minutes");
    const c = await claim(j.id, "sweep");
    assert.ok(c, `reprise ${i}`);
    assert.equal(c.stall_count, i);
  }
  await age(j.id, "3 minutes");
  assert.equal(await claim(j.id, "sweep"), null);
  const after = await job(j.id);
  assert.equal(after.status, "failed");
  assert.equal(after.last_error, "stalled");
  assert.equal(after.lock_token, null);
});

await test("une reprise après progrès repart de 1", async () => {
  const j = await newJob(5);
  await age(j.id, "3 minutes");
  let c = await claim(j.id, "sweep");
  assert.equal(c.stall_count, 1);
  const a = await claim(j.id, "sweep");
  assert.equal(a, null);
  // adoption + un chapitre écrit
  const adopted = (await q(`SELECT * FROM public.adopt_book_job($1, $2)`, [j.id, c.lock_token]))[0];
  const st = (await q(`SELECT public.advance_book_job($1, $2, 0, '[]'::jsonb) AS s`, [j.id, adopted.lock_token]))[0].s;
  assert.equal(st, "running");
  await age(j.id, "3 minutes");
  c = await claim(j.id, "sweep");
  assert.equal(c.stall_count, 1, "nouvel index : compteur remis à 1");
  assert.equal(c.stall_index, 1);
});

await test("adoption : seulement un bail posé par la tâche planifiée, une seule fois", async () => {
  const j = await newJob(5);
  const hop = await claim(j.id, "hop");
  assert.equal((await q(`SELECT * FROM public.adopt_book_job($1, $2)`, [j.id, hop.lock_token])).length, 0,
    "un bail de worker (non pending) ne s'adopte pas");

  const k = await newJob(5);
  await age(k.id, "3 minutes");
  const s = await claim(k.id, "sweep");
  assert.equal(s.lock_pending, true);
  const first = await q(`SELECT * FROM public.adopt_book_job($1, $2)`, [k.id, s.lock_token]);
  assert.equal(first.length, 1);
  assert.notEqual(first[0].lock_token, s.lock_token, "jeton renouvelé");
  assert.equal(first[0].lock_pending, false);
  const replay = await q(`SELECT * FROM public.adopt_book_job($1, $2)`, [k.id, s.lock_token]);
  assert.equal(replay.length, 0, "rejeu sans effet");
});

await test("heartbeat : statut si propriétaire (même annulé), NULL sinon", async () => {
  const j = await newJob(5);
  const c = await claim(j.id, "hop");
  const hb = async (t) => (await q(`SELECT public.heartbeat_book_job($1, $2) AS s`, [j.id, t]))[0].s;
  assert.equal(await hb(c.lock_token), "running");
  assert.equal(await hb("bbbbbbbb-0000-4000-8000-00000000dead"), null);
  await q(`UPDATE public.book_generation_jobs SET status = 'canceled' WHERE id = $1`, [j.id]);
  assert.equal(await hb(c.lock_token), "canceled");
});

await test("advance : progression, complétion, index et bail vérifiés, annulation respectée", async () => {
  const j = await newJob(2);
  const c = await claim(j.id, "hop");
  const adv = async (token, idx) =>
    (await q(`SELECT public.advance_book_job($1, $2, $3, $4::jsonb) AS s`, [j.id, token, idx, JSON.stringify([{ n: idx }])]))[0].s;
  assert.equal(await adv("bbbbbbbb-0000-4000-8000-00000000dead", 0), null, "mauvais bail");
  assert.equal(await adv(c.lock_token, 1), null, "mauvais index (double avance impossible)");
  assert.equal(await adv(c.lock_token, 0), "running");
  let row = await job(j.id);
  assert.equal(row.current_index, 1);
  assert.equal(row.lock_token, c.lock_token, "le worker garde son bail");
  assert.deepEqual(row.chapter_summaries, [{ n: 0 }]);
  assert.equal(await adv(c.lock_token, 1), "completed");
  row = await job(j.id);
  assert.equal(row.status, "completed");
  assert.equal(row.lock_token, null);

  // annulation pendant le chapitre : l'avance ne rétablit pas 'running'
  const k = await newJob(3);
  const d = await claim(k.id, "hop");
  await q(`UPDATE public.book_generation_jobs SET status = 'canceled' WHERE id = $1`, [k.id]);
  const s = (await q(`SELECT public.advance_book_job($1, $2, 0, NULL) AS s`, [k.id, d.lock_token]))[0].s;
  assert.equal(s, "canceled");
  row = await job(k.id);
  assert.equal(row.status, "canceled");
  assert.equal(row.current_index, 1, "le chapitre en cours est bien compté");
  assert.equal(row.lock_token, null);
});

await test("stop : échec/complétion si running, annulation conservée, statut invalide ignoré", async () => {
  const j = await newJob(3);
  const c = await claim(j.id, "hop");
  const stop = async (id, t, st, err) => (await q(`SELECT public.stop_book_job($1, $2, $3, $4) AS s`, [id, t, st, err]))[0].s;
  assert.equal(await stop(j.id, c.lock_token, "running", "x"), null, "statut invalide");
  assert.equal(await stop(j.id, c.lock_token, "failed", "insufficient_funds"), "failed");
  let row = await job(j.id);
  assert.equal(row.last_error, "insufficient_funds");
  assert.equal(row.attempt_count, 1);
  assert.equal(row.lock_token, null);

  const k = await newJob(3);
  const d = await claim(k.id, "hop");
  await q(`UPDATE public.book_generation_jobs SET status = 'canceled' WHERE id = $1`, [k.id]);
  assert.equal(await stop(k.id, d.lock_token, "failed", "boom"), "canceled");
  row = await job(k.id);
  assert.equal(row.last_error, null);
});

await test("release : libère seulement son propre bail", async () => {
  const j = await newJob(3);
  const c = await claim(j.id, "hop");
  const rel = async (t) => (await q(`SELECT public.release_book_job($1, $2) AS r`, [j.id, t]))[0].r;
  assert.equal(await rel("bbbbbbbb-0000-4000-8000-00000000dead"), null);
  assert.equal(await rel(c.lock_token), true);
  const row = await job(j.id);
  assert.equal(row.lock_token, null);
  assert.ok(await claim(j.id, "hop"), "relais possible juste après");
});

await test("tâche planifiée : relance les jobs inactifs > 2 min avec leur jeton, clôt ceux > 30 min", async () => {
  await q(`UPDATE public.book_generation_jobs SET status = 'completed' WHERE status = 'running'`);
  await q(`DELETE FROM net.calls`);
  const idle = await newJob(5);
  await age(idle.id, "3 minutes");
  const fresh = await newJob(5);
  const held = await newJob(5, { lock_token: "bbbbbbbb-0000-4000-8000-000000000009" });
  await age(held.id, "60 seconds");
  const abandoned = await newJob(5);
  await age(abandoned.id, "45 minutes");

  const sent = (await q(`SELECT public.book_jobs_watchdog_tick() AS n`))[0].n;
  assert.equal(sent, 1);
  const calls = await q(`SELECT * FROM net.calls`);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://www.irisboom.online/api/generate-book/process");
  assert.equal(calls[0].body.jobId, idle.id);
  const idleRow = await job(idle.id);
  assert.equal(calls[0].body.lockToken, idleRow.lock_token);
  assert.equal(idleRow.lock_pending, true);
  assert.equal((await job(fresh.id)).lock_token, null, "job frais : pas touché");
  assert.equal((await job(held.id)).lock_token, "bbbbbbbb-0000-4000-8000-000000000009", "worker vivant : pas touché");
  assert.equal((await job(abandoned.id)).status, "failed");

  // Minute suivante : le bail posé n'a pas encore 2 min → rien.
  assert.equal((await q(`SELECT public.book_jobs_watchdog_tick() AS n`))[0].n, 0);
});

await test("tâche planifiée sans URL configurée : clôture seulement, aucun appel", async () => {
  await q(`DELETE FROM vault.secrets`);
  await q(`DELETE FROM net.calls`);
  const idle = await newJob(5);
  await age(idle.id, "3 minutes");
  assert.equal((await q(`SELECT public.book_jobs_watchdog_tick() AS n`))[0].n, 0);
  assert.equal((await q(`SELECT count(*)::int AS n FROM net.calls`))[0].n, 0);
});

console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests SQL passent.");
process.exit(failures ? 1 : 0);
