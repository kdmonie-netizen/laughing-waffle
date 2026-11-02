export type IntentId =
  | "mortgage"
  | "fence"
  | "elevation"
  | "alta"
  | "topo"
  | "construction"
  | "development"
  | "road"
  | "waterway"
  | "scan"
  | "unsure";

export type IntentGroup =
  | "Home and closing"
  | "Design and construction"
  | "Scanning and corridors"
  | "Not sure yet";

export type Intent = {
  id: IntentId;
  group: IntentGroup;
  title: string;
  line: string;
};

export const intentGroups: IntentGroup[] = [
  "Home and closing",
  "Design and construction",
  "Scanning and corridors",
  "Not sure yet",
];

export const intents: Intent[] = [
  {
    id: "mortgage",
    group: "Home and closing",
    title: "Buying, selling, or refinancing a home",
    line: "The survey a lender or title company asks for at closing.",
  },
  {
    id: "fence",
    group: "Home and closing",
    title: "Fence, corners, or a property line",
    line: "Find the line before you build, plant, or argue about it.",
  },
  {
    id: "elevation",
    group: "Home and closing",
    title: "Flood insurance or an elevation certificate",
    line: "The FEMA form insurers and some lenders require.",
  },
  {
    id: "alta",
    group: "Home and closing",
    title: "Commercial closing or an ALTA survey",
    line: "A land title survey written to the title commitment.",
  },
  {
    id: "topo",
    group: "Design and construction",
    title: "Elevations for design, drainage, or a site plan",
    line: "Contours and spot shots a builder or engineer can use.",
  },
  {
    id: "construction",
    group: "Design and construction",
    title: "Construction staking or an as-built",
    line: "Put the plans on the ground, or record what got built.",
  },
  {
    id: "development",
    group: "Design and construction",
    title: "A subdivision, site, or larger development",
    line: "Boundary, topo, and layout for a project with phases.",
  },
  {
    id: "road",
    group: "Scanning and corridors",
    title: "A road, right-of-way, or corridor",
    line: "Existing ground, right-of-way, and construction layout.",
  },
  {
    id: "waterway",
    group: "Scanning and corridors",
    title: "Shoreline, canal, bayou, or drainage",
    line: "Bulkheads, water’s edge, and the ground along the water.",
  },
  {
    id: "scan",
    group: "Scanning and corridors",
    title: "Terrestrial scanning, drone LiDAR, or aerial mapping",
    line: "A point cloud and a map, from the ground or from a drone.",
  },
  {
    id: "unsure",
    group: "Not sure yet",
    title: "I’m not sure what to ask for",
    line: "Describe the problem. We’ll name the survey before we price it.",
  },
];

export function isIntentId(value: string): value is IntentId {
  return intents.some((item) => item.id === value);
}

export type ServiceGroup = "Closing and boundary" | "Design and construction" | "Scanning and corridors";

export type Service = {
  slug: string;
  name: string;
  group: ServiceGroup;
  summary: string;
  askWhen: string;
  onTheSurvey: string[];
  capture: string;
  separateFrom: string;
  readyIf: string[];
  quoteTo: string;
};

export const serviceGroups: ServiceGroup[] = [
  "Closing and boundary",
  "Design and construction",
  "Scanning and corridors",
];

