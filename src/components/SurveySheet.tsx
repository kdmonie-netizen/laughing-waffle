import { useState } from "react";

export type SheetMode = "mortgage" | "alta" | "topo" | "scan" | "drone" | "road" | "water";

const SHEETS: {
  id: SheetMode;
  label: string;
  title: string;
  caption: string;
  scale: string;
}[] = [
  {
    id: "mortgage",
    label: "Mortgage",
    title: "Boundary with improvements",
    caption:
      "A closing survey locates the lot and shows the house, driveway, and fences against the lines.",
    scale: 'SCALE 1" = 20\'',
  },
  {
    id: "alta",
    label: "ALTA",
    title: "ALTA/NSPS land title survey",
    caption: "An ALTA adds easements, access, and the items in the title commitment.",
    scale: 'SCALE 1" = 30\'',
  },
  {
    id: "topo",
    label: "Topo",
    title: "Topographic survey",
    caption: "Contours and spot elevations give a designer the shape of the ground.",
    scale: 'CI = 1\'',
  },
  {
    id: "scan",
    label: "Scan",
    title: "Terrestrial scan",
    caption: "A scanner on the ground collects a dense cloud. The drawing is prepared from it.",
    scale: "POINT CLOUD",
  },
  {
    id: "drone",
    label: "Drone",
    title: "Drone LiDAR",
    caption: "Flight lines cover a large or long site. Targets on the ground tie the flight to control.",
    scale: 'SCALE 1" = 50\'',
  },
  {
    id: "road",
    label: "Road",
    title: "Road and right-of-way",
    caption: "A corridor survey follows the centerline, the edges, and the right-of-way.",
    scale: "STA 10+00",
  },
  {
    id: "water",
    label: "Water",
    title: "Shoreline and bulkhead",
    caption: "The upland, the bulkhead, and the water’s edge are located in the field. Depths are a separate scope.",
    scale: 'SCALE 1" = 20\'',
  },
];

function show(mode: SheetMode, modes: SheetMode[]) {
  return modes.includes(mode) ? "layer on" : "layer";
}

