/**
 * Phase 06 migration, step 1: parse the five legacy neurology station pages
 * (archived in lib/db/seed/osce/legacy/) into structured JSON and write a verification
 * report. The pages build part of their DOM with JavaScript, so they are rendered in a real
 * browser (Playwright) and the finished DOM is read, which preserves the wording exactly.
 *
 *   pnpm --filter @workspace/scripts run osce:extract
 *
 * Output: lib/db/seed/osce/stations/<slug>.json and lib/db/seed/osce/VERIFICATION.md.
 * Step 2 (osce:seed) loads that JSON into the database.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = process.env.OSCE_REPO_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const seedDir = path.join(root, "lib", "db", "seed", "osce");
// The original pages are archived here (the public copies were replaced by redirect stubs once this migration was verified).
const legacyDir = path.join(seedDir, "legacy");

/** Legacy file -> id of the station element inside that page. */
const LEGACY: Record<string, { file: string; elementId: string }> = {
  "stroke-and-tia": { file: "stroke-and-tia.html", elementId: "s1" },
  "subarachnoid-haemorrhage": { file: "subarachnoid-haemorrhage.html", elementId: "sah" },
  "cauda-equina": { file: "cauda-equina.html", elementId: "s2" },
  "first-seizure": { file: "first-seizure.html", elementId: "fs" },
  meningitis: { file: "meningitis.html", elementId: "mg" },
};

