/**
 * Faux client Supabase en mémoire, juste assez fidèle pour les chemins de
 * paiement et d'écriture MCP : insert/select/update/delete/upsert avec filtres
 * eq/neq, single/maybeSingle, contraintes d'unicité (erreur 23505 comme
 * Postgres) et les RPC de portefeuille (`credit_wallet_coins`,
 * `process_ai_cost`). Chaque requête s'exécute au moment où elle est attendue,
 * après un tour de boucle : des appels lancés en parallèle s'entrelacent donc
 * comme des requêtes HTTP concurrentes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;

interface TableSpec {
  /** Colonnes (ou groupes de colonnes) uniques. */
  unique?: string[][];
}

export interface FakeSupabaseOptions {
  tables?: Record<string, TableSpec>;
  /** Fait échouer les N prochains appels au RPC de crédit. */
  failCreditCalls?: number;
  /** Fait échouer les N prochaines écritures (insert/update/upsert) d'une table. */
  failWrites?: Record<string, number>;
}

let idSeq = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++idSeq).padStart(12, "0")}`;

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const db: Record<string, Row[]> = {};
  const specs = options.tables || {};
  let failCreditCalls = options.failCreditCalls || 0;
  const failWrites = { ...(options.failWrites || {}) };
  const table = (name: string) => (db[name] ||= []);

  const violatesUnique = (name: string, row: Row, ignore?: Row) => {
    for (const cols of specs[name]?.unique || []) {
      const clash = table(name).some(
        (r) => r !== ignore && cols.every((c) => r[c] !== undefined && r[c] === row[c])
      );
      if (clash) return true;
    }
    return false;
  };

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  class Query {
    private filters: Array<(r: Row) => boolean> = [];
    private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    private payload: any = null;
    private upsertOn: string[] = [];
    private wantRows = false;
    private mode: "many" | "single" | "maybeSingle" = "many";
    private limitN: number | null = null;
    private orderBy: { col: string; asc: boolean } | null = null;

    constructor(private name: string) {}

    select() {
      if (this.op !== "select") this.wantRows = true;
      return this;
    }
    insert(payload: any) {
      this.op = "insert";
      this.payload = payload;
      return this;
    }
    upsert(payload: any, opts?: { onConflict?: string }) {
      this.op = "upsert";
      this.payload = payload;
      this.upsertOn = (opts?.onConflict || "id").split(",").map((s) => s.trim());
      return this;
    }
    update(payload: any) {
      this.op = "update";
      this.payload = payload;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(col: string, val: any) {
      this.filters.push((r) => r[col] === val);
      return this;
    }
    neq(col: string, val: any) {
      this.filters.push((r) => r[col] !== val);
      return this;
    }
    in(col: string, vals: any[]) {
      this.filters.push((r) => vals.includes(r[col]));
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orderBy = { col, asc: opts?.ascending !== false };
      return this;
    }
    limit(n: number) {
      this.limitN = n;
      return this;
    }
    single() {
      this.mode = "single";
      return this;
    }
    maybeSingle() {
      this.mode = "maybeSingle";
      return this;
    }

    private matches() {
      return table(this.name).filter((r) => this.filters.every((f) => f(r)));
    }

    private shape(rows: Row[]) {
      let out = rows.map((r) => ({ ...r }));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.limitN !== null) out = out.slice(0, this.limitN);
      if (this.mode === "single") {
        if (out.length !== 1) return { data: null, error: { code: "PGRST116", message: "not exactly one row" } };
        return { data: out[0], error: null };
      }
      if (this.mode === "maybeSingle") {
        if (out.length > 1) return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
        return { data: out[0] ?? null, error: null };
      }
      return { data: out, error: null };
    }

    private execute(): { data: any; error: any } {
      if (this.op === "select") return this.shape(this.matches());

      if (this.op !== "delete" && (failWrites[this.name] || 0) > 0) {
        failWrites[this.name]--;
        return { data: null, error: { code: "XX000", message: `simulated write failure on ${this.name}` } };
      }

      if (this.op === "insert") {
        const rows: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({
          id: nextId(),
          created_at: new Date().toISOString(),
          ...r,
        }));
        for (const r of rows) {
          if (violatesUnique(this.name, r)) {
            return { data: null, error: { code: "23505", message: `duplicate key value violates unique constraint on ${this.name}` } };
          }
        }
        table(this.name).push(...rows);
        return this.wantRows ? this.shape(rows) : { data: null, error: null };
      }

      if (this.op === "upsert") {
        const incoming: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
        const written: Row[] = [];
        for (const r of incoming) {
          const existing = table(this.name).find((e) => this.upsertOn.every((c) => e[c] === r[c]));
          if (existing) {
            Object.assign(existing, r);
            written.push(existing);
          } else {
            const row = { id: nextId(), created_at: new Date().toISOString(), ...r };
            table(this.name).push(row);
            written.push(row);
          }
        }
        return this.wantRows ? this.shape(written) : { data: null, error: null };
      }

      if (this.op === "update") {
        const rows = this.matches();
        for (const r of rows) {
          const next = { ...r, ...this.payload };
          if (violatesUnique(this.name, next, r)) {
            return { data: null, error: { code: "23505", message: "duplicate key" } };
          }
        }
        rows.forEach((r) => Object.assign(r, this.payload));
        return this.wantRows ? this.shape(rows) : { data: null, error: null };
      }

      // delete
      const doomed = new Set(this.matches());
      db[this.name] = table(this.name).filter((r) => !doomed.has(r));
      return { data: null, error: null };
    }

    then<T1 = any, T2 = never>(
      onfulfilled?: ((value: { data: any; error: any }) => T1 | PromiseLike<T1>) | null,
      onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
    ): Promise<T1 | T2> {
      return tick().then(() => this.execute()).then(onfulfilled, onrejected);
    }
  }

  const walletOf = (userId: string) => table("wallets").find((w) => w.user_id === userId);

  const storage: Record<string, { body: any; contentType?: string }> = {};

  const client = {
    from: (name: string) => new Query(name),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: any, opts?: { contentType?: string }) => {
          await tick();
          storage[`${bucket}/${path}`] = { body, contentType: opts?.contentType };
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${bucket}/${path}` },
        }),
      }),
    },
    rpc: async (fn: string, args: Record<string, any>) => {
      await tick();
      if (fn === "credit_wallet_coins") {
        if (failCreditCalls > 0) {
          failCreditCalls--;
          return { data: null, error: { message: "simulated credit failure" } };
        }
        let wallet = walletOf(args.p_user_id);
        if (!wallet) {
          wallet = { id: nextId(), user_id: args.p_user_id, balance: 0 };
          table("wallets").push(wallet);
        }
        wallet.balance += args.p_amount;
        table("coin_transactions").push({
          id: nextId(),
          wallet_id: wallet.id,
          type: "credit",
          amount: args.p_amount,
          description: args.p_description,
          metadata: args.p_metadata,
        });
        return { data: wallet.balance, error: null };
      }
      if (fn === "process_ai_cost") {
        const wallet = walletOf(args.p_user_id);
        if (!wallet) return { data: null, error: { message: "Wallet not found for user" } };
        if (!(args.p_amount > 0)) return { data: null, error: { message: "invalid arguments" } };
        if (wallet.balance < args.p_amount) return { data: null, error: { message: "Insufficient funds" } };
        wallet.balance -= args.p_amount;
        table("coin_transactions").push({
          id: nextId(),
          wallet_id: wallet.id,
          type: "debit",
          amount: args.p_amount,
          description: args.p_description,
          metadata: args.p_metadata,
        });
        return { data: true, error: null };
      }
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    },
  };

  return {
    client: client as any,
    db,
    table,
    storage,
    balanceOf: (userId: string) => walletOf(userId)?.balance ?? 0,
    credits: () => table("coin_transactions").filter((t) => t.type === "credit"),
    debits: () => table("coin_transactions").filter((t) => t.type === "debit"),
  };
}

/** Schéma d'unicité des tables réelles utilisées par les chemins testés. */
export const IRIS_TABLES: Record<string, TableSpec> = {
  redeemed_licenses: { unique: [["license_key"]] },
  webhook_deliveries: { unique: [["provider", "delivery_id"]] },
  wallets: { unique: [["user_id"]] },
  chapters: { unique: [["project_id", "number"]] },
};
