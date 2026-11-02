# KJM Land Surveying

Website for [KJM Land Surveying](https://www.kjmsurveying.com/) in Pensacola. It replaces a single undifferentiated quote form with a guided request and plain-language explanations of the work.

People can ask for a mortgage or boundary survey, an elevation certificate, an ALTA, construction staking, an as-built, development work, a road or waterway survey, terrestrial scanning, or drone LiDAR. If they do not know the product name, they describe the problem and the office names the survey before pricing it.

## Run

```bash
npm install
npm test
npm run dev
```

`npm run build` writes the static site to `dist/`.

## Quotes

With no configuration, **Write the request** prepares an email to `quote@kjmsurvey.com` and leaves the full text on the page to copy. Files are listed, and the sender attaches them in their email app.

Set `VITE_QUOTE_ENDPOINT` to POST the request as multipart form data (`payload` JSON, `text`, and `files`) to your own form service. See `.env.example`.

## Facts the copy relies on

- Office: 1616 W Avery Street, Pensacola, FL 32501
- Phone: (850) 438-0202
- Email: quote@kjmsurvey.com
- Hours: Monday–Thursday 8:00 am–5:00 pm CT, Friday 8:00 am–3:00 pm CT
- Practice dates to 1993
- Everyday coverage: Escambia and Santa Rosa counties
- Certificate of authorization LB8298 and surveyor of record William Bryan Bennett, PSM, LS6353, as listed in public Florida surveyor records

Do not add prices, turnaround guarantees, or performance percentages. The quote says the office confirms scope and price before scheduling.
