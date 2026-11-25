const $ = id => document.getElementById(id);
const STOP = new Set("the a an and or of to in on for with is are was were be been it this that as at by from not but have has had will can which their they you we our your its his her them these those into over than then also more most such other any all one two may would should could there where when what who how about after before between during each per via".split(" "));
const NOT_NAME = new Set("The This That These Those In On At For And But Or If When Where What Who How We You Our Your It They Dear Hello Thanks Regards Subject Date From To Invoice Total Amount Page".split(" "));
const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const PATTERNS = {
  "Emails": /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  "Phone numbers": /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)\d{3,5}[\s-]?\d{3,5}/g,
  "Links": /https?:\/\/[^\s<>"')]+/g,
  "Dates": new RegExp("\\b(?:\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|(?:" + MONTHS + ")[a-z]*\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}|\\d{1,2}(?:st|nd|rd|th)? (?:" + MONTHS + ")[a-z]*,? \\d{4})\\b", "gi"),
  "Amounts": /(?:₹|Rs\.?|INR|\$|€|£|USD)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|million|lakh|crore|bn))?/gi,
  "Percentages": /\b\d+(?:\.\d+)?\s?%/g
};

function uniq(arr){ return [...new Set(arr.map(s => s.trim()))].filter(Boolean); }

function extract(text){
  const fields = {};
  for (const [k, re] of Object.entries(PATTERNS)) {
    let m = text.match(re) || [];
    if (k === "Phone numbers") m = m.filter(p => { const d = p.replace(/\D/g, "").length; return d >= 10 && d <= 13 && !/^\d{4}-\d{2}-\d{2}$/.test(p.trim()); });
    fields[k] = uniq(m).slice(0, 25);
  }
  const names = {};
  (text.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,2}\b/g) || []).forEach(n => {
    if (!NOT_NAME.has(n.split(" ")[0])) names[n] = (names[n] || 0) + 1;
  });
  fields["Possible names & entities"] = Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);

  const words = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  const freq = {};
  words.forEach(w => { if (!STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]);

  const sentences = (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || []).map(s => s.trim()).filter(s => s.split(" ").length > 5);
  const scored = sentences.map((s, i) => {
    const w = s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    return { s, i, score: w.reduce((a, x) => a + (freq[x] || 0), 0) / Math.sqrt(w.length || 1) };
  });
  const summary = scored.sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.i - b.i).map(x => x.s);

  const wc = words.length;
  return { stats: { words: wc, sentences: sentences.length, readingMinutes: Math.max(1, Math.round(wc / 200)), characters: text.length }, summary, keywords, fields };
}

function chips(list){
  const box = document.createElement("div");
  if (!list.length) { box.className = "empty"; box.textContent = "Nothing found"; return box; }
  list.forEach(t => { const s = document.createElement("span"); s.className = "chip"; s.textContent = t; box.appendChild(s); });
  return box;
}

let lastResult = null;
function render(r){
  lastResult = r;
  $("out").hidden = false;
  $("stats").replaceChildren(...[["Words", r.stats.words], ["Sentences", r.stats.sentences], ["Reading time", r.stats.readingMinutes + " min"], ["Characters", r.stats.characters]].map(([l, v]) => {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = v;
    const s = document.createElement("span"); s.textContent = l;
    d.append(b, s); return d;
  }));
  const sm = $("summary"); sm.replaceChildren();
  if (r.summary.length) r.summary.forEach(s => { const p = document.createElement("p"); p.style.margin = "0 0 8px"; p.textContent = s; sm.appendChild(p); });
  else sm.appendChild(chips([]));
  $("keywords").replaceChildren(chips(r.keywords));
  $("fields").replaceChildren(...Object.entries(r.fields).map(([k, v]) => {
    const c = document.createElement("div"); c.className = "card"; c.style.margin = 0;
    const h = document.createElement("h2"); h.textContent = k + " (" + v.length + ")";
    c.append(h, chips(v)); return c;
  }));
  $("json").textContent = JSON.stringify(r, null, 2);
  $("out").scrollIntoView({ behavior: "smooth" });
}

async function readPdf(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    $("status").textContent = "Reading PDF page " + p + " of " + pdf.numPages + "…";
    const content = await (await pdf.getPage(p)).getTextContent();
    out += content.items.map(i => i.str).join(" ") + "\n";
  }
  return out;
}

async function handleFile(file){
  if (!file) return;
  $("status").textContent = "Reading " + file.name + "…";
  try {
    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
    if (isPdf && typeof pdfjsLib === "undefined") throw new Error("PDF reader failed to load");
    if (isPdf) pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const text = isPdf ? await readPdf(file) : await file.text();
    $("text").value = text;
    if (!text.trim()) { $("status").textContent = "No text found. Scanned PDFs need OCR, which this version doesn’t include."; return; }
    $("status").textContent = "Done: " + file.name;
    render(extract(text));
  } catch (e) {
    $("status").textContent = "Couldn’t read that file: " + e.message;
  }
}

$("drop").onclick = () => $("file").click();
$("drop").onkeydown = e => { if (e.key === "Enter" || e.key === " ") $("file").click(); };
$("file").onchange = e => handleFile(e.target.files[0]);
["dragenter", "dragover"].forEach(ev => $("drop").addEventListener(ev, e => { e.preventDefault(); $("drop").classList.add("over"); }));
["dragleave", "drop"].forEach(ev => $("drop").addEventListener(ev, e => { e.preventDefault(); $("drop").classList.remove("over"); }));
$("drop").addEventListener("drop", e => handleFile(e.dataTransfer.files[0]));

$("go").onclick = () => {
  const t = $("text").value;
  if (!t.trim()) { $("status").textContent = "Add a file or paste some text first."; return; }
  $("status").textContent = ""; render(extract(t));
};
$("clear").onclick = () => { $("text").value = ""; $("out").hidden = true; $("status").textContent = ""; $("file").value = ""; };
$("sample").onclick = () => {
  $("text").value = "Invoice INV-2026-0412 was issued by Meera Kulkarni of Orion Software Pvt Ltd on 14 March 2026. The total amount due is ₹1,25,000, including GST of 18%. Payment must reach us by 30/04/2026. For questions, contact accounts@orionsoft.example or call +91 98765 43210. Orion Software delivers document automation tools for finance teams, and this invoice covers the document automation licence for the first quarter. Details are available at https://orionsoft.example/billing. Rahul Deshmukh approved the purchase order on March 2, 2026, and a late fee of 2% applies to overdue payments.";
  $("go").click();
};
$("copy").onclick = async () => {
  const t = $("json").textContent;
  try { await navigator.clipboard.writeText(t); $("copy").textContent = "Copied"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("json")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("copy").textContent = "Selected, press Ctrl+C"; }
  setTimeout(() => $("copy").textContent = "Copy JSON", 2000);
};
