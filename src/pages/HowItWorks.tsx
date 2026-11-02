import { Link } from "react-router-dom";
import { COMPANY } from "../data/company";
import { bringList, glossary, priceFactors, steps } from "../data/catalog";
import { usePageTitle } from "../usePageTitle";

export function HowItWorksPage() {
  usePageTitle("How a KJM survey works");
  return (
    <article className="page">
      <p className="eyebrow">How it works</p>
      <h1>A written scope and a price, before anyone is scheduled.</h1>
      <p className="lede">
        The office reads quote requests {COMPANY.hours[0].hours.toLowerCase()} Monday through Thursday and{" "}
        {COMPANY.hours[1].hours.toLowerCase()} on Friday. If the address and the reason are clear, most residential jobs
        can be priced from the records. Larger scanning, road, and development work may need the plans or a short call.
      </p>

      <ol className="process">
        {steps.map((step) => (
          <li key={step.num}>
            <span>{step.num}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="section tight" aria-labelledby="bring">
        <h2 id="bring">What to have ready</h2>
        <ul className="bring">
          {bringList.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
        <p className="hint links">
          {COMPANY.appraisers.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
              {item.name}
            </a>
          ))}
        </p>
      </section>

      <section className="section tight" aria-labelledby="price">
        <h2 id="price">What changes the price</h2>
        <p>There isn’t a flat fee on the site, because a Gulf Breeze lot and a metes-and-bounds tract are different jobs.</p>
        <ul className="factors">
          {priceFactors.map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      </section>

      <section className="section tight" aria-labelledby="words">
        <h2 id="words">Words that show up on a survey</h2>
        <dl className="glossary">
          {glossary.map((entry) => (
            <div key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>{entry.def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="note wide">
        <p>
          The Escambia and Santa Rosa property appraiser maps are for taxes. Both offices say as much. Use them to find a
          parcel ID, then ask for a survey when you need the line, the flood form, or a map you can build from.
        </p>
        <Link className="btn" to="/quote">
          Start a quote
        </Link>
      </section>
    </article>
  );
}
