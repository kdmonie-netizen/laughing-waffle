// Satellite health from the operators, so PDOP and "satellites in view" count
// only satellites a receiver will actually use.
//
//  * GPS, two US Coast Guard NAVCEN files:
//      - the Satellite Outage File (current_sof.sof, XML, ICD-GPS-240): every
//        outage with its start and END. This is the authority.
//      - the GPS Operational Advisory (current_opsadvisory.oa1, text): used for
//        SCHEDULED outages that haven't happened yet (FCSTDV, FCSTMX, ...).
//    Found 4 Nov 2026: the advisory kept listing PRN 11 and PRN 25 as
//    "unusable until further notice" months after the outage file had closed
//    both outages (same day, NANUs 2026049 / 2026069) and NAVCEN's own status
//    page showed them healthy. So an advisory's open-ended "until further
//    notice" line (UNUSUFN, UNUNOREF, FCSTUUFN, and FCSTEXTD: a scheduled
//    outage extended with no end) excludes a satellite only when the outage
//    file is loaded and has no later notice for it; without the outage file it
//    is shown, not applied. The outage file only holds FINISHED outages, so an
//    outage still running is known only from the advisory.
//    A scheduled window (FCSTDV/FCSTMX/FCSTRESCD/UNUSABLE) is closed only by a
//    later notice that overlaps it (its summary or cancellation), never by an
//    unrelated later outage of the same satellite.
//  * Galileo: the European GNSS Service Centre constellation table (HTML).
//    Any status other than USABLE is excluded.
//
// None of these sites sends CORS headers, so the page reaches them through
// the local server's /api/proxy (desktop app / npm start). Where that isn't
// available (GitHub Pages) the lists are missing, every satellite counts as
// before, and the page says so.
//
// Leaving a healthy satellite out makes PDOP look worse than it is, so
// anything unclear is shown and NOT applied.

const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

export const GPS_OPEN = new Set(['UNUSUFN', 'UNUNOREF', 'FCSTUUFN', 'FCSTEXTD']);
export const GPS_WINDOW = new Set(['UNUSABLE', 'FCSTDV', 'FCSTMX', 'FCSTRESCD']);

export const NANU_WORDS = {
  UNUSUFN: 'unusable until further notice',
  UNUNOREF: 'unusable, no reference time',
  FCSTUUFN: 'scheduled to be unusable until further notice',
  UNUSABLE: 'unusable',
  FCSTDV: 'scheduled outage (orbit adjustment)',
  FCSTMX: 'scheduled outage (maintenance)',
  FCSTRESCD: 'scheduled outage (rescheduled)',
  FCSTEXTD: 'scheduled outage extended',
  FCSTSUMM: 'outage (finished)',
  FCSTCANC: 'scheduled outage cancelled',
  USABINIT: 'newly usable',
  LAUNCH: 'launched',
  DECOM: 'decommissioned',
  GENERAL: 'general notice',
};

/** "302/2100" in the given year → Date (UTC). */
function jdayTime(year, s) {
  const m = /^(\d{1,3})\/(\d{4})$/.exec(s || '');
  if (!m) return null;
  return new Date(Date.UTC(year, 0, +m[1], +m[2].slice(0, 2), +m[2].slice(2)));
}

/**
 * Parse the NAVCEN GPS Operational Advisory.
 * @returns {{issued: Date|null, notices: Array<{section, nanu, sent, prn, type, start, stop, words}>}}
 */
