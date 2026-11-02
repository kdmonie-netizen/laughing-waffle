import { afterEach, describe, expect, it, vi } from "vitest";
import { officeStatus } from "./office";
import {
  STORAGE_KEY,
  buildQuoteText,
  canOpen,
  deliverQuote,
  emptyDraft,
  fileIssues,
  isLongMailto,
  issuesFor,
  loadDraft,
  mailtoFor,
  recommend,
  type QuoteDraft,
} from "./quote";

function draft(over: Partial<QuoteDraft> = {}): QuoteDraft {
  return {
    ...emptyDraft(),
    intent: "mortgage",
    address: "123 Bayou Drive",
    city: "Gulf Breeze",
    county: "Santa Rosa",
    pace: "deadline",
    needBy: "2026-11-20",
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "(850) 555-0100",
    email: "ada@example.com",
    role: "owner",
    ...over,
  };
}

describe("office hours in Central time", () => {
  it("is open Monday morning and closed before 8", () => {
    expect(officeStatus(new Date("2026-11-02T15:00:00Z")).label).toBe("Open now · until 5:00 pm CT");
    expect(officeStatus(new Date("2026-11-02T13:00:00Z")).label).toBe("Closed · Opens today 8:00 am CT");
    expect(officeStatus(new Date("2026-11-02T14:00:00Z")).open).toBe(true);
  });

  it("closes Friday at 3 and stays closed through the weekend", () => {
    expect(officeStatus(new Date("2026-11-06T19:00:00Z")).label).toBe("Open now · until 3:00 pm CT");
    expect(officeStatus(new Date("2026-11-06T21:00:00Z")).label).toBe("Closed · Opens Monday 8:00 am CT");
    expect(officeStatus(new Date("2026-11-07T16:00:00Z")).label).toBe("Closed · Opens Monday 8:00 am CT");
  });

  it("points Thursday evening at Friday morning", () => {
    expect(officeStatus(new Date("2026-11-05T23:00:00Z")).label).toBe("Closed · Opens Friday 8:00 am CT");
  });
});

describe("quote validation", () => {
  it("accepts a complete mortgage request", () => {
    expect(issuesFor(draft(), "review")).toEqual([]);
  });

  it("asks for a street address, a county, and a reachable phone", () => {
    const partial = draft({ address: "12", county: "", phone: "555" });
    expect(issuesFor(partial, "property")).toContain("Enter the street address of the property.");
    expect(issuesFor(partial, "property")).toContain("Choose the county.");
    expect(issuesFor(partial, "contact")).toContain("Enter a phone number we can reach.");
  });

  it("requires the other place when the county is not Escambia or Santa Rosa", () => {
    expect(issuesFor(draft({ county: "Other", otherPlace: "" }), "property")).toContain(
      "Tell us the county or area.",
    );
  });

  it("requires a title commitment answer for an ALTA", () => {
    expect(issuesFor(draft({ intent: "alta", titleCommitment: "" }), "details")).toContain(
      "Tell us whether a title commitment is available.",
    );
  });

  it("requires a capture method for scanning and a sentence when the client is unsure", () => {
    expect(issuesFor(draft({ intent: "scan", scanMethods: [] }), "details")).toContain(
      "Choose at least one way to capture the site.",
    );
    expect(issuesFor(draft({ intent: "unsure", unsureNote: "fence" }), "details")).toContain(
      "Add a sentence about what you are trying to figure out.",
    );
  });

  it("requires the deadline date only when the client has one", () => {
    expect(issuesFor(draft({ pace: "deadline", needBy: "" }), "details")).toContain(
      "Enter the closing or deadline date.",
    );
    expect(issuesFor(draft({ pace: "planning", needBy: "" }), "details")).toEqual([]);
  });

  it("blocks later steps until earlier ones are valid", () => {
    expect(canOpen(draft({ address: "" }), "contact")).toBe(false);
    expect(canOpen(draft(), "review")).toBe(true);
  });
});

describe("recommendation and email", () => {
  it("names a boundary with improvements for a home closing", () => {
    const request = draft({ parcelId: "05-2S-28-0000-001", addons: ["ec"] });
    expect(recommend(request)?.product).toBe("Boundary with Improvements");
    const text = buildQuoteText(request, ["deed.pdf"]);
    expect(text).toContain("Boundary with Improvements");
    expect(text).toContain("123 Bayou Drive");
    expect(text).toContain("Gulf Breeze");
    expect(text).toContain("Santa Rosa");
    expect(text).toContain("05-2S-28-0000-001");
    expect(text).toContain("elevation certificate");
    expect(text).toContain("deed.pdf");
    expect(text).not.toContain("Title commitment");
  });

  it("separates drone LiDAR from a ground scan", () => {
    expect(recommend(draft({ intent: "scan", scanMethods: ["drone-lidar"] }))?.product).toBe(
      "Drone LiDAR / Aerial Mapping",
    );
    expect(
      recommend(draft({ intent: "scan", scanMethods: ["terrestrial", "drone-photo"] }))?.product,
    ).toBe("Terrestrial Scanning and Drone LiDAR");
    expect(recommend(draft({ intent: "construction", constructionKind: "asbuilt" }))?.slug).toBe("as-built");
  });

  it("flags a mailto that is too long for some email apps", () => {
    const href = mailtoFor("Quote request", "x".repeat(2000));
    expect(isLongMailto(href)).toBe(true);
  });

  it("prepares an email when no form endpoint is configured", async () => {
    const result = await deliverQuote(draft(), []);
    expect(result.mode).toBe("prepared");
    expect(result.mailto.startsWith("mailto:quote@kjmsurvey.com?subject=")).toBe(true);
    expect(decodeURIComponent(result.mailto)).toContain("Boundary with Improvements");
  });

  it("does not send a honeypot submission", async () => {
    const result = await deliverQuote(draft({ companyWebsite: "https://spam.example" }), []);
    expect(result.mode).toBe("sent");
    expect(result.mailto).toBe("");
  });
});

describe("saved drafts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops a tampered intent and a non-list of scan methods", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ intent: "nope", scanMethods: "lidar", firstName: "Ada", county: "Mars" }),
    );
    const saved = loadDraft();
    expect(saved.intent).toBe("");
    expect(saved.scanMethods).toEqual([]);
    expect(saved.firstName).toBe("Ada");
    expect(saved.county).toBe("");
    expect(saved.companyWebsite).toBe("");
  });
});

describe("files", () => {
  it("rejects more than six files and files over 15 MB", () => {
    const big = { size: 16 * 1024 * 1024 };
    expect(fileIssues([big])).toContain("Each file needs to be 15 MB or smaller.");
    expect(fileIssues(Array.from({ length: 7 }, () => ({ size: 10 })))[0]).toMatch(/up to 6/);
  });
});