export const services: Service[] = [
  {
    slug: "improvements",
    name: "Boundary with improvements",
    group: "Closing and boundary",
    summary:
      "This is the survey most home closings in Escambia and Santa Rosa counties are asking for. People often call it a mortgage survey. It locates the lot and shows the house and other improvements on it.",
    askWhen:
      "A lender, title company, realtor, or attorney has asked for a survey before closing or refinancing, or you want the house, pool, and fences shown with the lines.",
    onTheSurvey: [
      "Boundary lines, with the monuments that were found or set",
      "House, driveway, fences, pools, sheds, and other visible improvements",
      "Encroachments the field work finds",
      "Easements when a title document or the scope gives them to us",
      "A signed and sealed drawing for the closing file",
    ],
    capture:
      "Record research, then GPS and a total station on the ground. The lines come from the deeds, the plat, and the monuments, not from the county’s tax map.",
    separateFrom:
      "An elevation certificate is a separate FEMA form. A topographic survey is a separate drawing of elevations. Either can be added when the lender, insurer, or builder wants it.",
    readyIf: [
      "Street address and county",
      "Closing date, if there is one",
      "A prior survey or deed, if you have it",
    ],
    quoteTo: "/quote?intent=mortgage",
  },
  {
    slug: "boundary",
    name: "Boundary survey",
    group: "Closing and boundary",
    summary:
      "A boundary survey is the measurement of the property lines. Ask for it when the line itself is the question — a fence, a corner, a split — and a closing package is not the point.",
    askWhen:
      "You are about to build a fence, you cannot find the pins, a neighbor’s improvement may cross the line, or you need the corners marked.",
    onTheSurvey: [
      "Property lines and the corners",
      "Monuments found, and monuments set when the scope calls for them",
      "Improvements, when you ask for them to be shown",
      "The recorded description the survey is based on",
    ],
    capture:
      "Deeds, plats, and prior surveys first. Then the crew looks for monuments and measures the lot. Flagging the corners can be part of the same visit when you ask for it.",
    separateFrom:
      "The county property appraiser map is for taxes. It is a useful way to find a parcel ID, and it is not a survey of the line.",
    readyIf: ["Street address", "What you are trying to build or settle", "A prior survey, if one exists"],
    quoteTo: "/quote?intent=fence",
  },
  {
    slug: "elevation",
    name: "Elevation certificate",
    group: "Closing and boundary",
    summary:
      "An elevation certificate is the FEMA form used for flood insurance and, sometimes, for a lender or a building permit. It records how the building sits relative to the flood zone.",
    askWhen:
      "An insurer, a lender, or the building department has asked for an elevation certificate, or you are pricing flood coverage.",
    onTheSurvey: [
      "The FEMA elevation certificate for the building",
      "Elevations of the features the form requires",
      "The flood zone information used to complete it",
    ],
    capture:
      "Levels are run on the building and tied to the vertical datum the form requires. This is a different field trip from a boundary survey.",
    separateFrom:
      "The certificate does not locate your property corners and it does not replace a boundary or mortgage survey.",
    readyIf: ["Property address", "Who asked for it: insurance, lender, or permit", "A recent survey, if you have one"],
    quoteTo: "/quote?intent=elevation",
  },
  {
    slug: "alta",
    name: "ALTA/NSPS land title survey",
    group: "Closing and boundary",
    summary:
      "An ALTA survey is the commercial land title survey. It is prepared to the current ALTA/NSPS standards, the title commitment, and the Table A items the lender or attorney selects.",
    askWhen:
      "A commercial property is being bought, sold, refinanced, or developed, and the title company or lender requires an ALTA/NSPS survey.",
    onTheSurvey: [
      "Boundary and monuments",
      "Improvements, access, and the items the standards require",
      "Easements and exceptions plotted from the title commitment",
      "The Table A items that were checked",
      "A certification to the parties named in the scope",
    ],
    capture:
      "The title commitment drives the scope. Field crews locate the boundary and the evidence on the ground. The office plots the exceptions and prepares the certification.",
    separateFrom:
      "A residential mortgage survey is the wrong product for most commercial title policies. Table A items change the fee, so the quote waits on the commitment or a clear list of what must be included.",
    readyIf: [
      "Property address and rough size",
      "Title commitment, or the date you expect it",
      "Who will be named in the certification",
    ],
    quoteTo: "/quote?intent=alta",
  },
  {
    slug: "topographic",
    name: "Topographic survey",
    group: "Design and construction",
    summary:
      "A topographic survey maps the shape of the ground and the features that affect design: contours, spot elevations, drainage, and the edges of what is already built.",
    askWhen:
      "An engineer, architect, or builder needs elevations for a house, an addition, a drainage fix, or a site plan.",
    onTheSurvey: [
      "Contours at the interval the design needs",
      "Spot elevations on the ground and on hard surfaces",
      "Visible drainage structures, pavement edges, and the features in the scope",
      "A CAD file or surface when the designer asks for one",
    ],
    capture:
      "Conventional shots on smaller lots. On a large tract, a road, or a shoreline, drone LiDAR or a terrestrial scanner is often the faster way to collect the surface, with control set so the map holds.",
    separateFrom:
      "Contours are not a boundary. If the design also needs the property lines, that is added to the scope on purpose.",
    readyIf: ["Address and what is being designed", "Contour interval if the engineer has specified one", "Any old topo or site plan"],
    quoteTo: "/quote?intent=topo",
  },
  {
    slug: "construction",
    name: "Construction staking",
    group: "Design and construction",
    summary:
      "Staking puts the design on the ground: building corners, curb, pavement, utilities, and grade, so the contractor builds where the plans say.",
    askWhen:
      "A builder or developer has plans and needs the site laid out before dirt work, concrete, or utilities.",
    onTheSurvey: [
      "Stakes or marks for the items in the scope",
      "Building, curb, utilities, or grade, as the plans call for",
      "Cut sheets or a field report when the job needs them",
    ],
    capture:
      "The crew works from the design files and the control on the site. CAD is the cleanest start. A PDF is enough to talk through the job.",
    separateFrom:
      "Staking is not an as-built. The as-built is the later survey of what was actually built.",
    readyIf: ["Site address", "What needs to be staked", "CAD or PDF plans"],
    quoteTo: "/quote?intent=construction&kind=stake",
  },
  {
    slug: "as-built",
    name: "As-built survey",
    group: "Design and construction",
    summary:
      "An as-built records what is in the ground after the work. Designers, cities, and owners use it to compare the built site with the plan.",
    askWhen:
      "Construction is in place and someone needs a record of the building, utilities, pavement, or grades.",
    onTheSurvey: [
      "The improvements and utilities that were built, as located",
      "Elevations when the scope includes them",
      "A signed drawing, and CAD when the designer needs to overlay the plan",
    ],
    capture:
      "Field measurements of the finished work. A scanner is a strong fit when the site is dense, industrial, or full of piping and structure. The plan is used when you want the as-built compared with the design.",
    separateFrom:
      "An as-built describes what exists. It does not stake the next phase unless that work is added.",
    readyIf: ["Address", "What was built", "The design file, if a comparison is needed"],
    quoteTo: "/quote?intent=construction&kind=asbuilt",
  },
  {
    slug: "development",
    name: "Development and subdivision",
    group: "Design and construction",
    summary:
      "Larger sites need more than a lot survey. Development work runs from the boundary and topographic base through layout, and a sketch and description when a piece is being cut from a larger tract.",
    askWhen:
      "You are dividing land, designing a commercial site, or building a project in phases.",
    onTheSurvey: [
      "Boundary of the parent tract",
      "Topography for the designer",
      "Control the later staking can reuse",
      "A sketch and description when a parcel is being cut out",
    ],
    capture:
      "The base map is often a mix: conventional boundary work, and drone LiDAR or terrestrial scanning where the acreage makes a prism crew slow. Staking follows when the design is issued.",
    separateFrom:
      "A recorded subdivision plat is its own product, with its own review. The quote names which pieces this phase includes.",
    readyIf: ["Location and approximate acreage or lot count", "Any concept plan", "Whether a split, a topo, or layout is the first need"],
    quoteTo: "/quote?intent=development",
  },
  {
    slug: "roads",
    name: "Roads and right-of-way",
    group: "Scanning and corridors",
    summary:
      "Road work is a corridor survey: existing centerline and edges, the right-of-way, the ground between stations, and staking when the job moves to construction.",
    askWhen:
      "A city, a contractor, or an engineer is designing or building a road, a widening, a driveway tie-in, or a utility corridor.",
    onTheSurvey: [
      "Existing pavement, shoulders, and grade",
      "Right-of-way and the easements included in the scope",
      "Cross sections when the design needs them",
      "Construction layout of the corridor when plans are ready",
    ],
    capture:
      "Mobile or drone LiDAR covers long runs quickly. Control, right-of-way research, and conventional shots still tie the corridor down. Tight structures and bridges are a fit for a terrestrial scanner.",
    separateFrom:
      "A road topo is not a title survey of the adjoining lots unless those boundaries are in the scope.",
    readyIf: ["Where the road is, and roughly how long", "Existing conditions, right-of-way, or staking", "Any alignment or plan files"],
    quoteTo: "/quote?intent=road",
  },
  {
    slug: "waterways",
    name: "Waterways and shoreline",
    group: "Scanning and corridors",
    summary:
      "Waterfront and drainage surveys locate the shoreline or water’s edge, bulkheads, docks, and the upland ground. Depths are added only when the project needs the bottom.",
    askWhen:
      "You are permitting a bulkhead or dock, mapping a canal or bayou, or designing drainage along a ditch or creek.",
    onTheSurvey: [
      "Shoreline or water’s edge as observed in the field",
      "Bulkheads, docks, seawalls, and nearby improvements",
      "Topography of the bank and the upland in the scope",
      "Depths, only when that work is included",
    ],
    capture:
      "The upland and the structures are measured from the ground, and often from a drone when the shore is long. Sounding the bottom is a separate method and a separate line on the quote.",
    separateFrom:
      "A waterfront boundary still depends on the deeds and the monuments. A photograph of the shore is not that boundary, and a lot survey does not include depths unless the scope says so.",
    readyIf: ["Address or water body", "Bulkhead, dock, drainage, or depths", "Any permit drawing"],
    quoteTo: "/quote?intent=waterway",
  },
  {
    slug: "terrestrial",
    name: "Terrestrial scanning",
    group: "Scanning and corridors",
    summary:
      "Terrestrial scanning uses a laser scanner on the ground. It collects a dense point cloud of a building, a plant, a downtown frontage, or a complicated as-built, then the drawing is prepared from that cloud.",
    askWhen:
      "The site is too detailed, too tall, or too busy for a prism shot every few feet, and you want the existing conditions in a cloud, a drawing, or both.",
    onTheSurvey: [
      "A registered point cloud, when you want the file",
      "2D linework or a model extracted from the scan",
      "Control so the cloud sits on survey coordinates",
      "The format your team named: PDF, DWG, LAS, or E57",
    ],
    capture:
      "The scanner occupies a set of positions around the site. Targets or measured control tie the setups together and to the project coordinates. Where the question is a property line, the deeds and the monuments still decide the line.",
    separateFrom:
      "A scan is not, by itself, a boundary survey or an elevation certificate. Those are added when the project needs them.",
    readyIf: ["What you need to capture", "Whether you want a drawing, a cloud, or both", "Rough size and any safety or access limits"],
    quoteTo: "/quote?intent=scan&method=ground",
  },
  {
    slug: "drone",
    name: "Drone LiDAR and aerial mapping",
    group: "Scanning and corridors",
    summary:
      "Drone LiDAR and aerial photos map tracts, roads, stockpiles, and shorelines that are slow to walk. Ground control is set when the map has to hold survey accuracy.",
    askWhen:
      "The site is large, long, or hard to cover on foot, and you need a surface, contours, an orthophoto, or a LiDAR cloud.",
    onTheSurvey: [
      "Contours and a surface, when scoped",
      "An orthophoto from the flight",
      "A LiDAR point cloud, when LiDAR is the sensor",
      "Ground control targets, documented with the deliverable",
    ],
    capture:
      "A licensed pilot flies an FAA-registered aircraft in planned strips. Control points on the ground tie the flight to the survey. A professional surveyor and mapper is responsible for the control, the mapping, and any sealed drawing.",
    separateFrom:
      "A flight measures the surface. It becomes a survey product when the control, the mapping, and the seal are part of the scope. It does not replace monuments when you need a property line.",
    readyIf: ["Site location and approximate acreage or length", "LiDAR, photos, or both", "The files the engineer wants"],
    quoteTo: "/quote?intent=scan&method=drone",
  },
];

