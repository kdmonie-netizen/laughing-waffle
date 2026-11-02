import { COMPANY } from "../data/company";
import { isIntentId, type IntentId } from "../data/catalog";

export type County = "" | "Escambia" | "Santa Rosa" | "Other";
export type Pace = "" | "deadline" | "soon" | "planning";
export type TitleCommitment = "" | "yes" | "in-process" | "no";
export type Plans = "" | "cad" | "pdf" | "no";
export type ConstructionKind = "" | "stake" | "asbuilt" | "both";
export type StepId = "intent" | "property" | "details" | "contact" | "review";

export type QuoteDraft = {
  intent: IntentId | "";
  address: string;
  city: string;
  county: County;
  otherPlace: string;
  parcelId: string;
  fencePurpose: string;
  elevationPurpose: string;
  titleCommitment: TitleCommitment;
  topoPurpose: string;
  constructionKind: ConstructionKind;
  plans: Plans;
  developmentKind: string;
  roadKind: string;
  waterwayKind: string;
  scanMethods: string[];
  scanOutputs: string[];
  unsureNote: string;
  sizeNote: string;
  addons: string[];
  pace: Pace;
  needBy: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  role: string;
  notes: string;
  companyWebsite: string;
};

export const STEPS: { id: StepId; label: string }[] = [
  { id: "intent", label: "Reason" },
  { id: "property", label: "Property" },
  { id: "details", label: "Details" },
  { id: "contact", label: "Contact" },
  { id: "review", label: "Review" },
];

export const STORAGE_KEY = "kjm-quote-draft-v1";
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES = 6;
const MAILTO_LIMIT = 1800;

type Option = { id: string; label: string };

export const FENCE_PURPOSES: Option[] = [
  { id: "new-fence", label: "Planning a fence" },
  { id: "corners", label: "Find or mark the corners" },
  { id: "encroachment", label: "Something may cross the line" },
  { id: "other", label: "Something else" },
];

export const ELEVATION_PURPOSES: Option[] = [
  { id: "insurance", label: "Flood insurance" },
  { id: "lender", label: "Lender or closing" },
  { id: "permit", label: "Building permit" },
  { id: "unsure", label: "Not sure" },
];

export const TITLE_OPTIONS: Option[] = [
  { id: "yes", label: "Yes, I can send the title commitment" },
  { id: "in-process", label: "It is in process" },
  { id: "no", label: "Not yet" },
];

export const TOPO_PURPOSES: Option[] = [
  { id: "house", label: "New house, pool, or addition" },
  { id: "drainage", label: "Drainage or grading" },
  { id: "engineering", label: "Engineering design" },
  { id: "other", label: "Something else" },
];

export const CONSTRUCTION_KINDS: Option[] = [
  { id: "stake", label: "Stake the work" },
  { id: "asbuilt", label: "As-built of work in place" },
  { id: "both", label: "Both staking and an as-built" },
];

export const PLAN_OPTIONS: Option[] = [
  { id: "cad", label: "Yes, I have CAD" },
  { id: "pdf", label: "Yes, PDF only" },
  { id: "no", label: "Not yet" },
];

export const DEVELOPMENT_KINDS: Option[] = [
  { id: "subdivision", label: "Subdivision or lot split" },
  { id: "commercial", label: "Commercial site" },
  { id: "phased", label: "Phased development" },
  { id: "unsure", label: "Not sure" },
];

export const ROAD_KINDS: Option[] = [
  { id: "existing", label: "Existing conditions" },
  { id: "row", label: "Right-of-way" },
  { id: "staking", label: "Construction staking" },
  { id: "unsure", label: "Not sure" },
];

export const WATERWAY_KINDS: Option[] = [
  { id: "shore", label: "Shoreline or bulkhead" },
  { id: "canal", label: "Canal or bayou" },
  { id: "drainage", label: "Ditch, creek, or drainage" },
  { id: "depths", label: "I need water depths too" },
];

export const SCAN_METHODS: Option[] = [
  { id: "terrestrial", label: "Terrestrial scanner, on the ground" },
  { id: "drone-lidar", label: "Drone LiDAR" },
  { id: "drone-photo", label: "Drone photos" },
  { id: "recommend", label: "Not sure — recommend a method" },
];

