import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { COMPANY, telHref } from "../data/company";
import { Logo } from "./Logo";
import { OpenBadge } from "./OpenBadge";

const schema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: COMPANY.name,
  legalName: COMPANY.legalName,
  telephone: COMPANY.phoneTel,
  email: COMPANY.email,
  foundingDate: String(COMPANY.founded),
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY.street,
    addressLocality: COMPANY.city,
    addressRegion: COMPANY.region,
    postalCode: COMPANY.postalCode,
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: COMPANY.latitude,
    longitude: COMPANY.longitude,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "08:00",
      closes: "17:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Friday",
      opens: "08:00",
      closes: "15:00",
    },
  ],
  areaServed: ["Escambia County, Florida", "Santa Rosa County, Florida"],
  sameAs: [COMPANY.facebook],
};

export function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const quotePage = location.pathname === "/quote";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    const node = document.getElementById(location.hash.slice(1));
    node?.scrollIntoView();
  }, [location.pathname, location.hash]);

  return (
    <div className={quotePage ? "shell no-dock" : "shell"}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="header">
        <Link className="brand" to="/">
          <Logo />
          <span>
            <strong>KJM</strong>
            <em>Land Surveying</em>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/contact">Office</NavLink>
        </nav>
        <div className="header-tools">
          <a className="header-phone" href={telHref()}>
            {COMPANY.phoneDisplay}
            <OpenBadge />
          </a>
          <Link className="btn small" to="/quote">
            Request a quote
          </Link>
          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>
      {menuOpen ? (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile">
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/contact">Office</NavLink>
          <NavLink to="/quote">Request a quote</NavLink>
          <a href={telHref()}>{COMPANY.phoneDisplay}</a>
        </nav>
      ) : null}
      <main id="content">{<Outlet />}</main>
      <footer className="footer">
        <div className="titleblock">
          <div>
            <strong>{COMPANY.legalName}</strong>
            <span>Surveying Pensacola since {COMPANY.founded}</span>
            <span>
              {COMPANY.surveyor} · {COMPANY.surveyorLicense}
            </span>
          </div>
          <div>
            <strong>Office</strong>
            <span>{COMPANY.street}</span>
            <span>
              {COMPANY.city}, {COMPANY.region} {COMPANY.postalCode}
            </span>
            <a href={COMPANY.directions}>Directions</a>
          </div>
          <div>
            <strong>Certificate {COMPANY.certificate}</strong>
            <a href={telHref()}>{COMPANY.phoneDisplay}</a>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            <a href={COMPANY.facebook}>Facebook</a>
          </div>
        </div>
        <div className="footer-meta">
          <p>Sample drawings on this site are illustrations, not surveys of a real lot.</p>
          <p>
            {COMPANY.hours.map((row) => (
              <span key={row.days}>
                {row.days}: {row.hours}
              </span>
            ))}
          </p>
        </div>
      </footer>
      <div className="dock">
        <a href={telHref()}>Call</a>
        <Link to="/quote">Request a quote</Link>
      </div>
    </div>
  );
}