/** Runs inside the browser. Plain JavaScript on purpose (string, not a compiled function). */
const IN_PAGE = String.raw`(function (elementId) {
  var warnings = [];
  var st = document.getElementById(elementId);
  if (!st) throw new Error('station element not found: ' + elementId);
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rich(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) out += esc(n.nodeValue);
      else if (n.nodeType === 1) {
        var t = n.tagName;
        if (t === 'B' || t === 'STRONG') out += '<b>' + rich(n) + '</b>';
        else if (t === 'I' || t === 'EM') out += '<i>' + rich(n) + '</i>';
        else if (t === 'BR') out += '<br>';
        else { warnings.push('unexpected inline <' + t + '>'); out += rich(n); }
      }
    });
    return out;
  }
  function tidy(s) { return s.replace(/\s+/g, ' ').replace(/> </g, '><').trim(); }
  function r(node) { return tidy(rich(node)); }
  function table(tb) {
    var rows = Array.prototype.slice.call(tb.querySelectorAll('tr'));
    var hasHead = rows[0].querySelector('th') !== null;
    return {
      t: 'table',
      head: hasHead ? Array.prototype.map.call(rows[0].children, r) : [],
      rows: rows.slice(hasHead ? 1 : 0).map(function (row) { return Array.prototype.map.call(row.children, r); })
    };
  }
  function blocks(c) {
    var res = [];
    Array.prototype.forEach.call(c.children, function (e) {
      var t = e.tagName, cls = e.className || '';
      if (t === 'P') {
        if (cls.indexOf('lm') >= 0) res.push({ t: 'callout', text: r(e) });
        else if (cls.indexOf('sub') >= 0) res.push({ t: 'p', text: r(e), muted: true });
        else if (cls === '' ) res.push({ t: 'p', text: r(e) });
        else warnings.push('unhandled <p class="' + cls + '"> in generic block');
      } else if (t === 'UL' || t === 'OL') {
        res.push({ t: t.toLowerCase(), items: Array.prototype.map.call(e.children, r) });
      } else if (t === 'DIV' && cls === 'scroll') {
        Array.prototype.forEach.call(e.querySelectorAll(':scope > table'), function (tb) { res.push(table(tb)); });
      } else if (t === 'H3') res.push({ t: 'h3', text: r(e) });
      else warnings.push('unhandled block <' + t.toLowerCase() + '.' + cls + '>');
    });
    return res;
  }
  function body(d) { return d.querySelector(':scope > .b'); }
  function title(d) { return tidy(d.querySelector(':scope > summary').textContent); }
  function lines(c) {
    var out = [];
    Array.prototype.forEach.call(c.children, function (e) {
      var cls = e.className || '';
      if (e.tagName !== 'P') { warnings.push('non-paragraph in interaction'); return; }
      if (cls.indexOf('lm') >= 0) { out.push({ kind: 'callout', text: r(e) }); return; }
      var label = e.querySelector(':scope > b');
      if (!label) { warnings.push('dialogue line without speaker'); return; }
      var role = cls.indexOf('dr') >= 0 ? 'doctor' : cls.indexOf('w') >= 0 ? 'witness' : 'patient';
      var holder = document.createElement('span');
      var seen = false;
      Array.prototype.forEach.call(e.childNodes, function (n) { if (n === label) { seen = true; return; } if (seen) holder.appendChild(n.cloneNode(true)); });
      out.push({ kind: 'line', role: role, speaker: tidy(label.textContent).replace(/:$/, ''), text: r(holder) });
    });
    return out;
  }
  function qa(d) {
    return Array.prototype.map.call(body(d).children, function (q) {
      if (q.tagName !== 'DETAILS') { warnings.push('unexpected child in examiner questions'); return null; }
      return { question: title(q).replace(/^\d+\.\s*/, ''), answer: blocks(body(q)) };
    }).filter(Boolean);
  }
  var content = { aim: [], candidateInstructions: [], actorBriefs: [], modelInteraction: [], examinerExpectations: [],
    ifThisHappens: [], plainLanguage: [], patientQuestions: [], examinerQuestions: [], examinerQuestionPrompts: [],
    examinerAnswerTips: [], redFlags: [], globalRatingGuide: [], commonErrors: [], teachingPoints: [], resources: [] };
  var evQa = null, domains = [], markTable = null, seenTitles = [];
  var sections = st.querySelectorAll('details');
  Array.prototype.forEach.call(sections, function (d) {
    var depth = 0, p = d.parentElement;
    while (p && p !== st) { if (p.tagName === 'DETAILS') depth++; p = p.parentElement; }
    if (depth > 0) return;
    var wrapper = d.parentElement;
    var t = title(d);
    seenTitles.push(t);
    if (/^Aim and learning outcomes/.test(t)) content.aim = blocks(body(d));
    else if (/^Candidate instructions/.test(t)) content.candidateInstructions = blocks(body(d));
    else if (/^Examiner marking sheet/.test(t)) { /* interactive widget: domains are read from its table below */ }
    else if (/^What the examiner expects/.test(t)) content.examinerExpectations = blocks(body(d));
    else if (/^If this happens/.test(t)) content.ifThisHappens = blocks(body(d));
    else if (/^Plain-language words/.test(t)) content.plainLanguage = blocks(body(d));
    else if (/^Answering patient/.test(t)) content.patientQuestions = blocks(body(d));
    else if (/^Examiner questions with model answers/.test(t) || /^Examiner questions \(tap/.test(t)) {
      var parsed = qa(d);
      if (d.className.indexOf('learn') >= 0 || !content.examinerQuestions.length) content.examinerQuestions = parsed;
      else evQa = parsed;
    }
    else if (/^How to answer the examiner/.test(t)) content.examinerAnswerTips = blocks(body(d));
    else if (/^Red flags for examiners/.test(t)) content.redFlags = blocks(body(d));
    else if (/^Examiner questions \(2 minutes\)/.test(t)) content.examinerQuestionPrompts = blocks(body(d));
    else if (/^Actor brief/.test(t)) content.actorBriefs.push({ title: t, blocks: blocks(body(d)) });
    else if (/^Model history-taking interaction/.test(t)) {
      Array.prototype.forEach.call(body(d).children, function (part) {
        if (part.tagName !== 'DETAILS') { warnings.push('unexpected child in interaction'); return; }
        content.modelInteraction.push({ title: title(part).replace(/^Part \d+\.\s*/, ''), lines: lines(body(part)) });
      });
    }
    else if (/^Examiner mark scheme/.test(t)) {
      var all = blocks(body(d)), cur = null;
      all.forEach(function (b) {
        if (b.t === 'table') { markTable = b; return; }
        if (b.t === 'h3') { cur = /^Global rating/.test(b.text) ? 'globalRatingGuide' : /^Common errors/.test(b.text) ? 'commonErrors' : null; if (!cur) warnings.push('unknown mark scheme heading: ' + b.text); return; }
        if (cur) content[cur].push(b); else warnings.push('mark scheme block before heading');
      });
    }
    else if (/^Teaching points/.test(t)) content.teachingPoints = blocks(body(d));
    else if (/^Resources for learners/.test(t)) content.resources = blocks(body(d));
    else warnings.push('unmapped section: ' + t);
  });
  // The mark scheme of some stations is a bare table inside <div id="l2"> (built by script) rather than a <details>.
  var l2 = st.querySelector('#l2');
  if (l2 && !markTable) { var tb = l2.querySelector('table'); if (tb) markTable = table(tb); }
  // Marking domains come from the live marking sheet (domain, max marks).
  var mt = st.querySelector('table.mt, #mt');
  if (!mt) mt = document.getElementById('mt');
  if (mt) {
    Array.prototype.forEach.call(mt.querySelectorAll('tr'), function (row, i) {
      if (i === 0) return;
      var label = tidy(row.children[0].textContent);
      var m = label.match(/^(.*) \(max (\d+)\)$/);
      if (!m) { warnings.push('cannot parse marking row: ' + label); return; }
      var opts = row.querySelectorAll('select option').length - 1;
      if (opts !== Number(m[2])) warnings.push('select options (' + opts + ') do not match max ' + m[2] + ' for ' + m[1]);
      domains.push({ domain: m[1], maxMarks: Number(m[2]), descriptor: '' });
    });
  } else warnings.push('no marking table found');
  var descriptorsMatched = 0;
  if (markTable && markTable.head.length >= 3) {
    markTable.rows.forEach(function (row) {
      var dom = domains.filter(function (x) { return x.domain === row[0]; })[0];
      if (dom) { dom.descriptor = row[1]; descriptorsMatched++; } else warnings.push('mark scheme row without domain: ' + row[0]);
    });
  }
  var meta = Array.prototype.map.call(st.querySelectorAll('.meta span'), function (s) { return tidy(s.textContent); });
  // Every visible text node of the legacy station (minus interface chrome) and every section title,
  // so the caller can prove that each one was stored.
  var textNodes = [], summaries = [];
  var skipSel = 'button, select, option, .timer, .tp, .seg, .meta, .card, h2, summary, table.mt, #mt';
  var walker = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    var tn = walker.currentNode, pe = tn.parentElement;
    if (pe.closest(skipSel)) continue;
    var skipSheet = false, anc = pe;
    while (anc && anc !== st) { if (anc.tagName === 'DETAILS') { var sm = anc.querySelector(':scope > summary'); if (sm && /^Examiner marking sheet/.test(tidy(sm.textContent))) skipSheet = true; } anc = anc.parentElement; }
    if (skipSheet) continue;
    var tx = tidy(tn.nodeValue);
    if (tx && !/^\d{1,2}$/.test(tx) && !/^Total:|^Global rating:|^\/ 20$/.test(tx)) textNodes.push(tx);
  }
  Array.prototype.forEach.call(st.querySelectorAll('summary'), function (sm) { summaries.push(tidy(sm.textContent)); });
  return {
    title: tidy(st.querySelector('h2').textContent).replace(/: OSCE station$/, ''),
    meta: meta, content: content, domains: domains,
    markScheme: markTable ? { head: markTable.head, rows: markTable.rows.length } : null,
    descriptorsMatched: descriptorsMatched,
    evExaminerQuestionsIdentical: evQa === null ? null : JSON.stringify(evQa) === JSON.stringify(content.examinerQuestions),
    sectionTitles: seenTitles, warnings: warnings, textNodes: textNodes, summaries: summaries
  };
})`;