export const SCAN_OUTPUTS: Option[] = [
  { id: "drawing", label: "Signed drawing (PDF)" },
  { id: "cad", label: "CAD file (DWG)" },
  { id: "cloud", label: "Point cloud (LAS or E57)" },
  { id: "surface", label: "Contours and a surface" },
];

export const PACE_OPTIONS: Option[] = [
  { id: "deadline", label: "I have a closing or a hard date" },
  { id: "soon", label: "As soon as the crew can schedule" },
  { id: "planning", label: "Planning ahead, no date yet" },
];

export const ROLES: Option[] = [
  { id: "owner", label: "Property owner" },
  { id: "buyer", label: "Buyer or seller" },
  { id: "realtor", label: "Realtor" },
  { id: "title", label: "Title company or attorney" },
  { id: "lender", label: "Lender" },
  { id: "builder", label: "Builder or contractor" },
  { id: "engineer", label: "Engineer or architect" },
  { id: "developer", label: "Developer" },
  { id: "other", label: "Someone else" },
];

export const COUNTIES: Option[] = [
  { id: "Escambia", label: "Escambia County" },
  { id: "Santa Rosa", label: "Santa Rosa County" },
  { id: "Other", label: "Somewhere else" },
];

const ADDON_EC = { id: "ec", label: "Also price an elevation certificate" };
const ADDON_IMPROVEMENTS = { id: "improvements", label: "Show the house and other improvements" };
const ADDON_CAD = { id: "cad", label: "Include a CAD file" };
const ADDON_CORNERS = { id: "corners", label: "Mark or flag the property corners" };

export function addonOptions(intent: IntentId | ""): Option[] {
  if (intent === "elevation") return [ADDON_CAD];
  if (intent === "mortgage") return [ADDON_EC, ADDON_CAD, ADDON_CORNERS];
  if (intent === "scan" || intent === "unsure" || intent === "") return [ADDON_EC, ADDON_CAD];
  return [ADDON_EC, ADDON_IMPROVEMENTS, ADDON_CAD, ADDON_CORNERS];
}

export type DetailBlock =
  | "fence"
  | "elevation"
  | "title"
  | "topo"
  | "construction"
  | "development"
  | "road"
  | "waterway"
  | "scan"
  | "unsure"
  | "size"
  | "pace"
  | "addons";

export function detailBlocks(intent: IntentId | ""): DetailBlock[] {
  const tail: DetailBlock[] = ["pace", "addons"];
  switch (intent) {
    case "mortgage":
      return tail;
    case "fence":
      return ["fence", ...tail];
    case "elevation":
      return ["elevation", ...tail];
    case "alta":
      return ["title", ...tail];
    case "topo":
      return ["topo", "size", ...tail];
    case "construction":
      return ["construction", ...tail];
    case "development":
      return ["development", "size", ...tail];
    case "road":
      return ["road", "size", ...tail];
    case "waterway":
      return ["waterway", "size", ...tail];
    case "scan":
      return ["scan", "size", ...tail];
    case "unsure":
      return ["unsure", "pace"];
    default:
      return ["pace"];
  }
}

export function emptyDraft(): QuoteDraft {
  return {
    intent: "",
    address: "",
    city: "",
    county: "",
    otherPlace: "",
    parcelId: "",
    fencePurpose: "",
    elevationPurpose: "",
    titleCommitment: "",
    topoPurpose: "",
    constructionKind: "",
    plans: "",
    developmentKind: "",
    roadKind: "",
    waterwayKind: "",
    scanMethods: [],
    scanOutputs: [],
    unsureNote: "",
    sizeNote: "",
    addons: [],
    pace: "",
    needBy: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    company: "",
    role: "",
    notes: "",
    companyWebsite: "",
  };
}

export type Recommendation = {
  product: string;
  slug: string;
  because: string;
};

