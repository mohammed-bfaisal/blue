import { PGlite } from "@electric-sql/pglite";
import type { Guide, User, Notification, Method, Material, Vote, Dispute } from "../types";

// ─── SINGLETON ────────────────────────────────────────────────
// PGlite persists to IndexedDB — data survives page reloads.
// When you're ready to sync to Supabase, dump with db.dumpDataDir()

let _db: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (_db) return _db;
  _db = new PGlite("idb://blue-db"); // persists to IndexedDB
  await migrate(_db);
  return _db;
}

// ─── MIGRATIONS ───────────────────────────────────────────────
async function migrate(db: PGlite) {
  await db.exec(`
    -- Migrations table
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: ran } = await db.query<{ name: string }>(
    "SELECT name FROM _migrations"
  );
  const ranSet = new Set(ran.map((r) => r.name));

  for (const [name, sql] of MIGRATIONS) {
    if (ranSet.has(name)) continue;
    await db.exec(sql);
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
    console.log(`[blue-db] ran migration: ${name}`);
  }
}

const MIGRATIONS: [string, string][] = [
  [
    "001_initial_schema",
    `
    CREATE TABLE IF NOT EXISTS profiles (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      username    TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
      avatar_url  TEXT,
      role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','verifier','admin')),
      standing    INTEGER NOT NULL DEFAULT 100 CHECK (standing BETWEEN 0 AND 100),
      strikes     INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS niches (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name        TEXT UNIQUE NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      guide_count INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guides (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      title           TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 200),
      description     TEXT NOT NULL CHECK (length(description) BETWEEN 20 AND 500),
      niche           TEXT NOT NULL,
      level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
      status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending_review','in_review','approved','rejected','appealed','spinoff')),
      author_id       TEXT NOT NULL REFERENCES profiles(id),
      content         TEXT NOT NULL DEFAULT '',
      tags            TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
      upvotes         INTEGER NOT NULL DEFAULT 0,
      verifier_count  INTEGER NOT NULL DEFAULT 0,
      parent_id       TEXT REFERENCES guides(id),
      approved_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guide_prerequisites (
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      requires_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      PRIMARY KEY (guide_id, requires_id)
    );

    CREATE TABLE IF NOT EXISTS methods (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      steps       TEXT NOT NULL DEFAULT '[]',  -- JSON array
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS materials (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      guide_id      TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      optional      BOOLEAN NOT NULL DEFAULT FALSE,
      affiliate_url TEXT,
      rating        NUMERIC(3,2),
      sort_order    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guide_upvotes (
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guide_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS verification_sessions (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      outcome     TEXT CHECK (outcome IN ('approve','reject')),
      resolved_at TIMESTAMPTZ,
      deadline    TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS session_verifiers (
      session_id  TEXT NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
      verifier_id TEXT NOT NULL REFERENCES profiles(id),
      PRIMARY KEY (session_id, verifier_id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      session_id  TEXT NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
      verifier_id TEXT NOT NULL REFERENCES profiles(id),
      decision    TEXT NOT NULL CHECK (decision IN ('approve','reject')),
      reasoning   TEXT NOT NULL CHECK (length(reasoning) >= 100),
      niche_note  TEXT,
      level_note  INTEGER CHECK (level_note BETWEEN 1 AND 4),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (session_id, verifier_id)
    );

    CREATE TABLE IF NOT EXISTS appeals (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      author_id   TEXT NOT NULL REFERENCES profiles(id),
      reason      TEXT NOT NULL CHECK (length(reason) >= 50),
      status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      reviewed_by TEXT REFERENCES profiles(id),
      review_note TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      UNIQUE (guide_id, author_id)
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      guide_id    TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      opener_id   TEXT NOT NULL REFERENCES profiles(id),
      reason      TEXT NOT NULL CHECK (length(reason) >= 50),
      status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
      vote_result TEXT CHECK (vote_result IN ('spinoff','keep','move')),
      resolution  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      read        BOOLEAN NOT NULL DEFAULT FALSE,
      link        TEXT,
      meta        TEXT NOT NULL DEFAULT '{}',  -- JSON
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS verifier_qualifications (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      niche         TEXT NOT NULL,
      level         INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
      test_score    NUMERIC(5,2) NOT NULL,
      qualified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, niche, level)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS guides_niche_idx    ON guides(niche);
    CREATE INDEX IF NOT EXISTS guides_level_idx    ON guides(level);
    CREATE INDEX IF NOT EXISTS guides_status_idx   ON guides(status);
    CREATE INDEX IF NOT EXISTS guides_author_idx   ON guides(author_id);
    CREATE INDEX IF NOT EXISTS notif_user_idx      ON notifications(user_id, created_at DESC);
    `,
  ],

  [
    "002_seed_niches",
    `
    INSERT INTO niches (id, name, slug, description) VALUES
      ('niche-electronics',  'Electronics',  'electronics',  'Circuits, components, embedded systems'),
      ('niche-medicine',     'Medicine',     'medicine',     'Clinical practice, diagnostics, pharmacology'),
      ('niche-construction', 'Construction', 'construction', 'Structural work, materials, trades'),
      ('niche-mathematics',  'Mathematics',  'mathematics',  'Pure and applied mathematical systems'),
      ('niche-mechanics',    'Mechanics',    'mechanics',    'Engines, drivetrains, mechanical systems'),
      ('niche-chemistry',    'Chemistry',    'chemistry',    'Reactions, synthesis, lab technique'),
      ('niche-programming',  'Programming',  'programming',  'Software systems, algorithms, architecture'),
      ('niche-agriculture',  'Agriculture',  'agriculture',  'Farming, soil, irrigation, crops')
    ON CONFLICT DO NOTHING;
    `,
  ],

  [
    "003_seed_demo_data",
    `
    -- Demo user (password: demo1234 — handled in app layer, not stored as hash here)
    INSERT INTO profiles (id, email, username, role, standing, strikes) VALUES
      ('demo-user-1', 'demo@blue.dev', 'blue_demo', 'user', 100, 0),
      ('demo-verifier-1', 'verifier@blue.dev', 'verified_val', 'verifier', 95, 0)
    ON CONFLICT DO NOTHING;

    -- Sample guides
    INSERT INTO guides (id, title, description, niche, level, status, author_id, content, tags, upvotes, verifier_count, approved_at) VALUES
    (
      'guide-transistor',
      'Assembling a Transistor',
      'The foundational building block of all modern computing. Learn the physics and hands-on assembly of a single transistor.',
      'Electronics', 1, 'approved', 'demo-verifier-1',
      '# Assembling a Transistor

A transistor is a semiconductor device used to amplify or switch electronic signals. It is the fundamental building block of modern electronic devices.

## Theory

The NPN transistor has three terminals: Base (B), Collector (C), and Emitter (E). When a small current flows through the base, it allows a larger current to flow from collector to emitter.

## Safety Notes

- Handle components by their bodies, not leads
- Discharge any capacitors before working
- Use ESD protection when handling sensitive components',
      ''["electronics","hardware","fundamentals","semiconductor"]'',
      847, 12, NOW() - INTERVAL ''30 days''
    ),
    (
      'guide-logic-gates',
      'Chaining Transistors into Logic Gates',
      'Combine transistors to create AND, OR, NOT gates — the language of computation.',
      'Electronics', 2, 'approved', 'demo-verifier-1',
      '# Logic Gates from Transistors

Logic gates are the fundamental building blocks of digital circuits. By combining transistors, we can implement Boolean logic in hardware.

## AND Gate

Requires two transistors in series. Both must be conducting for output to be high.

## OR Gate

Requires two transistors in parallel. Either conducting produces high output.',
      ''["electronics","logic","gates","digital"]'',
      612, 9, NOW() - INTERVAL ''20 days''
    ),
    (
      'guide-vitals',
      'Reading a Patient''s Vitals',
      'Blood pressure, pulse, temperature — how to measure each vital sign and interpret the numbers.',
      'Medicine', 1, 'approved', 'demo-verifier-1',
      '# Taking Patient Vitals

Vital signs are measurements of the body''s most basic functions. The four main vital signs are body temperature, pulse rate, respiration rate, and blood pressure.

## Normal Ranges (Adults)

- Temperature: 36.1–37.2°C (97–99°F)
- Pulse: 60–100 bpm
- Respiration: 12–20 breaths/min
- Blood pressure: <120/80 mmHg',
      ''["medicine","diagnostics","fundamentals","vitals"]'',
      1203, 18, NOW() - INTERVAL ''25 days''
    ),
    (
      'guide-concrete',
      'Mixing Concrete by Hand',
      'Ratios, water content, and technique for small-batch concrete mixing without machinery.',
      'Construction', 1, 'approved', 'demo-user-1',
      '# Hand-Mixed Concrete

For small pours under 0.1m³, hand mixing is practical and effective. The standard mix ratio for general purpose concrete is 1:2:3 (cement:sand:aggregate) by volume.

## Water-Cement Ratio

The W/C ratio is critical. Too much water weakens the concrete; too little makes it unworkable. Target 0.45–0.55 for structural work.',
      ''["construction","materials","manual","concrete"]'',
      234, 6, NOW() - INTERVAL ''15 days''
    )
    ON CONFLICT DO NOTHING;

    -- Methods for transistor guide
    INSERT INTO methods (guide_id, title, description, steps, sort_order) VALUES
    (
      'guide-transistor', 'NPN Breadboard Method',
      'Using a breadboard for prototyping',
      ''["Identify base, collector, emitter pins using datasheet","Insert transistor into breadboard","Connect 10kΩ resistor to base","Apply 5V to collector through 470Ω resistor","Apply test voltage to base and observe output"]'',
      0
    ),
    (
      'guide-transistor', 'PCB Solder Method',
      'Permanent board installation',
      ''["Apply flux to pads","Seat component firmly","Solder each pin with 60/40 rosin-core solder","Inspect joints for cold solder","Clean flux residue with IPA"]'',
      1
    ),
    (
      'guide-vitals', 'Manual Auscultation',
      'Traditional BP cuff and stethoscope',
      ''["Position patient seated, arm at heart level","Apply cuff 2cm above antecubital fossa","Inflate to 180mmHg","Deflate slowly at 2-3mmHg/sec","Note first Korotkoff sound (systolic)","Note sound disappearance (diastolic)","Record as systolic/diastolic"]'',
      0
    ),
    (
      'guide-vitals', 'Digital Monitor Method',
      'Automated sphygmomanometer',
      ''["Position patient and apply cuff correctly","Press start button","Remain still during measurement","Wait for reading","Compare against manual baseline if first use"]'',
      1
    ),
    (
      'guide-concrete', 'Dry Mix First Method',
      'Combine dry ingredients before adding water',
      ''["Measure cement, sand, aggregate in 1:2:3 ratio by volume","Combine dry ingredients on mixing board","Form a well in the center","Add 80% of water incrementally","Mix inward from edges","Add remaining water as needed","Mix until uniform grey color with no dry pockets"]'',
      0
    )
    ON CONFLICT DO NOTHING;

    -- Prerequisites
    INSERT INTO guide_prerequisites (guide_id, requires_id) VALUES
      ('guide-logic-gates', 'guide-transistor')
    ON CONFLICT DO NOTHING;

    -- Materials
    INSERT INTO materials (guide_id, name, description, optional, rating, sort_order) VALUES
    ('guide-transistor', '2N3904 NPN Transistor', 'Standard general-purpose NPN transistor, TO-92 package', false, 4.8, 0),
    ('guide-transistor', 'Breadboard (400 tie-point)', 'Solderless breadboard for prototyping', false, 4.7, 1),
    ('guide-transistor', 'Multimeter', 'For verifying connections and measuring voltages', false, 4.6, 2),
    ('guide-vitals', 'Sphygmomanometer', 'Manual BP cuff with aneroid gauge', false, 4.7, 0),
    ('guide-vitals', 'Stethoscope', 'For auscultation method. Not required for digital monitors.', true, 4.5, 1),
    ('guide-concrete', 'Portland Cement Type I', 'Standard general-purpose cement', false, 4.5, 0),
    ('guide-concrete', 'Sharp Sand', 'Washed sharp sand, not building or soft sand', false, 4.4, 1),
    ('guide-concrete', '20mm Aggregate', 'Crushed stone or gravel', false, 4.3, 2)
    ON CONFLICT DO NOTHING;
    `,
  ],
];

// ─── QUERY HELPERS ────────────────────────────────────────────

function parseJsonField<T>(val: string | T): T {
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val as unknown as T; }
  }
  return val;
}

function guideFromRow(row: any): Guide {
  return {
    ...row,
    tags: parseJsonField<string[]>(row.tags),
    level: Number(row.level) as any,
    upvotes: Number(row.upvotes),
    verifier_count: Number(row.verifier_count),
  };
}

// ─── AUTH (local, no hashing — swap for bcrypt when adding server) ─────────

const SESSION_KEY = "blue_local_session";

export function getLocalSession(): { userId: string; email: string } | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setLocalSession(userId: string, email: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, email }));
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function dbRegister(email: string, username: string, _password: string): Promise<User> {
  const db = await getDb();
  const id = crypto.randomUUID();
  // NOTE: In production add password hashing. For local dev this is fine.
  await db.query(
    `INSERT INTO profiles (id, email, username) VALUES ($1, $2, $3)`,
    [id, email.toLowerCase(), username]
  );
  setLocalSession(id, email);
  const { rows } = await db.query<User>(`SELECT * FROM profiles WHERE id = $1`, [id]);
  return rows[0];
}

export async function dbLogin(email: string, _password: string): Promise<User> {
  const db = await getDb();
  const { rows } = await db.query<User>(
    `SELECT * FROM profiles WHERE email = $1`,
    [email.toLowerCase()]
  );
  if (!rows[0]) throw new Error("No account found with that email");
  setLocalSession(rows[0].id, rows[0].email);
  return rows[0];
}

export async function dbGetProfile(userId: string): Promise<User | null> {
  const db = await getDb();
  const { rows } = await db.query<User>(`SELECT * FROM profiles WHERE id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function dbUpdateProfile(userId: string, data: Partial<Pick<User, "username" | "avatar_url">>) {
  const db = await getDb();
  const fields = Object.entries(data).map(([k], i) => `${k} = $${i + 2}`).join(", ");
  await db.query(
    `UPDATE profiles SET ${fields}, updated_at = NOW() WHERE id = $1`,
    [userId, ...Object.values(data)]
  );
}

// ─── GUIDES ───────────────────────────────────────────────────

export async function dbGetGuides(params: {
  niche?: string; level?: number; search?: string;
  status?: string; limit?: number; offset?: number;
} = {}): Promise<Guide[]> {
  const db = await getDb();
  const { niche, level, search, status = "approved", limit = 50, offset = 0 } = params;

  let where = `WHERE g.status = $1`;
  const args: any[] = [status];
  let i = 2;

  if (niche && niche !== "All") { where += ` AND g.niche = $${i++}`; args.push(niche); }
  if (level) { where += ` AND g.level = $${i++}`; args.push(level); }
  if (search) {
    where += ` AND (g.title ILIKE $${i} OR g.description ILIKE $${i} OR g.tags ILIKE $${i})`;
    args.push(`%${search}%`); i++;
  }

  const { rows } = await db.query<any>(
    `SELECT g.*, p.username as author_username, p.role as author_role
     FROM guides g
     LEFT JOIN profiles p ON p.id = g.author_id
     ${where}
     ORDER BY g.approved_at DESC NULLS LAST
     LIMIT $${i} OFFSET $${i + 1}`,
    [...args, limit, offset]
  );

  return rows.map(guideFromRow);
}

export async function dbGetGuide(id: string): Promise<Guide | null> {
  const db = await getDb();

  const { rows: [guide] } = await db.query<any>(
    `SELECT g.*, p.username as author_username
     FROM guides g LEFT JOIN profiles p ON p.id = g.author_id
     WHERE g.id = $1`,
    [id]
  );
  if (!guide) return null;

  const { rows: methods } = await db.query<Method>(
    `SELECT * FROM methods WHERE guide_id = $1 ORDER BY sort_order`, [id]
  );
  const { rows: materials } = await db.query<Material>(
    `SELECT * FROM materials WHERE guide_id = $1 ORDER BY sort_order`, [id]
  );
  const { rows: prereqs } = await db.query<{ requires_id: string }>(
    `SELECT requires_id FROM guide_prerequisites WHERE guide_id = $1`, [id]
  );

  return {
    ...guideFromRow(guide),
    methods: methods.map(m => ({ ...m, steps: parseJsonField<string[]>(m.steps as any) })),
    materials,
    requires: prereqs.map(p => p.requires_id),
  };
}

export async function dbCreateGuide(data: {
  title: string; description: string; niche: string;
  level: number; content: string; tags: string[]; author_id: string;
}): Promise<Guide> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO guides (id, title, description, niche, level, content, tags, author_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, data.title, data.description, data.niche, data.level,
     data.content, JSON.stringify(data.tags), data.author_id]
  );
  return (await dbGetGuide(id))!;
}

export async function dbSubmitGuide(guideId: string) {
  const db = await getDb();
  await db.query(
    `UPDATE guides SET status = 'pending_review', updated_at = NOW() WHERE id = $1`,
    [guideId]
  );
  // Auto-assign to first available verifier (production: random selection)
  await dbCreateVerificationSession(guideId);
}

export async function dbSaveMethods(guideId: string, methods: Array<{ title: string; description: string; steps: string[]; sort_order: number }>) {
  const db = await getDb();
  await db.query(`DELETE FROM methods WHERE guide_id = $1`, [guideId]);
  for (const m of methods) {
    await db.query(
      `INSERT INTO methods (id, guide_id, title, description, steps, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), guideId, m.title, m.description, JSON.stringify(m.steps), m.sort_order]
    );
  }
}

export async function dbSaveMaterials(guideId: string, materials: Array<{ name: string; description: string; optional: boolean; rating?: number; sort_order: number }>) {
  const db = await getDb();
  await db.query(`DELETE FROM materials WHERE guide_id = $1`, [guideId]);
  for (const m of materials) {
    await db.query(
      `INSERT INTO materials (id, guide_id, name, description, optional, rating, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [crypto.randomUUID(), guideId, m.name, m.description, m.optional, m.rating ?? null, m.sort_order]
    );
  }
}

export async function dbSavePrerequisites(guideId: string, requiresIds: string[]) {
  const db = await getDb();
  await db.query(`DELETE FROM guide_prerequisites WHERE guide_id = $1`, [guideId]);
  for (const rid of requiresIds) {
    await db.query(
      `INSERT INTO guide_prerequisites (guide_id, requires_id) VALUES ($1, $2)`,
      [guideId, rid]
    );
  }
}

// ─── UPVOTES ──────────────────────────────────────────────────

export async function dbToggleUpvote(guideId: string, userId: string, currentlyVoted: boolean) {
  const db = await getDb();
  if (currentlyVoted) {
    await db.query(`DELETE FROM guide_upvotes WHERE guide_id = $1 AND user_id = $2`, [guideId, userId]);
    await db.query(`UPDATE guides SET upvotes = upvotes - 1 WHERE id = $1`, [guideId]);
  } else {
    await db.query(
      `INSERT INTO guide_upvotes (guide_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [guideId, userId]
    );
    await db.query(`UPDATE guides SET upvotes = upvotes + 1 WHERE id = $1`, [guideId]);
  }
}

export async function dbGetUserUpvotes(userId: string): Promise<string[]> {
  const db = await getDb();
  const { rows } = await db.query<{ guide_id: string }>(
    `SELECT guide_id FROM guide_upvotes WHERE user_id = $1`, [userId]
  );
  return rows.map(r => r.guide_id);
}

// ─── VERIFICATION ─────────────────────────────────────────────

async function dbCreateVerificationSession(guideId: string) {
  const db = await getDb();
  const sessionId = crypto.randomUUID();
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.query(
    `INSERT INTO verification_sessions (id, guide_id, deadline) VALUES ($1, $2, $3)`,
    [sessionId, guideId, deadline]
  );
  // Assign demo verifier in local mode
  const { rows: verifiers } = await db.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role IN ('verifier','admin') LIMIT 3`
  );
  for (const v of verifiers) {
    await db.query(
      `INSERT INTO session_verifiers (session_id, verifier_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [sessionId, v.id]
    );
  }
  return sessionId;
}

export async function dbGetVerifierQueue(userId: string) {
  const db = await getDb();
  const { rows } = await db.query<any>(
    `SELECT vs.*, g.title, g.description, g.niche, g.level, g.content
     FROM verification_sessions vs
     JOIN session_verifiers sv ON sv.session_id = vs.id AND sv.verifier_id = $1
     JOIN guides g ON g.id = vs.guide_id
     WHERE vs.resolved_at IS NULL
     ORDER BY vs.deadline ASC`,
    [userId]
  );
  return rows;
}

export async function dbCastVote(data: {
  session_id: string; verifier_id: string;
  decision: "approve" | "reject"; reasoning: string;
  niche_note?: string; level_note?: number;
}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO votes (id, session_id, verifier_id, decision, reasoning, niche_note, level_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, data.session_id, data.verifier_id, data.decision,
     data.reasoning, data.niche_note ?? null, data.level_note ?? null]
  );

  // Check if all verifiers have voted and resolve
  await dbResolveSessionIfComplete(data.session_id);
  return id;
}

async function dbResolveSessionIfComplete(sessionId: string) {
  const db = await getDb();
  const { rows: [session] } = await db.query<any>(
    `SELECT vs.*, COUNT(sv.verifier_id) as total_verifiers
     FROM verification_sessions vs
     JOIN session_verifiers sv ON sv.session_id = vs.id
     WHERE vs.id = $1 GROUP BY vs.id`,
    [sessionId]
  );
  const { rows: votes } = await db.query<Vote>(
    `SELECT * FROM votes WHERE session_id = $1`, [sessionId]
  );

  if (votes.length < Number(session.total_verifiers)) return; // not all voted

  const approvals = votes.filter(v => v.decision === "approve").length;
  const outcome = approvals > votes.length / 2 ? "approve" : "reject";
  const newStatus = outcome === "approve" ? "approved" : "rejected";

  await db.query(
    `UPDATE verification_sessions SET outcome = $1, resolved_at = NOW() WHERE id = $2`,
    [outcome, sessionId]
  );
  await db.query(
    `UPDATE guides SET status = $1, verifier_count = $2, ${outcome === "approve" ? "approved_at = NOW()," : ""} updated_at = NOW() WHERE id = $3`,
    [newStatus, votes.length, session.guide_id]
  );

  // Notify author
  const { rows: [guide] } = await db.query<any>(`SELECT * FROM guides WHERE id = $1`, [session.guide_id]);
  if (guide) {
    await dbCreateNotification({
      user_id: guide.author_id,
      type: outcome === "approve" ? "guide_approved" : "guide_rejected",
      title: outcome === "approve" ? "Guide Approved ✓" : "Guide Rejected",
      body: outcome === "approve"
        ? `"${guide.title}" has been approved by the verification panel.`
        : `"${guide.title}" was rejected. Check the verifier feedback for details.`,
      link: `/guides/${guide.id}`,
    });
  }
}

// ─── DISPUTES ─────────────────────────────────────────────────

export async function dbOpenDispute(data: { guide_id: string; opener_id: string; reason: string }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO disputes (id, guide_id, opener_id, reason) VALUES ($1, $2, $3, $4)`,
    [id, data.guide_id, data.opener_id, data.reason]
  );
  return id;
}

export async function dbGetGuideDisputes(guideId: string): Promise<Dispute[]> {
  const db = await getDb();
  const { rows } = await db.query<Dispute>(
    `SELECT d.*, p.username as opener_username
     FROM disputes d JOIN profiles p ON p.id = d.opener_id
     WHERE d.guide_id = $1 ORDER BY d.created_at DESC`,
    [guideId]
  );
  return rows;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────

export async function dbCreateNotification(data: {
  user_id: string; type: string; title: string; body: string; link?: string;
}) {
  const db = await getDb();
  await db.query(
    `INSERT INTO notifications (id, user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [crypto.randomUUID(), data.user_id, data.type, data.title, data.body, data.link ?? null]
  );
}

export async function dbGetNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const db = await getDb();
  const { rows } = await db.query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function dbMarkNotificationRead(id: string) {
  const db = await getDb();
  await db.query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
}

export async function dbMarkAllNotificationsRead(userId: string) {
  const db = await getDb();
  await db.query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [userId]);
}

// ─── EXPORT / SYNC HELPER ─────────────────────────────────────
// When ready to sync to Supabase, call this to get all data as JSON

export async function dbExportAll(): Promise<Record<string, any[]>> {
  const db = await getDb();
  const tables = [
    "profiles", "niches", "guides", "methods", "materials",
    "guide_prerequisites", "guide_upvotes", "verification_sessions",
    "session_verifiers", "votes", "appeals", "disputes", "notifications",
    "verifier_qualifications",
  ];
  const result: Record<string, any[]> = {};
  for (const table of tables) {
    const { rows } = await db.query(`SELECT * FROM ${table}`);
    result[table] = rows;
  }
  return result;
}

export async function dbStats(): Promise<{ guides: number; users: number; niches: number }> {
  const db = await getDb();
  const { rows: [r] } = await db.query<any>(
    `SELECT
      (SELECT COUNT(*) FROM guides WHERE status = 'approved') as guides,
      (SELECT COUNT(*) FROM profiles) as users,
      (SELECT COUNT(*) FROM niches) as niches`
  );
  return { guides: Number(r.guides), users: Number(r.users), niches: Number(r.niches) };
}