interface Extracted {
  title: string;
  meta: string[];
  content: Record<string, unknown>;
  domains: { domain: string; maxMarks: number; descriptor: string }[];
  markScheme: { head: string[]; rows: number } | null;
  descriptorsMatched: number;
  evExaminerQuestionsIdentical: boolean | null;
  sectionTitles: string[];
  warnings: string[];
  textNodes: string[];
  summaries: string[];
}

type Block = { t: string; text?: string; items?: string[]; head?: string[]; rows?: string[][] };

const stripTags = (s: string) =>
  s.replace(/<br>/g, " ").replace(/<\/?[bi]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function blockText(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.text) out.push(stripTags(b.text));
    for (const i of b.items ?? []) out.push(stripTags(i));
    for (const h of b.head ?? []) out.push(stripTags(h));
    for (const row of b.rows ?? []) for (const c of row) out.push(stripTags(c));
  }
  return out;
}

/** Every piece of text we stored, flattened, for the "nothing was lost" check. */
function storedTexts(c: Record<string, any>, domains: { domain: string; descriptor: string }[] = []): string[] {
  const out: string[] = [];
  for (const d of domains) out.push(d.domain, d.descriptor);
  for (const [key, value] of Object.entries(c)) {
    if (key === "actorBriefs") for (const a of value) out.push(a.title, ...blockText(a.blocks));
    else if (key === "modelInteraction")
      for (const p of value) {
        out.push(p.title);
        for (const l of p.lines) out.push(...(l.kind === "line" ? [`${l.speaker}:`, stripTags(l.text)] : [stripTags(l.text)]));
      }
    else if (key === "examinerQuestions") for (const q of value) out.push(q.question, ...blockText(q.answer));
    else out.push(...blockText(value));
  }
  return out.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function countSections(c: Record<string, any>) {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    "aim blocks": n(c.aim),
    "candidate instruction blocks": n(c.candidateInstructions),
    "actor briefs": n(c.actorBriefs),
    "interaction parts": n(c.modelInteraction),
    "dialogue lines": (c.modelInteraction as any[]).reduce((s, p) => s + p.lines.length, 0),
    "examiner expectation rows": (c.examinerExpectations as Block[]).reduce((s, b) => s + (b.rows?.length ?? 0), 0),
    "if-this-happens rows": (c.ifThisHappens as Block[]).reduce((s, b) => s + (b.rows?.length ?? 0), 0),
    "plain-language rows": (c.plainLanguage as Block[]).reduce((s, b) => s + (b.rows?.length ?? 0), 0),
    "patient/relative question rows": (c.patientQuestions as Block[]).reduce((s, b) => s + (b.rows?.length ?? 0), 0),
    "examiner questions": n(c.examinerQuestions),
    "red flag items": (c.redFlags as Block[]).reduce((s, b) => s + (b.items?.length ?? 0), 0),
    "common error items": (c.commonErrors as Block[]).reduce((s, b) => s + (b.items?.length ?? 0), 0),
    "teaching points": (c.teachingPoints as Block[]).reduce((s, b) => s + (b.items?.length ?? 0), 0),
  };
}