export function serviceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}

export const chooser: { say: string; slug: string }[] = [
  { say: "Buying or selling a house", slug: "improvements" },
  { say: "Flood insurance", slug: "elevation" },
  { say: "Where is my line?", slug: "boundary" },
  { say: "Commercial closing", slug: "alta" },
  { say: "Drainage or a site plan", slug: "topographic" },
  { say: "Build what the plans show", slug: "construction" },
  { say: "Record what got built", slug: "as-built" },
  { say: "A site with phases", slug: "development" },
  { say: "A road or a corridor", slug: "roads" },
  { say: "The shore or a canal", slug: "waterways" },
  { say: "A building or plant in detail", slug: "terrestrial" },
  { say: "A large or long site", slug: "drone" },
];

export const glossary: { term: string; def: string }[] = [
  {
    term: "Monument",
    def: "A marker in the ground — an iron pin, a concrete monument, a nail — used to identify a corner.",
  },
  {
    term: "Encroachment",
    def: "A fence, building, driveway, or other improvement that crosses a line or an easement.",
  },
  {
    term: "Easement",
    def: "A right to use part of a property for a stated purpose, such as utilities or a shared drive. A title commitment lists the ones an ALTA is asked to plot.",
  },
  {
    term: "Title commitment",
    def: "The title company’s list of documents and exceptions for a closing. An ALTA survey is drawn to it.",
  },
  {
    term: "Contour",
    def: "A line of equal elevation. Contours show how the ground falls, which is what a designer needs for drainage and grading.",
  },
  {
    term: "Point cloud",
    def: "The measured points from a laser scanner or drone LiDAR. A drawing is traced from the cloud. The cloud itself is a deliverable when the engineer wants the file.",
  },
  {
    term: "PSM",
    def: "Professional Surveyor and Mapper. In Florida, the licensed person who signs and seals a survey.",
  },
  {
    term: "Parcel ID",
    def: "The property appraiser’s number for a tax parcel. It helps us find the lot. The county map that shows it is not a survey.",
  },
];

