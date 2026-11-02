import { Link } from "react-router-dom";
import { COMPANY, mailHref, telHref } from "../data/company";
import { OpenBadge } from "../components/OpenBadge";
import { usePageTitle } from "../usePageTitle";

export function ContactPage() {
  usePageTitle("Office · KJM Land Surveying, Pensacola");
  return (
    <article className="page">
      <p className="eyebrow">Office</p>
      <h1>1616 W Avery Street, Pensacola.</h1>
      <p className="lede">
        <OpenBadge /> The fastest quote is the form. The phone is here when you’d rather talk it through.
      </p>
      <div className="contact-grid">
        <div>
          <h2>Hours</h2>
          <ul className="hours">
            {COMPANY.hours.map((row) => (
              <li key={row.days}>
                <span>{row.days}</span>
                <span>{row.hours}</span>
              </li>
            ))}
          </ul>
          <h2>Reach the office</h2>
          <p>
            <a href={telHref()}>{COMPANY.phoneDisplay}</a>
          </p>
          <p>
            <a href={mailHref("Quote request")}>{COMPANY.email}</a>
          </p>
          <p>
            <a href={COMPANY.facebook}>Facebook</a>
          </p>
          <p>
            {COMPANY.street}
            <br />
            {COMPANY.city}, {COMPANY.region} {COMPANY.postalCode}
          </p>
          <p>
            <a href={COMPANY.directions}>Directions</a>
          </p>
          <p className="fine">
            {COMPANY.legalName}. Certificate of authorization {COMPANY.certificate}. Surveyor of record: {COMPANY.surveyor},{" "}
            {COMPANY.surveyorLicense}.
          </p>
          <Link className="btn" to="/quote">
            Request a quote
          </Link>
        </div>
        <iframe
          title="Map of KJM Land Surveying at 1616 W Avery Street, Pensacola"
          src={COMPANY.mapEmbed}
          loading="lazy"
        />
      </div>
    </article>
  );
}
