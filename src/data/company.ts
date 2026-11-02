export const COMPANY = {
  name: "KJM Land Surveying",
  legalName: "KJM Land Surveying, LLC",
  phoneDisplay: "(850) 438-0202",
  phoneTel: "+18504380202",
  email: "quote@kjmsurvey.com",
  street: "1616 W Avery Street",
  city: "Pensacola",
  region: "FL",
  postalCode: "32501",
  facebook: "https://www.facebook.com/152450984797102",
  founded: 1993,
  certificate: "LB8298",
  surveyor: "William Bryan Bennett, PSM",
  surveyorLicense: "LS6353",
  latitude: 30.431083,
  longitude: -87.237599,
  hours: [
    { days: "Monday – Thursday", hours: "8:00 am – 5:00 pm CT" },
    { days: "Friday", hours: "8:00 am – 3:00 pm CT" },
    { days: "Saturday – Sunday", hours: "Closed" },
  ],
  mapEmbed:
    "https://www.openstreetmap.org/export/embed.html?bbox=-87.248%2C30.427%2C-87.227%2C30.435&layer=mapnik&marker=30.431083%2C-87.237599",
  directions:
    "https://maps.google.com/?q=1616+W+Avery+Street,+Pensacola,+FL+32501",
  appraisers: [
    { name: "Escambia County Property Appraiser", href: "https://escpa.org/" },
    { name: "Santa Rosa County Property Appraiser", href: "https://srcpa.gov/" },
    { name: "Santa Rosa parcel search", href: "https://search.srcpa.gov/" },
  ],
  cities: [
    "Pensacola",
    "Gulf Breeze",
    "Pace",
    "Milton",
    "Navarre",
    "Cantonment",
    "Pensacola Beach",
  ],
} as const;

export function telHref() {
  return `tel:${COMPANY.phoneTel}`;
}

export function mailHref(subject?: string) {
  const base = `mailto:${COMPANY.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
