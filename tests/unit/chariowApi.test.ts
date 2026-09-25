import { describe, it, expect } from "vitest";
import {
  isPaidSaleStatus,
  normalizeChariowLicense,
  normalizeChariowSale,
  normalizeLicenseKey,
} from "@/lib/payments/chariowApi";

describe("normalizeLicenseKey", () => {
  it("met en majuscules et retire les espaces", () => {
    expect(normalizeLicenseKey("  ivo5-48t4-9fx1-v27v-qx2a\n")).toBe("IVO5-48T4-9FX1-V27V-QX2A");
  });

  it("rejette les valeurs vides ou non textuelles", () => {
    expect(normalizeLicenseKey("   ")).toBeNull();
    expect(normalizeLicenseKey(undefined)).toBeNull();
    expect(normalizeLicenseKey(42)).toBeNull();
  });
});

describe("normalizeChariowLicense", () => {
  it("lit la forme du guide Chariow (license.key, customer.email, product.id)", () => {
    const lic = normalizeChariowLicense({
      id: "license_qy1al1",
      status: "active",
      customer: { email: "WFomo42@Gmail.com" },
      product: { id: "prd_mryxlaqo", name: "Iris Starter" },
      license: { key: "IVO5-48T4-9FX1-V27V-QX2A" },
      is_expired: false,
      can_activate: true,
      revoked_at: null,
    });
    expect(lic).toMatchObject({
      id: "license_qy1al1",
      key: "IVO5-48T4-9FX1-V27V-QX2A",
      productId: "prd_mryxlaqo",
      customerEmail: "wfomo42@gmail.com",
      canActivate: true,
      isExpired: false,
      isRevoked: false,
    });
  });

  it("lit la forme de la référence API (license_key)", () => {
    expect(normalizeChariowLicense({ id: "lic_1", license_key: "ABC-123", status: "revoked" })).toMatchObject({
      key: "ABC-123",
      isRevoked: true,
    });
  });

  it("lit la forme des notifications Pulse (clé directement sur l'objet licence)", () => {
    expect(normalizeChariowLicense({ id: "license_mj82x7", key: "vj39-fsxd", status: "active" })).toMatchObject({
      key: "VJ39-FSXD",
      rawKey: "vj39-fsxd",
    });
  });

  it("renvoie null sans clé", () => {
    expect(normalizeChariowLicense({ id: "lic_1" })).toBeNull();
    expect(normalizeChariowLicense(null)).toBeNull();
  });
});

describe("ventes Chariow", () => {
  it("normalise une vente et reconnaît les statuts payés", () => {
    const sale = normalizeChariowSale({
      id: "SALE7BDPDXQ3I2V44J1",
      status: "completed",
      amount: { value: 1000, currency: "XAF" },
      product: { id: "prd_mryxlaqo" },
      customer: { email: "Client@Example.com" },
    });
    expect(sale).toEqual({
      id: "SALE7BDPDXQ3I2V44J1",
      status: "completed",
      productId: "prd_mryxlaqo",
      customerEmail: "client@example.com",
      amount: 1000,
      currency: "XAF",
    });
    expect(isPaidSaleStatus("completed")).toBe(true);
    expect(isPaidSaleStatus("settled")).toBe(true);
    expect(isPaidSaleStatus("awaiting_payment")).toBe(false);
    expect(isPaidSaleStatus("failed")).toBe(false);
  });
});
