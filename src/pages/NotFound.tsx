import { Link } from "react-router-dom";
import { COMPANY, telHref } from "../data/company";
import { usePageTitle } from "../usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found · KJM Land Surveying");
  return (
    <article className="page">
      <h1>That page isn’t here.</h1>
      <p className="lede">The quote form is, and so is the phone.</p>
      <div className="actions">
        <Link className="btn" to="/quote">
          Request a quote
        </Link>
        <a className="btn secondary" href={telHref()}>
          Call {COMPANY.phoneDisplay}
        </a>
      </div>
    </article>
  );
}
