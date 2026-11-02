import { Link } from "react-router-dom";
import { COMPANY, telHref } from "../data/company";
import { chooser, intentGroups, intents, methods, serviceBySlug, steps } from "../data/catalog";
import { SurveyExplorer } from "../components/SurveySheet";
import { usePageTitle } from "../usePageTitle";

export function HomePage() {
  usePageTitle("KJM Land Surveying · Pensacola surveys, scanning, and drone LiDAR");

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Pensacola · Escambia and Santa Rosa counties · Since {COMPANY.founded}</p>
          <h1>Tell us the property. We’ll name the survey and price it.</h1>
          <p className="lede">
            Mortgage and boundary surveys, elevation certificates, ALTAs, construction layout, roads, waterways,
            terrestrial scanning, and drone LiDAR. Start with the address.
          </p>
          <div className="actions">
            <Link className="btn" to="/quote">
              Start a quote
            </Link>
            <a className="btn secondary" href={telHref()}>
              Call {COMPANY.phoneDisplay}
            </a>
          </div>
          <p className="fine">About two minutes if you know the address. A deed, parcel ID, or set of plans can follow.</p>
        </div>
        <SurveyExplorer />
      </section>

      <section className="section" aria-labelledby="reasons">
        <div className="section-head">
          <p className="eyebrow">Start here</p>
          <h2 id="reasons">What brings you here?</h2>
          <p>Pick the closest reason. The quote opens on the property, with the survey already named.</p>
        </div>
        {intentGroups.map((group) => (
          <div key={group} className="intent-group">
            <h3>{group}</h3>
            <div className="intent-grid">
              {intents
                .filter((item) => item.group === group)
                .map((item) => (
                  <Link key={item.id} className="intent-card" to={`/quote?intent=${item.id}`}>
                    <strong>{item.title}</strong>
                    <span>{item.line}</span>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </section>

      <section className="section" aria-labelledby="measure">
        <div className="section-head">
          <p className="eyebrow">How the site gets measured</p>
          <h2 id="measure">Three ways we measure</h2>
          <p>The tool follows the question. A property line is still decided from the deeds and the monuments.</p>
        </div>
        <div className="methods">
          {methods.map((method) => (
            <article key={method.num}>
              <p className="num">{method.num}</p>
              <h3>{method.title}</h3>
              <p>{method.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="after">
        <div className="section-head">
          <p className="eyebrow">After you ask</p>
          <h2 id="after">What happens next</h2>
          <p>
            Calls and quote emails are handled {COMPANY.hours[0].hours.replace(" CT", "")} Monday through Thursday, and{" "}
            {COMPANY.hours[1].hours.replace(" CT", "")} on Friday, Central time.
          </p>
        </div>
        <ol className="process">
          {steps.map((step) => (
            <li key={step.num}>
              <span>{step.num}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="more">
          <Link to="/how-it-works">What to have ready, and what changes the price</Link>
        </p>
      </section>

      <section className="section" aria-labelledby="chooser">
        <div className="section-head">
          <p className="eyebrow">Which drawing</p>
          <h2 id="chooser">Say it in plain language</h2>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Which survey matches a common request</caption>
            <thead>
              <tr>
                <th scope="col">When you say</th>
                <th scope="col">We usually prepare</th>
              </tr>
            </thead>
            <tbody>
              {chooser.map((row) => {
                const service = serviceBySlug(row.slug);
                return (
                  <tr key={row.slug}>
                    <td>{row.say}</td>
                    <td>
                      <Link to={`/services/${row.slug}`}>{service?.name}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="more">
          <Link to="/services">Read what each survey includes, and what it doesn’t</Link>
        </p>
      </section>

      <section className="band">
        <div>
          <p className="eyebrow">Where we work</p>
          <h2>Escambia and Santa Rosa, every week.</h2>
          <p>
            Everyday surveys cover {COMPANY.cities.join(", ")}, and the rest of those two counties. For a road, a
            waterway, a scan, or a development farther out, tell us where it is and we’ll say whether the crew can take it.
          </p>
        </div>
        <div className="band-card">
          <p>
            {COMPANY.street}
            <br />
            {COMPANY.city}, {COMPANY.region} {COMPANY.postalCode}
          </p>
          <p>
            <a href={telHref()}>{COMPANY.phoneDisplay}</a>
            <br />
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
          <Link className="btn" to="/quote">
            Start a quote
          </Link>
        </div>
      </section>
    </>
  );
}