export const priceFactors = [
  "The size and shape of the lot, and whether it is a platted lot or a metes-and-bounds tract",
  "What the deeds and prior surveys show, and whether the corners are already monumented",
  "Waterfront, a busy road, or improvements that are hard to see",
  "A closing date that compresses the schedule",
  "Added products: an elevation certificate, CAD, contours, or a point cloud",
  "For an ALTA, the title commitment and which Table A items are checked",
  "For scanning or a drone flight, the acreage and the files the designer wants",
];

export const bringList: { name: string; detail: string }[] = [
  {
    name: "The street address",
    detail: "This is the one thing we need. Add the city and county when the address is new or rural.",
  },
  {
    name: "The reason",
    detail: "Closing, a fence, flood insurance, design, staking, a scan. Ordinary words are enough.",
  },
  {
    name: "A date, if one exists",
    detail: "A real closing date is how the office decides what can be scheduled.",
  },
  {
    name: "Parcel ID",
    detail: "It is on the tax bill, or on the county property appraiser site. Helpful, and not required to start.",
  },
  {
    name: "A deed, prior survey, or title commitment",
    detail: "Send it if you have it. Many residential jobs can still be priced from the address.",
  },
  {
    name: "Plans, for staking or an as-built",
    detail: "CAD is best. A PDF is enough to start.",
  },
];