export function recommend(draft: QuoteDraft): Recommendation | null {
  switch (draft.intent) {
    case "":
      return null;
    case "unsure":
      return {
        product: "Recommend the survey",
        slug: "",
        because:
          "You described the situation in plain language. The office will name the survey before sending a price.",
      };
    case "mortgage":
      return {
        product: "Boundary with Improvements",
        slug: "improvements",
        because:
          "Home closings here usually need the boundary and the improvements on one signed survey.",
      };
    case "fence":
      return {
        product: "Boundary Survey",
        slug: "boundary",
        because: "A fence or a line question starts with the boundary.",
      };
    case "elevation":
      return {
        product: "Elevation Certificate",
        slug: "elevation",
        because:
          "Insurers and some lenders want the FEMA elevation certificate, which is separate from a boundary drawing.",
      };
    case "alta":
      return {
        product: "ALTA Survey",
        slug: "alta",
        because:
          "Commercial title work is scoped to the title commitment and the current ALTA/NSPS standards.",
      };
    case "topo":
      return {
        product: "Topographic Survey",
        slug: "topographic",
        because: "Design and drainage need elevations, contours, and the features that affect grading.",
      };
    case "construction":
      if (draft.constructionKind === "asbuilt") {
        return {
          product: "As-Built Survey",
          slug: "as-built",
          because: "An as-built records what is already in place.",
        };
      }
      if (draft.constructionKind === "both") {
        return {
          product: "Construction Staking and As-Built Survey",
          slug: "construction",
          because: "Staking puts the plan on the ground. The as-built records what was built.",
        };
      }
      return {
        product: "Construction Staking",
        slug: "construction",
        because: "Staking places the design from your plans.",
      };
    case "development":
      return {
        product: "Development Survey",
        slug: "development",
        because: "A larger site usually needs boundary and topographic work, then layout when the design is ready.",
      };
    case "road":
      return {
        product: "Road and Right-of-Way Survey",
        slug: "roads",
        because: "Road work needs the corridor: existing ground, right-of-way, and control for the plans.",
      };
    case "waterway":
      return {
        product: "Waterway Survey",
        slug: "waterways",
        because:
          "Shorelines, bulkheads, canals, and drainage are located in the field. Depths are included only if you asked for them.",
      };
    case "scan": {
      const methods = new Set(knownIds(draft.scanMethods, SCAN_METHODS));
      const ground = methods.has("terrestrial");
      const air = methods.has("drone-lidar") || methods.has("drone-photo");
      if (ground && air) {
        return {
          product: "Terrestrial Scanning and Drone LiDAR",
          slug: "terrestrial",
          because: "A ground scanner and a drone flight cover different parts of the same site. Both are tied to survey control.",
        };
      }
      if (air && !ground) {
        return {
          product: "Drone LiDAR / Aerial Mapping",
          slug: "drone",
          because:
            "A drone fits a site that is large, linear, or slow to walk. Ground control is set when the map has to hold survey accuracy.",
        };
      }
      if (!ground && !air) {
        return {
          product: "Scanning — method to confirm",
          slug: "terrestrial",
          because:
            "You want a scan or a flight. The office will match terrestrial scanning, drone LiDAR, or both to the site.",
        };
      }
      return {
        product: "Terrestrial Scanning",
        slug: "terrestrial",
        because:
          "A ground-based scanner captures buildings, plants, and tight sites in a point cloud, tied to survey control.",
      };
    }
    default:
      return null;
  }
}

function knownIds(values: string[], options: Option[]) {
  const allowed = new Set(options.map((option) => option.id));
  return values.filter((value) => allowed.has(value));
}

