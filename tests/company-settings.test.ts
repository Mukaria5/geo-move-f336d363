import { describe, expect, test } from "bun:test";
import { COMPANY_DEFAULTS, COMPANY_INVITABLE_ROLES, defaultCompanySettings, isCompanyInviteRole } from "../src/lib/company-settings";

describe("company settings requirements", () => {
  test("uses the requested Kenya company defaults", () => {
    expect(COMPANY_DEFAULTS.country).toBe("Kenya");
    expect(COMPANY_DEFAULTS.currency).toBe("KES");
    expect(COMPANY_DEFAULTS.timezone).toBe("Africa/Nairobi");
  });

  test("allows only existing staff roles to be assigned by a company invite", () => {
    expect(COMPANY_INVITABLE_ROLES).toEqual(["manager", "dispatcher", "driver"]);
    expect(isCompanyInviteRole("fleet")).toBe(false);
    expect(isCompanyInviteRole("admin")).toBe(false);
    expect(isCompanyInviteRole("manager")).toBe(true);
  });

  test("does not invent a VAT rate or make finance defaults immutable", () => {
    const finance = defaultCompanySettings().finance_settings;
    expect(finance.vat_percentage).toBe(0);
    expect(finance.tax_enabled).toBe(false);
    expect(finance.payment_terms_days).toBe(30);
  });
});