export function SurveyExplorer() {
  const [mode, setMode] = useState<SheetMode>("mortgage");
  const sheet = SHEETS.find((item) => item.id === mode) ?? SHEETS[0];

  return (
    <div className="explorer">
      <figure className="sheet">
        <svg viewBox="0 0 400 520" role="img" aria-label={`${sheet.title}. Sample drawing, not a survey.`}>
          <rect x="12" y="12" width="376" height="496" fill="#fffdf8" stroke="#1a2332" strokeWidth="2" />
          <rect x="22" y="22" width="356" height="400" fill="none" stroke="#1a2332" strokeWidth="1" />

          <g className="north" aria-hidden="true">
            <circle cx="338" cy="58" r="18" fill="none" stroke="#1a2332" />
            <path d="M338 42 L342 60 L338 56 L334 60 Z" fill="#1a2332" />
            <text x="334" y="84" fontSize="9" fill="#1a2332">
              N
            </text>
          </g>

          <g className={show(mode, ["mortgage", "alta", "topo", "scan", "drone", "water"])}>
            <polygon points="78,118 292,96 322,286 96,318" fill="none" stroke="#1a2332" strokeWidth="1.7" />
            <text x="150" y="92" fontSize="9" fill="#5c5348">
              100.00'
            </text>
          </g>

          <g className={show(mode, ["mortgage", "alta", "topo", "scan", "water"])}>
            <rect x="156" y="168" width="92" height="68" fill="#f3efe6" stroke="#1a2332" strokeWidth="1.3" />
            <text x="178" y="206" fontSize="9" fill="#1a2332">
              HOUSE
            </text>
            <polygon points="196,236 248,236 270,286 214,292" fill="none" stroke="#1a2332" strokeWidth="1" />
          </g>

          <g className={show(mode, ["mortgage"])}>
            <line x1="78" y1="118" x2="96" y2="318" stroke="#c23b2e" strokeWidth="1.4" strokeDasharray="5 4" />
            <text x="40" y="220" fontSize="9" fill="#c23b2e" transform="rotate(-78 40 220)">
              FENCE
            </text>
          </g>

          <g className={show(mode, ["alta"])}>
            <polygon points="250,112 292,104 318,270 276,282" fill="rgba(194,59,46,0.08)" stroke="#c23b2e" strokeWidth="1" />
            <text x="248" y="150" fontSize="8" fill="#c23b2e">
              UTILITY ESM'T
            </text>
            <text x="168" y="262" fontSize="8" fill="#1a2332">
              ACCESS
            </text>
          </g>

          <g className={show(mode, ["topo"])} fill="none" stroke="#1f5a45" strokeWidth="1">
            <path d="M90 150 C 150 140, 210 170, 300 150" />
            <path d="M96 190 C 160 176, 220 210, 310 188" />
            <path d="M104 230 C 170 214, 230 248, 316 226" />
            <path d="M112 270 C 180 256, 236 286, 318 268" />
            <text x="300" y="146" fontSize="8" fill="#1f5a45">
              24
            </text>
            <text x="308" y="224" fontSize="8" fill="#1f5a45">
              22
            </text>
          </g>

          <g className={show(mode, ["scan"])} fill="#1a2332">
            {scanDots.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
            ))}
            <text x="150" y="146" fontSize="8" fill="#1a2332">
              SCAN SETUP
            </text>
          </g>

          <g className={show(mode, ["drone"])} fill="none" stroke="#1d4e73" strokeWidth="1.2">
            <path d="M110 140 H290" strokeDasharray="7 5" />
            <path d="M110 180 H290" strokeDasharray="7 5" />
            <path d="M110 220 H290" strokeDasharray="7 5" />
            <path d="M110 260 H290" strokeDasharray="7 5" />
            <g stroke="#c23b2e" strokeWidth="1.4">
              <path d="M120 150 l6 6 m0-6 l-6 6" />
              <path d="M250 210 l6 6 m0-6 l-6 6" />
              <path d="M170 270 l6 6 m0-6 l-6 6" />
            </g>
            <text x="126" y="132" fontSize="8" fill="#1d4e73">
              FLIGHT LINES
            </text>
          </g>

          <g className={show(mode, ["road"])}>
            <path d="M50 150 C 140 120, 240 190, 350 150" fill="none" stroke="#1a2332" strokeWidth="1.5" />
            <path d="M50 210 C 140 180, 240 250, 350 210" fill="none" stroke="#1a2332" strokeWidth="1.5" />
            <path d="M50 180 C 140 150, 240 220, 350 180" fill="none" stroke="#c23b2e" strokeWidth="1.2" strokeDasharray="6 5" />
            <text x="70" y="140" fontSize="8" fill="#1a2332">
              10+00
            </text>
            <text x="180" y="146" fontSize="8" fill="#1a2332">
              11+00
            </text>
            <text x="280" y="140" fontSize="8" fill="#1a2332">
              12+00
            </text>
            <text x="150" y="246" fontSize="8" fill="#5c5348">
              RIGHT-OF-WAY
            </text>
          </g>

          <g className={show(mode, ["water"])}>
            <path d="M250 120 C 270 160, 250 200, 276 250 C 292 286, 270 310, 300 330 L 360 330 L 360 110 Z" fill="#d7e7ea" stroke="#3d7a8c" />
            <path d="M252 124 C 274 168, 248 214, 278 268" fill="none" stroke="#1a2332" strokeWidth="2" />
            <text x="286" y="210" fontSize="8" fill="#1d4e73">
              WATER
            </text>
            <text x="214" y="150" fontSize="8" fill="#1a2332">
              BULKHEAD
            </text>
          </g>

          <line x1="22" y1="430" x2="378" y2="430" stroke="#1a2332" />
          <line x1="250" y1="430" x2="250" y2="496" stroke="#1a2332" />
          <text x="34" y="454" fontSize="13" fill="#1a2332" fontFamily="Georgia, serif">
            KJM LAND SURVEYING
          </text>
          <text x="34" y="472" fontSize="9" fill="#5c5348">
            SAMPLE SHEET — NOT A SURVEY
          </text>
          <text x="34" y="490" fontSize="10" fill="#1a2332">
            {sheet.title.toUpperCase()}
          </text>
          <text x="262" y="460" fontSize="9" fill="#1a2332">
            PENSACOLA, FL
          </text>
          <text x="262" y="478" fontSize="9" fill="#5c5348">
            {sheet.scale}
          </text>
          <text x="262" y="496" fontSize="9" fill="#5c5348">
            LB8298
          </text>
        </svg>
        <figcaption>
          <strong>{sheet.title}</strong>
          <span>{sheet.caption}</span>
        </figcaption>
      </figure>
      <div className="mode-row" role="group" aria-label="Sample survey drawings">
        {SHEETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="mode"
            aria-pressed={item.id === mode}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const scanDots: [number, number][] = [
  [150, 160],
  [168, 154],
  [186, 158],
  [204, 150],
  [222, 162],
  [240, 156],
  [146, 178],
  [164, 186],
  [182, 174],
  [210, 184],
  [228, 176],
  [246, 188],
  [154, 206],
  [176, 214],
  [198, 208],
  [220, 218],
  [238, 204],
  [160, 232],
  [190, 238],
  [214, 230],
  [236, 242],
  [140, 140],
  [260, 170],
  [132, 200],
  [268, 214],
  [148, 250],
  [252, 248],
];
