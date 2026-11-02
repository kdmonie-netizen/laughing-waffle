import { QuoteWizard } from "../components/QuoteWizard";
import { usePageTitle } from "../usePageTitle";

export function QuotePage() {
  usePageTitle("Request a survey quote · KJM Land Surveying");
  return (
    <article className="page quote-page">
      <QuoteWizard />
    </article>
  );
}