function labelOf(options: Option[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function activeAddons(draft: QuoteDraft) {
  return knownIds(draft.addons, addonOptions(draft.intent));
}

function filled(value: string, min = 1) {
  return value.trim().length >= min;
}

function phoneOk(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function choice(id: string, options: Option[]) {
  return options.some((option) => option.id === id);
}

export function issuesFor(draft: QuoteDraft, step: StepId): string[] {
  if (step === "review") {
    return STEPS.flatMap((item) => (item.id === "review" ? [] : issuesFor(draft, item.id)));
  }
  if (step === "intent") {
    return draft.intent ? [] : ["Choose what you need the survey for."];
  }
  if (step === "property") {
    const issues: string[] = [];
    if (!filled(draft.address, 5)) issues.push("Enter the street address of the property.");
    if (!filled(draft.city, 2)) issues.push("Enter the city.");
    if (!choice(draft.county, COUNTIES)) issues.push("Choose the county.");
    if (draft.county === "Other" && !filled(draft.otherPlace, 2)) {
      issues.push("Tell us the county or area.");
    }
    return issues;
  }
  if (step === "contact") {
    const issues: string[] = [];
    if (!filled(draft.firstName)) issues.push("Enter your first name.");
    if (!filled(draft.lastName)) issues.push("Enter your last name.");
    if (!phoneOk(draft.phone)) issues.push("Enter a phone number we can reach.");
    if (!emailOk(draft.email)) issues.push("Enter an email address.");
    if (!choice(draft.role, ROLES)) issues.push("Tell us who you are.");
    return issues;
  }
  if (!draft.intent) return ["Choose what you need the survey for."];
  const blocks = new Set(detailBlocks(draft.intent));
  const issues: string[] = [];
  if (blocks.has("fence") && !choice(draft.fencePurpose, FENCE_PURPOSES)) {
    issues.push("Choose what you need along the line.");
  }
  if (blocks.has("elevation") && !choice(draft.elevationPurpose, ELEVATION_PURPOSES)) {
    issues.push("Choose who the elevation certificate is for.");
  }
  if (blocks.has("title") && !choice(draft.titleCommitment, TITLE_OPTIONS)) {
    issues.push("Tell us whether a title commitment is available.");
  }
  if (blocks.has("topo") && !choice(draft.topoPurpose, TOPO_PURPOSES)) {
    issues.push("Choose what the topographic survey is for.");
  }
  if (blocks.has("construction")) {
    if (!choice(draft.constructionKind, CONSTRUCTION_KINDS)) issues.push("Choose staking, an as-built, or both.");
    if (!choice(draft.plans, PLAN_OPTIONS)) issues.push("Tell us whether plans are available.");
  }
  if (blocks.has("development") && !choice(draft.developmentKind, DEVELOPMENT_KINDS)) {
    issues.push("Choose the kind of development.");
  }
  if (blocks.has("road") && !choice(draft.roadKind, ROAD_KINDS)) {
    issues.push("Choose what the road survey needs to cover.");
  }
  if (blocks.has("waterway") && !choice(draft.waterwayKind, WATERWAY_KINDS)) {
    issues.push("Choose the water or drainage we should look at.");
  }
  if (blocks.has("scan") && knownIds(draft.scanMethods, SCAN_METHODS).length === 0) {
    issues.push("Choose at least one way to capture the site.");
  }
  if (blocks.has("unsure") && !filled(draft.unsureNote, 12)) {
    issues.push("Add a sentence about what you are trying to figure out.");
  }
  if (blocks.has("pace") && !choice(draft.pace, PACE_OPTIONS)) {
    issues.push("Tell us how soon you need it.");
  }
  if (draft.pace === "deadline" && !filled(draft.needBy)) {
    issues.push("Enter the closing or deadline date.");
  }
  return issues;
}

export function nextStep(step: StepId): StepId {
  const index = STEPS.findIndex((item) => item.id === step);
  return STEPS[Math.min(STEPS.length - 1, index + 1)].id;
}

export function prevStep(step: StepId): StepId {
  const index = STEPS.findIndex((item) => item.id === step);
  return STEPS[Math.max(0, index - 1)].id;
}

export function canOpen(draft: QuoteDraft, target: StepId) {
  const index = STEPS.findIndex((item) => item.id === target);
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (issuesFor(draft, STEPS[cursor].id).length > 0) return false;
  }
  return true;
}

export function fileIssues(files: { size: number }[]) {
  const issues: string[] = [];
  if (files.length > MAX_FILES) issues.push("Attach up to 6 files. Further documents can go in the email.");
  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    issues.push("Each file needs to be 15 MB or smaller.");
  }
  return issues;
}

function pushDetail(lines: string[], label: string, value: string) {
  const clean = oneLine(value);
  if (clean) lines.push(`${label}: ${clean}`);
}

export function buildQuoteText(draft: QuoteDraft, fileNames: string[]) {
  const recommendation = recommend(draft);
  const blocks = new Set(detailBlocks(draft.intent));
  const lines = [
    "KJM Land Surveying — quote request",
    `Survey: ${recommendation?.product ?? "—"}`,
  ];
  if (recommendation?.because) lines.push(recommendation.because);
  lines.push("", "Property");
  pushDetail(lines, "Address", draft.address);
  pushDetail(lines, "City", draft.city);
  lines.push(
    `County: ${draft.county === "Other" ? oneLine(draft.otherPlace) || "Other" : draft.county || "—"}`,
  );
  pushDetail(lines, "Parcel ID", draft.parcelId);
  lines.push("", "Details");
  if (blocks.has("fence")) pushDetail(lines, "Line question", labelOf(FENCE_PURPOSES, draft.fencePurpose));
  if (blocks.has("elevation")) {
    pushDetail(lines, "Certificate for", labelOf(ELEVATION_PURPOSES, draft.elevationPurpose));
  }
  if (blocks.has("title")) pushDetail(lines, "Title commitment", labelOf(TITLE_OPTIONS, draft.titleCommitment));
  if (blocks.has("topo")) pushDetail(lines, "Topo for", labelOf(TOPO_PURPOSES, draft.topoPurpose));
  if (blocks.has("construction")) {
    pushDetail(lines, "Construction", labelOf(CONSTRUCTION_KINDS, draft.constructionKind));
    pushDetail(lines, "Plans", labelOf(PLAN_OPTIONS, draft.plans));
  }
  if (blocks.has("development")) {
    pushDetail(lines, "Development", labelOf(DEVELOPMENT_KINDS, draft.developmentKind));
  }
  if (blocks.has("road")) pushDetail(lines, "Road work", labelOf(ROAD_KINDS, draft.roadKind));
  if (blocks.has("waterway")) pushDetail(lines, "Water", labelOf(WATERWAY_KINDS, draft.waterwayKind));
  if (blocks.has("scan")) {
    const methods = knownIds(draft.scanMethods, SCAN_METHODS).map((id) => labelOf(SCAN_METHODS, id));
    const outputs = knownIds(draft.scanOutputs, SCAN_OUTPUTS).map((id) => labelOf(SCAN_OUTPUTS, id));
    if (methods.length) lines.push(`Capture: ${methods.join("; ")}`);
    if (outputs.length) lines.push(`Deliver: ${outputs.join("; ")}`);
  }
  if (blocks.has("unsure")) pushDetail(lines, "Situation", draft.unsureNote);
  if (blocks.has("size")) pushDetail(lines, "Size", draft.sizeNote);
  if (draft.pace) pushDetail(lines, "Timing", labelOf(PACE_OPTIONS, draft.pace));
  if (draft.needBy) pushDetail(lines, "Need by", draft.needBy);
  const addons = activeAddons(draft).map((id) => labelOf(addonOptions(draft.intent), id));
  if (addons.length) lines.push(`Also include: ${addons.join("; ")}`);
  lines.push("", "Contact");
  lines.push(`Name: ${oneLine(draft.firstName)} ${oneLine(draft.lastName)}`.trim());
  pushDetail(lines, "Phone", draft.phone);
  pushDetail(lines, "Email", draft.email);
  pushDetail(lines, "Company", draft.company);
  if (draft.role) pushDetail(lines, "Role", labelOf(ROLES, draft.role));
  if (draft.notes.trim()) {
    lines.push("", "Notes", draft.notes.trim().slice(0, 1500));
  }
  if (fileNames.length) {
    lines.push("", "Files to attach");
    fileNames.slice(0, MAX_FILES).forEach((name) => lines.push(`- ${name.replace(/\s+/g, " ").trim()}`));
  }
  lines.push("", "Sent from the KJM quote form. Nothing is scheduled until the office confirms scope and price.");
  return lines.join("\n");
}

export function quoteSubject(draft: QuoteDraft) {
  const recommendation = recommend(draft);
  const place = [oneLine(draft.address), oneLine(draft.city)].filter(Boolean).join(", ");
  return `Quote request — ${recommendation?.product ?? "Survey"} — ${place || "Pensacola area"}`;
}

export function mailtoFor(subject: string, body: string) {
  return `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isLongMailto(href: string) {
  return href.length > MAILTO_LIMIT;
}

export type Delivery = {
  mode: "sent" | "prepared";
  text: string;
  mailto: string;
  warning: string;
};

function payloadOf(draft: QuoteDraft) {
  const rest: Record<string, unknown> = { ...draft };
  delete rest.companyWebsite;
  rest.addons = activeAddons(draft);
  rest.product = recommend(draft)?.product ?? "";
  return rest;
}

export async function deliverQuote(draft: QuoteDraft, files: File[]): Promise<Delivery> {
  const names = files.map((file) => file.name);
  const text = buildQuoteText(draft, names);
  const subject = quoteSubject(draft);
  const mailto = mailtoFor(subject, text);
  if (draft.companyWebsite.trim()) {
    return { mode: "sent", text, mailto: "", warning: "" };
  }
  const endpoint = import.meta.env.VITE_QUOTE_ENDPOINT;
  if (!endpoint) {
    return {
      mode: "prepared",
      text,
      mailto,
      warning: isLongMailto(mailto)
        ? "This request is long for some email apps. If the draft looks cut off, paste the copy below."
        : "",
    };
  }
  try {
    const body = new FormData();
    body.append("payload", JSON.stringify(payloadOf(draft)));
    body.append("text", text);
    files.forEach((file) => body.append("files", file, file.name));
    const response = await fetch(endpoint, { method: "POST", body });
    if (!response.ok) throw new Error(String(response.status));
    return { mode: "sent", text, mailto, warning: "" };
  } catch {
    return {
      mode: "prepared",
      text,
      mailto,
      warning: "The form service did not accept the request. Email it instead.",
    };
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function loadDraft(): QuoteDraft {
  if (typeof sessionStorage === "undefined") return emptyDraft();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<QuoteDraft>;
    const intent = asString(parsed.intent);
    const base = emptyDraft();
    return {
      ...base,
      ...parsed,
      intent: isIntentId(intent) ? intent : "",
      address: asString(parsed.address),
      city: asString(parsed.city),
      county: parsed.county === "Escambia" || parsed.county === "Santa Rosa" || parsed.county === "Other" ? parsed.county : "",
      otherPlace: asString(parsed.otherPlace),
      parcelId: asString(parsed.parcelId),
      fencePurpose: asString(parsed.fencePurpose),
      elevationPurpose: asString(parsed.elevationPurpose),
      titleCommitment:
        parsed.titleCommitment === "yes" || parsed.titleCommitment === "in-process" || parsed.titleCommitment === "no"
          ? parsed.titleCommitment
          : "",
      topoPurpose: asString(parsed.topoPurpose),
      constructionKind:
        parsed.constructionKind === "stake" || parsed.constructionKind === "asbuilt" || parsed.constructionKind === "both"
          ? parsed.constructionKind
          : "",
      plans: parsed.plans === "cad" || parsed.plans === "pdf" || parsed.plans === "no" ? parsed.plans : "",
      developmentKind: asString(parsed.developmentKind),
      roadKind: asString(parsed.roadKind),
      waterwayKind: asString(parsed.waterwayKind),
      scanMethods: asList(parsed.scanMethods),
      scanOutputs: asList(parsed.scanOutputs),
      unsureNote: asString(parsed.unsureNote),
      sizeNote: asString(parsed.sizeNote),
      addons: asList(parsed.addons),
      pace: parsed.pace === "deadline" || parsed.pace === "soon" || parsed.pace === "planning" ? parsed.pace : "",
      needBy: asString(parsed.needBy),
      firstName: asString(parsed.firstName),
      lastName: asString(parsed.lastName),
      phone: asString(parsed.phone),
      email: asString(parsed.email),
      company: asString(parsed.company),
      role: asString(parsed.role),
      notes: asString(parsed.notes),
      companyWebsite: "",
    };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(draft: QuoteDraft) {
  if (typeof sessionStorage === "undefined") return;
  const rest: Record<string, unknown> = { ...draft };
  delete rest.companyWebsite;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

export function clearDraft() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
