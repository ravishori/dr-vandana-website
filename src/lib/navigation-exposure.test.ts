import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFooterNavItems,
  getPrimaryNavItems,
  navigationConfig,
} from "@/config/navigation";

describe("portal navigation exposure", () => {
  it("exposes patient and psychologist login entry points without private dashboards", () => {
    const primary = getPrimaryNavItems();
    const footer = getFooterNavItems();

    assert.ok(primary.some((item) => item.href === "/patient/login"));
    assert.ok(
      primary.some((item) => item.href === "/psychologist/practice/login"),
    );
    assert.ok(footer.some((item) => item.href === "/patient/login"));
    assert.ok(footer.some((item) => item.href === "/patient/register"));
    assert.ok(
      footer.some((item) => item.href === "/psychologist/practice/login"),
    );
    assert.ok(footer.some((item) => item.href === "/book-appointment"));

    const allHrefs = [
      ...navigationConfig.primary,
      ...navigationConfig.footer,
      ...navigationConfig.legal,
    ].map((item) => item.href);

    assert.equal(allHrefs.includes("/psychologist/practice/patients"), false);
    assert.equal(allHrefs.includes("/psychologist/practice/settings"), false);
    assert.equal(allHrefs.includes("/patient/account"), false);
    assert.equal(allHrefs.includes("/patient/appointments"), false);
    assert.equal(allHrefs.includes("/super-admin/signed-in"), false);
  });
});
