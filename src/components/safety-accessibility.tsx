import { pickupServices, telephone } from "@/lib/pickup-help";

export function SafetyAccessibility() {
  return (
    <details className="pickup-assistance">
      <summary>Safety &amp; Accessibility</summary>
      <div className="assistance-content">
        <h3>Getting There Safely</h3>
        <p>
          For emergencies, call <a href="tel:911">911</a>.
        </p>
        <ul className="service-list">
          {pickupServices.map((service) => (
            <li key={service.name}>
              <strong>{service.name}</strong>
              <p>{service.description}</p>
              <div className="button-row">
                <a
                  className="text-link"
                  href={telephone(service.phone)}
                  aria-label={`Call ${service.name}: ${service.phone}`}
                >
                  {service.phone}
                </a>
                <a
                  className="text-link"
                  href={service.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${service.name} official information (opens in a new tab)`}
                >
                  Official information ↗
                </a>
              </div>
            </li>
          ))}
          <li>
            <a
              className="text-link"
              href="https://maps.ubc.ca/"
              target="_blank"
              rel="noopener noreferrer"
            >
              UBC Campus Wayfinding ↗
            </a>
            <p>
              Official campus maps and accessible entrance information. Check
              your route and pickup spot; accessibility varies.
            </p>
          </li>
        </ul>
        <p className="fine">
          These independent services are not operated by or affiliated with
          CampusLoop.
        </p>
      </div>
    </details>
  );
}
