import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

const demoSuppliers = [
  {
    id: "demo-1",
    name: "Southline Aluminium Works (DEMO)",
    description: "Aluminium profile supplier candidate; verify exact grade and dimensions.",
    location: "Bengaluru, Karnataka",
    price: null,
    currency: "INR",
    leadTimeDays: null,
    specificationStatus: "needs_confirmation",
    deliveryStatus: "unverified",
    sourceUrl: "https://www.indiamart.com/",
    evidence: "Illustrative demo candidate only. No supplier quote or stock confirmation is represented."
  },
  {
    id: "demo-2",
    name: "Metro Industrial Profiles (DEMO)",
    description: "Potential alternative profile supplier; request a written quotation.",
    location: "Karnataka / South India",
    price: null,
    currency: "INR",
    leadTimeDays: null,
    specificationStatus: "needs_confirmation",
    deliveryStatus: "unverified",
    sourceUrl: "https://www.tradeindia.com/",
    evidence: "Illustrative demo candidate only. No supplier quote or stock confirmation is represented."
  },
  {
    id: "demo-3",
    name: "Precision Extrusions Hub (DEMO)",
    description: "Potential source to investigate for compatible extruded profiles.",
    location: "India",
    price: null,
    currency: "INR",
    leadTimeDays: null,
    specificationStatus: "partial",
    deliveryStatus: "unverified",
    sourceUrl: "https://www.google.com/search?q=aluminium+profile+suppliers+India",
    evidence: "Illustrative demo candidate only. Technical compatibility and commercial terms are unknown."
  }
];

function cleanText(value, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function scoreCandidate(candidate, requirements) {
  const spec = candidate.specificationStatus || "needs_confirmation";
  const hardSpecFail = spec === "mismatch";
  const quantity = Number(requirements.shortfallQuantity || 0);
  const budget = Number(requirements.budget || 0);
  const price = Number(candidate.price);
  const costKnown = Number.isFinite(price) && price > 0;
  const meetsBudget = !budget || !costKnown || price * quantity <= budget;

  const eligible = !hardSpecFail && meetsBudget;
  let score = 0;
  if (spec === "match") score += 35;
  else if (spec === "partial") score += 18;
  else score += 8;
  if (costKnown) score += meetsBudget ? 25 : 0;
  else score += 8;
  if (candidate.deliveryStatus === "verified_feasible") score += 20;
  else score += 5;
  if (candidate.certificationStatus === "verified") score += 10;
  else score += 3;
  if (candidate.location && /bengaluru|bangalore|karnataka/i.test(candidate.location)) score += 10;
  else score += 4;
  return { ...candidate, eligible, score: Math.min(100, score), costKnown, meetsBudget };
}

async function tinyfishSearch(query) {
  const url = "https://api.search.tinyfish.ai?query=" + encodeURIComponent(query);
  const response = await fetch(url, {
    headers: { "X-API-Key": TINYFISH_API_KEY, "Accept": "application/json" },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error("TinyFish Search returned " + response.status + ": " + body.slice(0, 180));
  }
  return response.json();
}

function normalizeSearchResults(data) {
  const raw = Array.isArray(data?.results) ? data.results
    : Array.isArray(data?.data?.results) ? data.data.results
    : Array.isArray(data?.web_results) ? data.web_results
    : [];
  return raw.slice(0, 6).map((r, i) => ({
    id: "live-" + (i + 1),
    name: cleanText(r.title || r.site_name || r.url || ("Supplier result " + (i + 1)), 150),
    description: cleanText(r.snippet || r.description || "Search result found. Open the source and verify exact product compatibility.", 400),
    location: "Not verified",
    price: null,
    currency: "INR",
    leadTimeDays: null,
    specificationStatus: "needs_confirmation",
    deliveryStatus: "unverified",
    certificationStatus: "unverified",
    sourceUrl: r.url ? (String(r.url).startsWith("http") ? r.url : "https://" + r.url) : "",
    evidence: "TinyFish Search result snippet. This is a lead to investigate, not proof of stock, price, specification, or delivery."
  })).filter(x => x.sourceUrl);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, tinyfishConfigured: Boolean(TINYFISH_API_KEY) });
});

app.post("/api/recover", async (req, res) => {
  const requirements = {
    material: cleanText(req.body?.material || "aluminium profiles", 120),
    specification: cleanText(req.body?.specification || "6063-T5; confirm dimensions", 180),
    location: cleanText(req.body?.location || "Bengaluru, Karnataka", 120),
    shortfallQuantity: Math.max(1, Number(req.body?.shortfallQuantity || 400)),
    deadline: cleanText(req.body?.deadline || "within 7 days", 80),
    budget: Math.max(0, Number(req.body?.budget || 0))
  };

  let suppliers = [];
  let mode = "demo";
  let searchMessage = "";

  if (TINYFISH_API_KEY) {
    try {
      const query = "suppliers " + requirements.material + " " + requirements.specification + " near " + requirements.location + " product specifications contact";
      const data = await tinyfishSearch(query);
      suppliers = normalizeSearchResults(data);
      if (suppliers.length) {
        mode = "live";
        searchMessage = "Live TinyFish Search results loaded. Supplier details still require verification.";
      } else {
        searchMessage = "TinyFish returned no parseable results; showing labelled demo candidates.";
      }
    } catch (err) {
      searchMessage = "Live search failed; showing labelled demo candidates. " + cleanText(err.message, 180);
    }
  } else {
    searchMessage = "Demo mode: add TINYFISH_API_KEY to server/.env to enable live TinyFish Search.";
  }

  if (!suppliers.length) suppliers = demoSuppliers.map(s => ({ ...s }));
  const ranked = suppliers.map(s => scoreCandidate(s, requirements))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);

  const eligible = ranked.filter(s => s.eligible);
  const recommended = eligible[0] || null;
  const backup = eligible.find(s => s.id !== recommended?.id) || null;
  const total = requirements.shortfallQuantity;

  const rfq = "Subject: Request for Quotation — " + requirements.material + "\n\nHello,\n\nWe are seeking a quotation for " + total + " units of " + requirements.material + ".\nRequired specification: " + requirements.specification + ".\nDelivery location: " + requirements.location + ".\nRequired delivery: " + requirements.deadline + ".\n" + (requirements.budget ? "Target budget for the shortage: INR " + requirements.budget.toLocaleString("en-IN") + ".\n" : "") + "\nPlease confirm exact specification compatibility, available quantity, unit price, taxes, minimum order quantity, dispatch/lead time, delivery charges, certifications (if applicable), and quotation validity. Please attach a product datasheet and written delivery commitment.\n\nRegards,\nProcurement Team";

  res.json({
    ok: true,
    mode,
    searchMessage,
    requirements,
    suppliers: ranked,
    recommendation: recommended ? {
      supplierId: recommended.id,
      headline: mode === "live" ? "Best candidate to verify next" : "Demo recommendation — validate with live supplier research",
      rationale: recommended.specificationStatus === "match"
        ? "Marked as a specification match in the available data; verify price and delivery before choosing."
        : "No verified exact match is available yet. This candidate is a research lead, not an approved supplier.",
      caveat: "Published search results do not confirm stock, pricing, lead time, or technical compatibility."
    } : null,
    backup: backup ? { supplierId: backup.id, rationale: "Second eligible candidate by current transparent score; confirm all unknowns." } : null,
    rfq
  });
});

app.listen(PORT, () => console.log("ProcureRescue API running at http://localhost:" + PORT));
