import { describe, it, expect } from "vitest";
import {
  buildLifecycleEmail,
  chaptersCoveredBy,
  chooseLifecycleEmail,
  type LifecycleCandidate,
} from "@/lib/email/lifecycle";

const NOW = new Date("2026-10-20T09:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const base = (over: Partial<LifecycleCandidate> = {}): LifecycleCandidate => ({
  user_id: "u1",
  email: "auteur@example.com",
  full_name: "Awa Diallo",
  created_at: daysAgo(2),
  has_project: false,
  has_written_chapter: false,
  last_activity: null,
  balance: 500,
  sent_kinds: [],
  ...over,
});

describe("chooseLifecycleEmail", () => {
  it("J+1 sans livre → start_d1, une seule fois", () => {
    expect(chooseLifecycleEmail(base(), NOW)).toBe("start_d1");
    expect(chooseLifecycleEmail(base({ sent_kinds: ["start_d1"] }), NOW)).toBeNull();
    expect(chooseLifecycleEmail(base({ created_at: daysAgo(0.5) }), NOW)).toBeNull();
  });

  it("J+3 avec un livre sans chapitre → first_chapter_d3", () => {
    expect(chooseLifecycleEmail(base({ has_project: true, created_at: daysAgo(2) }), NOW)).toBeNull();
    expect(chooseLifecycleEmail(base({ has_project: true, created_at: daysAgo(4) }), NOW)).toBe("first_chapter_d3");
  });

  it("J+7 avec chapitres et inactif depuis 3 jours → keep_going_d7", () => {
    const writer = base({ has_project: true, has_written_chapter: true, created_at: daysAgo(10) });
    expect(chooseLifecycleEmail({ ...writer, last_activity: daysAgo(1) }, NOW)).toBeNull();
    expect(chooseLifecycleEmail({ ...writer, last_activity: daysAgo(4) }, NOW)).toBe("keep_going_d7");
    expect(chooseLifecycleEmail({ ...writer, last_activity: daysAgo(4), sent_kinds: ["keep_going_d7"] }, NOW)).toBeNull();
  });
});

describe("contenu des e-mails", () => {
  const urls = { siteUrl: "https://www.irisboom.online", unsubscribeUrl: "https://www.irisboom.online/api/email/unsubscribe?u=u1&t=x" };

  it("500 pièces couvrent le plan et au moins 2 chapitres", () => {
    expect(chaptersCoveredBy(500, true)).toBeGreaterThanOrEqual(2);
  });

  it("chaque e-mail a un sujet, un lien d'action et un lien de désinscription", () => {
    for (const kind of ["start_d1", "first_chapter_d3", "keep_going_d7"] as const) {
      const mail = buildLifecycleEmail(kind, base(), urls);
      expect(mail.subject.length).toBeGreaterThan(10);
      expect(mail.html).toContain(urls.unsubscribeUrl);
      expect(mail.text).toContain(urls.unsubscribeUrl);
      expect(mail.html).toContain("Bonjour Awa");
    }
  });

  it("échappe le nom de l'utilisateur dans le HTML", () => {
    const mail = buildLifecycleEmail("start_d1", base({ full_name: "<script>x</script>" }), urls);
    expect(mail.html).not.toContain("<script>");
  });
});
