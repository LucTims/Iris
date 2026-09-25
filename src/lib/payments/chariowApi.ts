/**
 * Accès à l'API publique Chariow (licences, ventes) — côté serveur uniquement.
 *
 * La clé d'API est lue EXCLUSIVEMENT dans l'environnement (CHARIOW_API_KEY).
 * Elle figurait auparavant en clair dans le code d'un dépôt public : l'ancienne
 * valeur doit être considérée comme compromise et régénérée côté Chariow.
 *
 * Les normaliseurs acceptent les deux formes d'objet licence que Chariow
 * documente (guide : `license.key`, `customer.email` ; référence API :
 * `license_key`) ainsi que la forme des notifications Pulse (`license.key`
 * directement sur l'objet licence), pour ne dépendre d'aucune d'elles.
 */

const CHARIOW_API_BASE = "https://api.chariow.com/v1";
const CHARIOW_TIMEOUT_MS = 8000;

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getChariowApiKey(): string | null {
  const key = process.env.CHARIOW_API_KEY?.trim();
  return key ? key : null;
}

/**
 * Forme canonique d'une clé de licence. Les clés Chariow sont en majuscules
 * (« VJ39-FSXD-EVZG-7ZS8-9HLI ») : une saisie manuelle en minuscules ou avec
 * des espaces doit désigner la MÊME licence, sinon elle échapperait à la
 * déduplication et serait créditée une seconde fois.
 */
export function normalizeLicenseKey(key: unknown): string | null {
  if (typeof key !== "string") return null;
  const k = key.trim().toUpperCase();
  return k.length > 0 ? k : null;
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length > 0 ? e : null;
}

function idOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export interface ChariowLicense {
  id: string | null;
  /** Clé normalisée : sert de clé d'idempotence du crédit. */
  key: string;
  /** Clé telle que fournie par Chariow, pour les appels d'API. */
  rawKey: string;
  productId: string | null;
  productName: string | null;
  customerEmail: string | null;
  canActivate: boolean;
  isExpired: boolean;
  isRevoked: boolean;
}

export function normalizeChariowLicense(raw: unknown): ChariowLicense | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const rawKey = [r.license?.key, r.license_key, r.key].find(
    (k): k is string => typeof k === "string" && k.trim().length > 0
  );
  const key = normalizeLicenseKey(rawKey);
  if (!rawKey || !key) return null;

  const status = typeof r.status === "string" ? r.status.toLowerCase() : "";

  return {
    id: idOrNull(r.id),
    key,
    rawKey: rawKey.trim(),
    productId: idOrNull(r.product?.id) ?? idOrNull(r.product_id),
    productName: typeof r.product?.name === "string" ? r.product.name : null,
    customerEmail: normalizeEmail(r.customer?.email),
    canActivate: r.can_activate === true,
    isExpired: r.is_expired === true || status === "expired",
    isRevoked: status === "revoked" || !!r.revoked_at,
  };
}

export interface ChariowSale {
  id: string;
  status: string;
  productId: string | null;
  customerEmail: string | null;
  amount: number | null;
  currency: string | null;
}

/** Une vente n'est payée que dans ces états (voir référence API « Get Sale »). */
export function isPaidSaleStatus(status: string | null | undefined): boolean {
  return status === "completed" || status === "settled";
}

export function normalizeChariowSale(raw: unknown): ChariowSale | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const id = idOrNull(r.id);
  if (!id) return null;
  const amount = Number(r.amount?.value);
  return {
    id,
    status: typeof r.status === "string" ? r.status.toLowerCase() : "",
    productId: idOrNull(r.product?.id),
    customerEmail: normalizeEmail(r.customer?.email),
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof r.amount?.currency === "string" ? r.amount.currency : null,
  };
}

async function chariowGet(path: string, apiKey: string): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${CHARIOW_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(CHARIOW_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export type ChariowLookup<T> =
  | { status: "found"; value: T }
  | { status: "not_found" }
  | { status: "error"; message: string };

export async function fetchChariowLicense(key: string, apiKey: string): Promise<ChariowLookup<ChariowLicense>> {
  try {
    const res = await chariowGet(`/licenses/${encodeURIComponent(key.trim())}`, apiKey);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error", message: res.json?.message || `HTTP ${res.status}` };
    const license = normalizeChariowLicense(res.json?.data ?? res.json);
    return license ? { status: "found", value: license } : { status: "error", message: "Réponse Chariow illisible." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchChariowSale(saleId: string, apiKey: string): Promise<ChariowLookup<ChariowSale>> {
  try {
    const res = await chariowGet(`/sales/${encodeURIComponent(saleId.trim())}`, apiKey);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error", message: res.json?.message || `HTTP ${res.status}` };
    const sale = normalizeChariowSale(res.json?.data ?? res.json);
    return sale ? { status: "found", value: sale } : { status: "error", message: "Réponse Chariow illisible." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

/** Les licences les plus récentes de la boutique (liste paginée, première page). */
export async function listRecentChariowLicenses(apiKey: string): Promise<ChariowLicense[]> {
  const res = await chariowGet(`/licenses?per_page=100`, apiKey);
  if (!res.ok) throw new Error(res.json?.message || `HTTP ${res.status}`);
  const items: unknown[] = Array.isArray(res.json?.data)
    ? res.json.data
    : Array.isArray(res.json?.data?.data)
      ? res.json.data.data
      : [];
  return items.map(normalizeChariowLicense).filter((l): l is ChariowLicense => l !== null);
}

/**
 * Active la licence côté Chariow (marque l'achat comme consommé). Au mieux :
 * un produit configuré « sans activation » répond 400, ce qui est attendu.
 * Attendu (et non lancé en tâche de fond) : une fonction serverless peut être
 * figée dès l'envoi de la réponse, avant qu'un fetch orphelin ne parte.
 */
export async function activateChariowLicense(key: string, apiKey: string, deviceIdentifier: string): Promise<void> {
  try {
    await fetch(`${CHARIOW_API_BASE}/licenses/${encodeURIComponent(key.trim())}/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ device_identifier: deviceIdentifier }),
      signal: AbortSignal.timeout(CHARIOW_TIMEOUT_MS),
    });
  } catch (err) {
    console.warn("[Chariow] Activation de licence non aboutie (non bloquant):", err);
  }
}