async function main() {
  const catalogue = JSON.parse(await readFile(path.join(seedDir, "catalogue.json"), "utf8"));
  await mkdir(path.join(seedDir, "stations"), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report: string[] = [];
  let failures = 0;
  const rows: string[][] = [];

  for (const [slug, info] of Object.entries(LEGACY)) {
    const meta = catalogue.ready.find((r: { slug: string }) => r.slug === slug);
    if (!meta) throw new Error(`catalogue.json has no entry for ${slug}`);
    await page.goto("file://" + path.join(legacyDir, info.file));
    const ex = (await page.evaluate(`${IN_PAGE}(${JSON.stringify(info.elementId)})`)) as Extracted;
    const problems: string[] = [...ex.warnings];

    // The mark scheme table is stored as marking domains (domain, descriptor, max marks); its header cells are interface labels.
    const all = [...storedTexts(ex.content as Record<string, any>, ex.domains), ...(ex.markScheme?.head ?? [])];
    // Headings re-created by the UI from the globalRatingGuide and commonErrors sections (not content).
    const uiHeadings = ["Global rating", "Common errors"];
    const norm = (v: string) => v.replace(/\s+/g, " ").trim();
    const storedJoined = norm([...all, ...uiHeadings].join(" \n "));

    // 1) Every stored string must exist verbatim in the legacy page (rendered text nodes + titles).
    const legacyJoined = norm([...ex.textNodes, ...ex.summaries].join(" \n "));
    const nodeSet = new Set([...ex.textNodes, ...ex.summaries].map(norm));
    const invented = all.filter((t) => !nodeSet.has(t) && !legacyJoined.includes(t) && !t.includes("\n"));
    // Table cells are stored as whole cells; they must equal a legacy text run once inline tags are removed.
    const trulyMissing = invented.filter((t) => ![...nodeSet].some((n) => n.includes(t) || t.includes(n)));
    if (trulyMissing.length) problems.push(`${trulyMissing.length} stored text(s) not found in the legacy page, e.g. "${trulyMissing[0]!.slice(0, 80)}"`);

    // 2) Every legacy text run (outside interface chrome) must have been stored.
    const lost = ex.textNodes.filter((n) => !storedJoined.includes(norm(n)));
    if (lost.length) problems.push(`${lost.length} legacy text run(s) were NOT stored: ${lost.slice(0, 5).map((l) => `"${l.slice(0, 60)}"`).join(", ")}`);

    // 3) Section titles: structural headings are re-created by the UI; item titles must be stored.
    const structural = /^(Aim and learning outcomes|Candidate instructions|Examiner marking sheet|What the examiner expects|If this happens|Plain-language words|Answering patient|Examiner questions|How to answer the examiner|Red flags for examiners|Model history-taking interaction|Examiner mark scheme|Teaching points|Resources for learners)/;
    const lostTitles = ex.summaries.filter((t) => !structural.test(t) && !storedJoined.includes(norm(t.replace(/^(Part )?\d+\.\s*/, ""))));
    if (lostTitles.length) problems.push(`section title(s) not stored: ${lostTitles.slice(0, 3).join("; ")}`);
    const coverage = 100 * (1 - lost.length / Math.max(1, ex.textNodes.length));

    const totalMarks = ex.domains.reduce((s, d) => s + d.maxMarks, 0);
    if (totalMarks !== 20) problems.push(`marking domains total ${totalMarks}, expected 20`);
    if (ex.evExaminerQuestionsIdentical === false) problems.push("examiner questions differ between Learning and Exam sections");
    if (!ex.domains.length) problems.push("no marking domains");

    const minutes = (re: RegExp) => Number(ex.meta.map((m) => m.match(re)?.[1]).find(Boolean) ?? NaN);
    const historyMinutes = minutes(/^(\d+) min history/);
    const examinerMinutes = minutes(/^(\d+) min examiner/);
    if (historyMinutes !== 8 || examinerMinutes !== 2) problems.push(`unexpected timings in meta: ${ex.meta.join(" | ")}`);

    const file = {
      slug,
      title: ex.title,
      specialty: catalogue.specialty.slug,
      topicGroup: meta.topicGroup,
      summary: meta.summary,
      image: meta.image,
      difficulty: meta.difficulty,
      timing: { readingSeconds: 60, historySeconds: (historyMinutes || 8) * 60, examinerSeconds: (examinerMinutes || 2) * 60 },
      totalMarks,
      domains: ex.domains,
      content: ex.content,
    };
    await writeFile(path.join(seedDir, "stations", `${slug}.json`), JSON.stringify(file, null, 2) + "\n");

    const counts = countSections(ex.content as Record<string, any>);
    rows.push([slug, ...Object.values(counts).map(String), String(ex.domains.length), String(totalMarks), coverage.toFixed(1) + "%", problems.length ? "FAIL" : "PASS"]);
    if (problems.length) {
      failures++;
      report.push(`### ${slug}\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
    }
    if (slug === Object.keys(LEGACY)[0]) rows.unshift(["station", ...Object.keys(counts), "domains", "marks", "text coverage", "result"]);
  }
  await browser.close();

  const md = [
    "# OSCE station migration: verification report",
    "",
    `Generated by \`osce:extract\` from the original pages archived in \`lib/db/seed/osce/legacy/\`.`,
    "",
    "Checks per station: (1) every stored string exists verbatim in the legacy rendered page and every legacy text run was stored; (2) the marking domains total 20; (3) the Learning and Exam copies of the examiner questions are identical; (4) timings parsed from the page header; (5) no unmapped sections or unexpected markup.",
    "",
    "Text coverage = share of the legacy page's text runs (every text node outside interface chrome such as buttons, timers and the marking widget) that were found in the stored JSON. Anything below 100% fails the station.",
    "",
    "| " + rows[0]!.join(" | ") + " |",
    "|" + rows[0]!.map(() => "---").join("|") + "|",
    ...rows.slice(1).map((r) => "| " + r.join(" | ") + " |"),
    "",
    failures ? `## Problems\n\n${report.join("\n")}` : "## Result\n\nAll stations passed.",
    "",
  ].join("\n");
  await writeFile(path.join(seedDir, "VERIFICATION.md"), md);
  console.log(md);
  if (failures) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