export function parseNavcenOA(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let issued = null;
  const head = lines.find((l) => /SUBJ:\s*GPS STATUS/i.test(l));
  const hm = head && /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i.exec(head);
  if (hm && MONTHS[hm[2].toUpperCase()] !== undefined) issued = new Date(Date.UTC(+hm[3], MONTHS[hm[2].toUpperCase()], +hm[1]));
  const notices = [];
  let section = null;
  for (const line of lines) {
    const sec = /^\s*([ABC])\.\s+(FORECASTS|ADVISORIES|GENERAL)/i.exec(line);
    if (sec) {
      section = sec[2].toLowerCase();
      continue;
    }
    if (!section) continue;
    // 2026097       231613Z OCT 2026    18   FCSTDV       302/2100-303/0900
    const m = /^\s*(\d{7})\s+(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})\s+(\d{4})\s+(\d{1,2})?\s+([A-Z]+)\s+(\S*)\s*$/.exec(line);
    if (!m) continue;
    const mon = MONTHS[m[5].toUpperCase()];
    if (mon === undefined) continue;
    const sent = new Date(Date.UTC(+m[6], mon, +m[2], +m[3], +m[4]));
    const [a, b] = (m[9] || '').split('-');
    let start = jdayTime(+m[6], a);
    // A start more than half a year from the message is in the neighbouring
    // year: a December message about a January outage, or a January message
    // about a late-December one.
    if (start && start < sent - 182 * 86400000) start = jdayTime(+m[6] + 1, a);
    else if (start && start > +sent + 182 * 86400000) start = jdayTime(+m[6] - 1, a);
    let stop = start ? jdayTime(start.getUTCFullYear(), b) : null;
    if (stop && start && stop < start) stop = jdayTime(start.getUTCFullYear() + 1, b);
    notices.push({ section, nanu: m[1], sent, prn: m[7] ? +m[7] : null, type: m[8], start, stop, words: NANU_WORDS[m[8]] || m[8].toLowerCase() });
  }
  return { issued, notices };
}

/**
 * Parse the NAVCEN Satellite Outage File: every element with an SVID and a
 * START_* time is an outage. A missing END means it is still going on.
 */
export function parseSof(xml) {
  const src = String(xml || '');
  const created = /<CREATION\s+YEAR="(\d{4})"\s+DOY="(\d{1,3})"\s+HR="(\d{1,2})"\s+MIN="(\d{1,2})"/.exec(src);
  const out = [];
  for (const m of src.matchAll(/<([A-Z_]+)\s([^>]*?\bSVID="\d+"[^>]*?)\/?>/g)) {
    const at = {};
    for (const a of m[2].matchAll(/([A-Z_]+)="([^"]*)"/g)) at[a[1]] = a[2];
    const t = (p) =>
      at[`${p}_YEAR`] && at[`${p}_DOY`]
        ? new Date(Date.UTC(+at[`${p}_YEAR`], 0, +at[`${p}_DOY`], +(at[`${p}_HR`] || 0), +(at[`${p}_MIN`] || 0), +(at[`${p}_SEC`] || 0)))
        : null;
    const start = t('START');
    if (!start) continue;
    out.push({ kind: m[1], prn: +at.SVID, svn: at.SVN ? +at.SVN : null, type: at.TYPE || '', ref: at.REFERENCE || '', start, end: t('END') });
  }
  return {
    created: created ? new Date(Date.UTC(+created[1], 0, +created[2], +created[3], +created[4])) : null,
    outages: out,
  };
}

/** Parse the GSC constellation table → [{name, svid, clock, status, nagu, naguType, subject}]. */
export function parseGalileoStatus(html) {
  const src = String(html || '');
  const strip = (s) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  const out = [];
  for (const row of src.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => strip(c[1]));
    if (cells.length < 4 || !/^GSAT\d{4}$/i.test(cells[0])) continue;
    out.push({ name: cells[0].toUpperCase(), svid: cells[1], clock: cells[2], status: cells[3].toUpperCase(), nagu: cells[4] || '', naguType: cells[5] || '', subject: cells[6] || '' });
  }
  return out;
}

/** PRN number from a CelesTrak GPS name, e.g. "GPS BIII-5  (PRN 11)" → 11. */
export const gpsPrn = (name) => {
  const m = /\(PRN\s*(\d+)\)/i.exec(name || '');
  return m ? +m[1] : null;
};
/** "GSAT0201 (GALILEO 5)" → "GSAT0201". */
export const galileoId = (name) => {
  const m = /^(GSAT\d{4})/i.exec((name || '').trim());
  return m ? m[1].toUpperCase() : null;
};

const prnLabel = (prn) => `PRN ${String(prn).padStart(2, '0')}`;

/**
 * Turn whatever loaded into GPS outage windows + Galileo exclusions.
 * Each window: {prn, start, end|null, why, source, nanu}.
 */