export const methods = [
  {
    num: "01",
    title: "On the ground",
    text: "GPS and a total station, after the deeds and plats are pulled. This is how corners are recovered, improvements are tied, and stakes are set.",
  },
  {
    num: "02",
    title: "Terrestrial scanning",
    text: "A laser scanner on a tripod. Buildings, plants, and tight sites become a point cloud, then a drawing. The cloud is delivered when you want the file.",
  },
  {
    num: "03",
    title: "Drone LiDAR and photos",
    text: "Strips flown over tracts, roads, stockpiles, and shorelines. Ground control is set when the map has to hold survey accuracy.",
  },
];

export const steps = [
  {
    num: "1",
    title: "You send the address and the reason",
    text: "The form takes a couple of minutes. A deed or a parcel ID can follow. If you are unsure of the product name, say what you are trying to do.",
  },
  {
    num: "2",
    title: "We name the survey and send a price",
    text: "Everyday residential jobs can usually be priced from the address and the records. Scanning, roads, ALTAs, and development may need the plans or a short call. Nothing is scheduled until the scope and the price are confirmed.",
  },
  {
    num: "3",
    title: "The crew measures, stakes, or scans",
    text: "The method follows the question: monuments and improvements on the ground, a scanner where the site is dense, a drone where the site is large or long.",
  },
  {
    num: "4",
    title: "Drafting, a check, and the deliverable",
    text: "The office drafts the survey, checks it against the records, and a Florida professional surveyor and mapper seals the products that require a seal. CAD, surfaces, and point clouds go out when they are in the scope.",
  },
];
