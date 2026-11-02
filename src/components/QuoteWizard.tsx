import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COMPANY } from "../data/company";
import { isIntentId, intents, intentGroups } from "../data/catalog";
import {
  CONSTRUCTION_KINDS,
  COUNTIES,
  DEVELOPMENT_KINDS,
  ELEVATION_PURPOSES,
  FENCE_PURPOSES,
  PACE_OPTIONS,
  PLAN_OPTIONS,
  ROAD_KINDS,
  ROLES,
  SCAN_METHODS,
  SCAN_OUTPUTS,
  TITLE_OPTIONS,
  TOPO_PURPOSES,
  WATERWAY_KINDS,
  activeAddons,
  addonOptions,
  canOpen,
  clearDraft,
  deliverQuote,
  detailBlocks,
  emptyDraft,
  fileIssues,
  issuesFor,
  loadDraft,
  nextStep,
  prevStep,
  recommend,
  saveDraft,
  type Delivery,
  type QuoteDraft,
  type StepId,
  STEPS,
} from "../lib/quote";

type Option = { id: string; label: string };

function initialStep(): StepId {
  const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const intent = query.get("intent");
  if (intent && isIntentId(intent)) return "property";
  return "intent";
}

export function QuoteWizard() {
  const [params] = useSearchParams();
  const search = params.toString();
  const [draft, setDraft] = useState<QuoteDraft>(() => loadDraft());
  const [step, setStep] = useState<StepId>(initialStep);
  const [errors, setErrors] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const sends = Boolean(import.meta.env.VITE_QUOTE_ENDPOINT);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    const query = new URLSearchParams(search);
    const intent = query.get("intent");
    if (!intent || !isIntentId(intent)) return;
    const kind = query.get("kind");
    const method = query.get("method");
    setDraft((current) => ({
      ...current,
      intent,
      constructionKind:
        kind === "stake" || kind === "asbuilt" || kind === "both" ? kind : current.constructionKind,
      scanMethods:
        method === "drone" ? ["drone-lidar"] : method === "ground" ? ["terrestrial"] : current.scanMethods,
    }));
    setStep("property");
    setDelivery(null);
  }, [search]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, delivery]);

  function update<K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: "scanMethods" | "scanOutputs" | "addons", id: string) {
    setDraft((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
      };
    });
  }

  function go(target: StepId) {
    if (!canOpen(draft, target)) return;
    setErrors([]);
    setStep(target);
  }

  function goNext() {
    const found = issuesFor(draft, step);
    setErrors(found);
    if (found.length) {
      errorRef.current?.focus();
      return;
    }
    setStep(nextStep(step));
  }

  async function finish() {
    const found = [...issuesFor(draft, "review"), ...fileIssues(files)];
    setErrors(found);
    if (found.length) {
      errorRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await deliverQuote(draft, files);
      setDelivery(result);
      if (result.mode === "sent") clearDraft();
    } finally {
      setBusy(false);
    }
  }

  async function copyRequest() {
    if (!delivery) return;
    try {
      await navigator.clipboard.writeText(delivery.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function startOver() {
    clearDraft();
    setDraft(emptyDraft());
    setFiles([]);
    setErrors([]);
    setDelivery(null);
    setCopied(false);
    setStep("intent");
  }

  if (delivery) {
    return (
      <section className="wizard" aria-labelledby="quote-done">
        <p className="eyebrow">{delivery.mode === "sent" ? "Received" : "Ready to send"}</p>
        <h1 id="quote-done" ref={headingRef} tabIndex={-1}>
          {delivery.mode === "sent" ? "The office has your request." : "Send this to the office."}
        </h1>
        <p className="lede">
          {delivery.mode === "sent"
            ? "We reply during office hours with the survey you need and a written price. Nothing is scheduled until that scope is confirmed."
            : `Email it to ${COMPANY.email}. Attach a deed, prior survey, title commitment, or plans if you have them. The office replies during business hours, and nothing is scheduled until the scope and price are confirmed.`}
        </p>
        {delivery.warning ? <p className="warning">{delivery.warning}</p> : null}
        {delivery.mode === "prepared" && files.length ? (
          <p>Your email app will not attach the files on its own. Attach {files.map((file) => file.name).join(", ")} before you send.</p>
        ) : null}
        <div className="actions">
          {delivery.mailto ? (
            <a className="btn" href={delivery.mailto}>
              Email this request
            </a>
          ) : null}
          <button type="button" className="btn secondary" onClick={copyRequest}>
            {copied ? "Copied" : "Copy request"}
          </button>
          <a className="btn secondary" href={`tel:${COMPANY.phoneTel}`}>
            Call {COMPANY.phoneDisplay}
          </a>
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <p className="status" role="status">
          {copied ? "The request is on the clipboard." : ""}
        </p>
        <textarea className="request-text" readOnly value={delivery.text} aria-label="Quote request" />
        <button type="button" className="text-button" onClick={startOver}>
          Start another request
        </button>
      </section>
    );
  }

  const recommendation = recommend(draft);
  const blocks = new Set(detailBlocks(draft.intent));
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <form
      className="wizard"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "review") void finish();
        else goNext();
      }}
    >
      <p className="eyebrow">
        Step {stepIndex + 1} of {STEPS.length}
      </p>
      <ol className="stepper">
        {STEPS.map((item, index) => {
          const open = canOpen(draft, item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === step ? "step" : undefined}
                disabled={!open}
                onClick={() => go(item.id)}
              >
                <span>{index + 1}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>

      <h1 ref={headingRef} tabIndex={-1}>
        {step === "intent" && "What do you need the survey for?"}
        {step === "property" && "Where is the property?"}
        {step === "details" && "A few details that change the price."}
        {step === "contact" && "How should we reply?"}
        {step === "review" && "Read it once, then send it."}
      </h1>
      <p className="lede">
        {step === "intent" && "Pick the closest reason. If none fit, say so in ordinary words. About two minutes if you know the address."}
        {step === "property" && "The street address is enough to start. A parcel ID helps, and it can wait."}
        {step === "details" && "Answer what applies. Skip anything you don’t know yet."}
        {step === "contact" && "We use this to send the price. We don’t sell it."}
        {step === "review" && "Check the address and the date. Then email the request to the Pensacola office."}
      </p>

      {errors.length ? (
        <div className="errors" role="alert" tabIndex={-1} ref={errorRef}>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === "intent" ? (
        <div className="stack">
          {intentGroups.map((group) => (
            <fieldset key={group} className="intent-set">
              <legend>{group}</legend>
              <div className="choice-grid">
                {intents
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <label key={item.id} className={`choice rich ${draft.intent === item.id ? "on" : ""}`}>
                      <input
                        type="radio"
                        name="intent"
                        value={item.id}
                        checked={draft.intent === item.id}
                        onChange={() => {
                          update("intent", item.id);
                          setErrors([]);
                          setStep("property");
                        }}
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <em>{item.line}</em>
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      {step === "property" ? (
        <div className="stack">
          <Field id="address" label="Street address">
            <input
              id="address"
              value={draft.address}
              autoComplete="street-address"
              onChange={(event) => update("address", event.target.value)}
            />
          </Field>
          <Field id="city" label="City">
            <input
              id="city"
              value={draft.city}
              autoComplete="address-level2"
              onChange={(event) => update("city", event.target.value)}
            />
          </Field>
          <ChoiceGroup
            legend="County"
            name="county"
            value={draft.county}
            options={COUNTIES}
            onChange={(id) => update("county", id as QuoteDraft["county"])}
          />
          {draft.county === "Other" ? (
            <Field id="otherPlace" label="County or area" hint="Tell us where the work is so we can say if the crew can take it.">
              <input id="otherPlace" value={draft.otherPlace} onChange={(event) => update("otherPlace", event.target.value)} />
            </Field>
          ) : null}
          <Field
            id="parcel"
            label="Parcel ID, if you have it"
            hint="On the tax bill, or look it up. The county map is not a survey."
          >
            <input id="parcel" value={draft.parcelId} onChange={(event) => update("parcelId", event.target.value)} />
          </Field>
          <p className="hint links">
            {COMPANY.appraisers.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                {item.name}
              </a>
            ))}
          </p>
        </div>
      ) : null}

      {step === "details" ? (
        <div className="stack">
          {recommendation ? (
            <aside className="note">
              <p>
                <strong>We’ll price this as: {recommendation.product}.</strong> {recommendation.because}
              </p>
              {recommendation.slug ? (
                <Link to={`/services/${recommendation.slug}`}>What this survey includes</Link>
              ) : null}
            </aside>
          ) : null}
          {blocks.has("fence") ? (
            <ChoiceGroup
              legend="What do you need along the line?"
              name="fence"
              value={draft.fencePurpose}
              options={FENCE_PURPOSES}
              onChange={(id) => update("fencePurpose", id)}
            />
          ) : null}
          {blocks.has("elevation") ? (
            <ChoiceGroup
              legend="Who is the elevation certificate for?"
              name="elevation"
              value={draft.elevationPurpose}
              options={ELEVATION_PURPOSES}
              onChange={(id) => update("elevationPurpose", id)}
            />
          ) : null}
          {blocks.has("title") ? (
            <ChoiceGroup
              legend="Do you have a title commitment?"
              name="title"
              value={draft.titleCommitment}
              options={TITLE_OPTIONS}
              onChange={(id) => update("titleCommitment", id as QuoteDraft["titleCommitment"])}
            />
          ) : null}
          {blocks.has("topo") ? (
            <ChoiceGroup
              legend="What is the topographic survey for?"
              name="topo"
              value={draft.topoPurpose}
              options={TOPO_PURPOSES}
              onChange={(id) => update("topoPurpose", id)}
            />
          ) : null}
          {blocks.has("construction") ? (
            <>
              <ChoiceGroup
                legend="What does the site need?"
                name="construction"
                value={draft.constructionKind}
                options={CONSTRUCTION_KINDS}
                onChange={(id) => update("constructionKind", id as QuoteDraft["constructionKind"])}
              />
              <ChoiceGroup
                legend="Are plans available?"
                name="plans"
                value={draft.plans}
                options={PLAN_OPTIONS}
                onChange={(id) => update("plans", id as QuoteDraft["plans"])}
              />
            </>
          ) : null}
          {blocks.has("development") ? (
            <ChoiceGroup
              legend="What kind of development?"
              name="development"
              value={draft.developmentKind}
              options={DEVELOPMENT_KINDS}
              onChange={(id) => update("developmentKind", id)}
            />
          ) : null}
          {blocks.has("road") ? (
            <ChoiceGroup
              legend="What should the road survey cover?"
              name="road"
              value={draft.roadKind}
              options={ROAD_KINDS}
              onChange={(id) => update("roadKind", id)}
            />
          ) : null}
          {blocks.has("waterway") ? (
            <ChoiceGroup
              legend="What water or drainage is involved?"
              name="waterway"
              value={draft.waterwayKind}
              options={WATERWAY_KINDS}
              onChange={(id) => update("waterwayKind", id)}
            />
          ) : null}
          {blocks.has("scan") ? (
            <>
              <CheckGroup
                legend="How should we capture the site?"
                name="scan-method"
                values={draft.scanMethods}
                options={SCAN_METHODS}
                onToggle={(id) => toggle("scanMethods", id)}
              />
              <CheckGroup
                legend="What should we hand back? Optional."
                name="scan-output"
                values={draft.scanOutputs}
                options={SCAN_OUTPUTS}
                onToggle={(id) => toggle("scanOutputs", id)}
              />
            </>
          ) : null}
          {blocks.has("unsure") ? (
            <Field id="unsure" label="What are you trying to figure out?">
              <textarea
                id="unsure"
                rows={4}
                value={draft.unsureNote}
                onChange={(event) => update("unsureNote", event.target.value)}
              />
            </Field>
          ) : null}
          {blocks.has("size") ? (
            <Field id="size" label="Approximate size, if you know it" hint="Acres, lots, or length. Optional.">
              <input id="size" value={draft.sizeNote} onChange={(event) => update("sizeNote", event.target.value)} />
            </Field>
          ) : null}
          <ChoiceGroup
            legend="How soon do you need it?"
            name="pace"
            value={draft.pace}
            options={PACE_OPTIONS}
            onChange={(id) => update("pace", id as QuoteDraft["pace"])}
          />
          {draft.pace === "deadline" ? (
            <Field id="needBy" label="Closing or deadline date">
              <input id="needBy" type="date" value={draft.needBy} onChange={(event) => update("needBy", event.target.value)} />
            </Field>
          ) : null}
          {blocks.has("addons") ? (
            <CheckGroup
              legend="Add anything else? Optional."
              name="addons"
              values={activeAddons(draft)}
              options={addonOptions(draft.intent)}
              onToggle={(id) => toggle("addons", id)}
            />
          ) : null}
        </div>
      ) : null}

      {step === "contact" ? (
        <div className="stack">
          <div className="split">
            <Field id="firstName" label="First name">
              <input
                id="firstName"
                autoComplete="given-name"
                value={draft.firstName}
                onChange={(event) => update("firstName", event.target.value)}
              />
            </Field>
            <Field id="lastName" label="Last name">
              <input
                id="lastName"
                autoComplete="family-name"
                value={draft.lastName}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </Field>
          </div>
          <div className="split">
            <Field id="phone" label="Phone">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={draft.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field>
            <Field id="email" label="Email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </Field>
          </div>
          <Field id="company" label="Company, if any">
            <input
              id="company"
              autoComplete="organization"
              value={draft.company}
              onChange={(event) => update("company", event.target.value)}
            />
          </Field>
          <ChoiceGroup
            legend="Who are you?"
            name="role"
            value={draft.role}
            options={ROLES}
            onChange={(id) => update("role", id)}
          />
          <div className="hp" aria-hidden="true">
            <label htmlFor="companyWebsite">Website</label>
            <input
              id="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
              value={draft.companyWebsite}
              onChange={(event) => update("companyWebsite", event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="stack">
          <ReviewBlock title="Reason" onEdit={() => go("intent")}>
            <p>{recommendation?.product ?? "—"}</p>
            {recommendation ? <p>{recommendation.because}</p> : null}
          </ReviewBlock>
          <ReviewBlock title="Property" onEdit={() => go("property")}>
            <p>
              {draft.address}, {draft.city}
            </p>
            <p>{draft.county === "Other" ? draft.otherPlace : `${draft.county} County`}</p>
            {draft.parcelId ? <p>Parcel {draft.parcelId}</p> : null}
          </ReviewBlock>
          <ReviewBlock title="Details" onEdit={() => go("details")}>
            <DetailSummary draft={draft} />
          </ReviewBlock>
          <ReviewBlock title="Contact" onEdit={() => go("contact")}>
            <p>
              {draft.firstName} {draft.lastName}
              {draft.company ? `, ${draft.company}` : ""}
            </p>
            <p>
              {draft.phone} · {draft.email}
            </p>
          </ReviewBlock>
          <Field id="notes" label="Anything else the office should know?" hint="Optional.">
            <textarea id="notes" rows={4} maxLength={1500} value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
          <Field
            id="files"
            label="Deed, prior survey, title commitment, or plans"
            hint="Optional. Up to 6 files, 15 MB each. You’ll attach them in the email unless a form service is connected."
          >
            <input
              id="files"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.dwg,.dxf,.zip,.doc,.docx,application/pdf"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </Field>
          {files.length ? <p className="hint">{files.map((file) => file.name).join(", ")}</p> : null}
        </div>
      ) : null}

      <div className="wizard-nav">
        {step !== "intent" ? (
          <button type="button" className="btn secondary" onClick={() => go(prevStep(step))}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step === "intent" && !draft.intent ? (
          <span />
        ) : (
          <button className="btn" type="submit" disabled={busy}>
            {step === "review" ? (busy ? "Working…" : sends ? "Send the request" : "Write the request") : "Continue"}
          </button>
        )}
      </div>
      {draft.intent || draft.address ? (
        <button type="button" className="text-button" onClick={startOver}>
          Clear this request
        </button>
      ) : null}
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const hintId = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label key={option.id} className={`choice ${value === option.id ? "on" : ""}`}>
            <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CheckGroup({
  legend,
  name,
  values,
  options,
  onToggle,
}: {
  legend: string;
  name: string;
  values: string[];
  options: Option[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label key={option.id} className={`choice ${values.includes(option.id) ? "on" : ""}`}>
            <input
              type="checkbox"
              name={name}
              value={option.id}
              checked={values.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="review-block">
      <header>
        <h2>{title}</h2>
        <button type="button" className="text-button" onClick={onEdit}>
          Edit
        </button>
      </header>
      {children}
    </section>
  );
}

function DetailSummary({ draft }: { draft: QuoteDraft }) {
  const blocks = new Set(detailBlocks(draft.intent));
  const pace = PACE_OPTIONS.find((item) => item.id === draft.pace)?.label;
  const lines = [
    blocks.has("fence") ? FENCE_PURPOSES.find((item) => item.id === draft.fencePurpose)?.label : "",
    blocks.has("elevation") ? ELEVATION_PURPOSES.find((item) => item.id === draft.elevationPurpose)?.label : "",
    blocks.has("title") ? TITLE_OPTIONS.find((item) => item.id === draft.titleCommitment)?.label : "",
    blocks.has("topo") ? TOPO_PURPOSES.find((item) => item.id === draft.topoPurpose)?.label : "",
    blocks.has("construction") ? CONSTRUCTION_KINDS.find((item) => item.id === draft.constructionKind)?.label : "",
    blocks.has("construction") ? PLAN_OPTIONS.find((item) => item.id === draft.plans)?.label : "",
    blocks.has("development") ? DEVELOPMENT_KINDS.find((item) => item.id === draft.developmentKind)?.label : "",
    blocks.has("road") ? ROAD_KINDS.find((item) => item.id === draft.roadKind)?.label : "",
    blocks.has("waterway") ? WATERWAY_KINDS.find((item) => item.id === draft.waterwayKind)?.label : "",
    blocks.has("unsure") ? draft.unsureNote : "",
    blocks.has("size") ? draft.sizeNote : "",
    pace,
    draft.pace === "deadline" ? draft.needBy : "",
  ].filter(Boolean);
  const addons = activeAddons(draft).map((id) => addonOptions(draft.intent).find((item) => item.id === id)?.label);
  return (
    <>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {addons.length ? <p>{addons.join(" · ")}</p> : null}
    </>
  );
}