export function gpsWindows({ oa = null, sof = null } = {}) {
  const windows = [];
  const notes = [];
  for (const o of sof?.outages || []) windows.push({ prn: o.prn, start: o.start, end: o.end, why: NANU_WORDS[o.type] || o.type.toLowerCase(), source: 'outage file', nanu: o.ref });
  const notices = (oa?.notices || []).filter((n) => n.prn != null && n.start);
  // A later notice for the same satellite in the outage file (or a later
  // summary / cancellation in the advisory) closes an advisory line.
  const closedBySof = (n) => (sof?.outages || []).some((o) => o.prn === n.prn && o.ref > n.nanu);
  const overlaps = (o, n) => o.start < n.stop && (!o.end || o.end > n.start);
  const windowClosedBySof = (n) => (sof?.outages || []).some((o) => o.prn === n.prn && o.ref > n.nanu && overlaps(o, n));
  const windowClosedByOa = (n) => notices.some((m) => m.prn === n.prn && (m.type === 'FCSTSUMM' || m.type === 'FCSTCANC') && m.nanu > n.nanu && m.start && overlaps({ start: m.start, end: m.stop }, n));
  const closedByOa = (n) => notices.some((m) => m.prn === n.prn && (m.type === 'FCSTSUMM' || m.type === 'FCSTCANC') && m.nanu > n.nanu);
  const inSof = (n) => (sof?.outages || []).some((o) => o.ref === n.nanu);
  for (const n of notices) {
    if (inSof(n)) continue; // already counted from the outage file
    if ((GPS_WINDOW.has(n.type) || GPS_OPEN.has(n.type)) && n.stop) {
      // a window with an end time: closed only by an overlapping later notice
      if (!windowClosedBySof(n) && !windowClosedByOa(n)) windows.push({ prn: n.prn, start: n.start, end: n.stop, why: n.words, source: 'advisory', nanu: n.nanu });
    } else if (GPS_OPEN.has(n.type)) {
      if (closedByOa(n)) continue;
      if (sof && !closedBySof(n)) windows.push({ prn: n.prn, start: n.start, end: null, why: n.words, source: 'advisory', nanu: n.nanu });
      else if (!sof) notes.push({ constellation: 'GPS', id: prnLabel(n.prn), why: `${n.words} in NAVCEN's advisory (not applied: the outage file that confirms it didn't load)`, since: n.start, until: null, nanu: n.nanu });
    }
  }
  return { windows, notes };
}

/**
 * Build the health picture from whatever loaded.
 * @returns {{usable: (sat, t) => boolean, known: {GPS: boolean, Galileo: boolean}, excludedNow: Array, scheduled: Array, notes: Array, key: string}}
 */
export function buildHealth({ oa = null, sof = null, galileo = null } = {}, now = new Date()) {
  const { windows, notes } = gpsWindows({ oa, sof });
  const byPrn = new Map();
  for (const w of windows) byPrn.set(w.prn, [...(byPrn.get(w.prn) || []), w]);
  const out = (w, t) => t >= w.start && (!w.end || t < w.end);
  const galBad = new Map((galileo || []).filter((g) => g.status !== 'USABLE').map((g) => [g.name, g]));
  const usable = (sat, t) => {
    if (sat.constellation === 'GPS') {
      const prn = gpsPrn(sat.name);
      return prn == null || !(byPrn.get(prn) || []).some((w) => out(w, t));
    }
    if (sat.constellation === 'Galileo') {
      const id = galileoId(sat.name);
      return !id || !galBad.has(id);
    }
    return true;
  };
  const excludedNow = [];
  const scheduled = [];
  const horizon = +now + 7 * 86400000;
  for (const w of windows) {
    const item = { constellation: 'GPS', id: prnLabel(w.prn), why: w.why, since: w.start, until: w.end, nanu: w.nanu, source: w.source };
    if (out(w, now)) excludedNow.push(item);
    else if (w.start > now && w.start < horizon) scheduled.push(item);
  }
  for (const g of galBad.values()) excludedNow.push({ constellation: 'Galileo', id: `${g.svid} (${g.name})`, why: g.status.toLowerCase(), since: null, until: null, nanu: g.nagu, source: 'GSC' });
  scheduled.sort((a, b) => a.since - b.since);
  const key = [oa ? 'oa' : '-', sof ? 'sof' : '-', galileo ? 'gal' : '-', ...windows.map((w) => `${w.prn}:${+w.start}:${w.end ? +w.end : ''}`), ...galBad.keys()].join('|');
  return { usable, known: { GPS: !!(oa || sof), GPSconfirmed: !!sof, Galileo: !!galileo }, excludedNow, scheduled, notes, key };
}
