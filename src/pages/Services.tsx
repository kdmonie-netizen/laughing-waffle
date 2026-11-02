import { Link, useParams } from "react-router-dom";
import { serviceBySlug, serviceGroups, services, type Service } from "../data/catalog";
import { usePageTitle } from "../usePageTitle";

export function ServicesPage() {
  usePageTitle("Survey services · KJM Land Surveying");
  return (
    <article className="page">
      <p className="eyebrow">Services</p>
      <h1>From a mortgage survey to a scan of a corridor.</h1>
      <p className="lede">
        Each product below says what it is, who asks for it, what shows up on the drawing, and what is a separate
        scope. If the name is unfamiliar, start from the reason instead.
      </p>
      <p className="more">
        <Link to="/quote">I’m not sure — help me choose</Link>
      </p>
      <nav className="jump" aria-label="Service groups">
        {serviceGroups.map((group) => (
          <a key={group} href={`#${groupId(group)}`}>
            {group}
          </a>
        ))}
      </nav>
      {serviceGroups.map((group) => (
        <section key={group} id={groupId(group)} className="service-group" aria-labelledby={groupId(group) + "-title"}>
          <h2 id={groupId(group) + "-title"}>{group}</h2>
          {services
            .filter((service) => service.group === group)
            .map((service) => (
              <ServiceArticle key={service.slug} service={service} heading="h3" />
            ))}
        </section>
      ))}
    </article>
  );
}

export function ServiceDetailPage() {
  const { slug = "" } = useParams();
  const service = serviceBySlug(slug);
  usePageTitle(service ? `${service.name} · KJM Land Surveying` : "Service · KJM Land Surveying");
  if (!service) {
    return (
      <article className="page">
        <h1>That service isn’t on the list.</h1>
        <p>
          <Link to="/services">See every survey</Link>
        </p>
      </article>
    );
  }
  const index = services.findIndex((item) => item.slug === service.slug);
  const previous = services[index - 1];
  const next = services[index + 1];
  return (
    <article className="page">
      <p className="eyebrow">{service.group}</p>
      <ServiceArticle service={service} heading="h1" />
      <nav className="pager" aria-label="More services">
        {previous ? <Link to={`/services/${previous.slug}`}>{previous.name}</Link> : <span />}
        <Link to="/services">All services</Link>
        {next ? <Link to={`/services/${next.slug}`}>{next.name}</Link> : <span />}
      </nav>
    </article>
  );
}

function ServiceArticle({ service, heading }: { service: Service; heading: "h1" | "h3" }) {
  const Title = heading;
  return (
    <section className="service-article" id={service.slug} aria-labelledby={`${service.slug}-title`}>
      <div className="service-copy">
        <Title id={`${service.slug}-title`}>
          {heading === "h3" ? <Link to={`/services/${service.slug}`}>{service.name}</Link> : service.name}
        </Title>
        <p>{service.summary}</p>
        <h4>Ask for it when</h4>
        <p>{service.askWhen}</p>
        <h4>How it’s captured</h4>
        <p>{service.capture}</p>
        <h4>A separate product</h4>
        <p>{service.separateFrom}</p>
        <Link className="btn" to={service.quoteTo}>
          Request this
        </Link>
      </div>
      <div className="service-facts">
        <h4>On the deliverable</h4>
        <ul>
          {service.onTheSurvey.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4>Faster to price if you have</h4>
        <ul>
          {service.readyIf.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function groupId(group: string) {
  return group.toLowerCase().replace(/[^a-z]+/g, "-");
}
