import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, ArrowDownRight, ArrowRight, BadgeCheck, Boxes, CheckCircle2,
  ChevronRight, CircleAlert, Clock3, ExternalLink, FileText, Globe2, Layers3,
  LoaderCircle, MapPin, PackageCheck, Search, ShieldCheck, Sparkles, Truck,
  Wallet, Zap
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const initialForm = {
  material: "Aluminium profiles",
  specification: "6063-T5; exact dimensions must be confirmed",
  location: "Bengaluru, Karnataka",
  shortfallQuantity: 400,
  deadline: "Within 7 days",
  budget: 0
};

function money(value, currency = "INR") {
  if (value === null || value === undefined || value === "") return "Not published";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(n) : String(value);
}

function Status({ status }) {
  const map = {
    match: ["Verified match", "good"],
    partial: ["Partial match", "warn"],
    mismatch: ["Mismatch", "bad"],
    needs_confirmation: ["Needs confirmation", "warn"],
    verified_feasible: ["Verified feasible", "good"],
    unverified: ["Unverified", "muted"]
  };
  const [label, tone] = map[status] || ["Unverified", "muted"];
  return <span className={`pill ${tone}`}>{label}</span>;
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState({ tinyfishConfigured: false });
  const [activeTab, setActiveTab] = useState("suppliers");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function runRecovery() {
    setLoading(true); setError(""); setResult(null); setCopied(false);
    try {
      const response = await fetch(`${API}/api/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shortfallQuantity: Number(form.shortfallQuantity), budget: Number(form.budget || 0) })
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const data = await response.json();
      setResult(data);
      setActiveTab("suppliers");
    } catch {
      setError("Could not reach the backend. Start the server on port 4000, then try again.");
    } finally {
      setLoading(false);
    }
  }

  const recommendation = useMemo(() => {
    if (!result?.recommendation) return null;
    return result.suppliers.find(s => s.id === result.recommendation.supplierId);
  }, [result]);

  async function copyRfq() {
    try {
      await navigator.clipboard.writeText(result.rfq);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was blocked. Select and copy the RFQ text manually.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Boxes size={22}/></div><div><strong>ProcureRescue</strong><small>AI PROCUREMENT AGENT</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <div className="side-link active"><Activity size={17}/> Recovery workspace</div>
        <div className="side-link"><Layers3 size={17}/> Sourcing intelligence <span className="soon">MVP</span></div>
        <div className="side-link"><FileText size={17}/> RFQ drafts</div>
        <div className="sidebar-bottom">
          <div className="status-card"><span className={`status-dot ${health.tinyfishConfigured ? "live" : ""}`}></span><div><strong>{health.tinyfishConfigured ? "TinyFish configured" : "Demo mode available"}</strong><small>{health.tinyfishConfigured ? "Live search enabled" : "Add API key for live web"}</small></div></div>
          <div className="team-tag">BUILT FOR TINYFISH HACKATHON</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <ChevronRight size={14}/> <b>Recovery analysis</b></div>
          <div className="top-right"><span className="live-indicator"><span/> {health.tinyfishConfigured ? "LIVE SEARCH READY" : "DEMO-READY"}</span><div className="avatar">S</div></div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow"><Sparkles size={14}/> SUPPLY-CHAIN DISRUPTION RESPONSE</div>
            <h1>Recover the supply.<br/><span>Protect the deadline.</span></h1>
            <p>Investigate alternative suppliers, verify what the web actually says, and compare recovery paths before making a sourcing decision.</p>
          </div>
          <div className="heading-graphic"><div className="graphic-ring ring-one"></div><div className="graphic-ring ring-two"></div><div className="graphic-center"><Truck size={32}/></div><div className="graphic-chip chip-a"><CheckCircle2 size={13}/> Evidence-linked</div><div className="graphic-chip chip-b"><Zap size={13}/> Agent workflow</div></div>
        </section>

        <div className="workspace-grid">
          <section className="panel request-panel">
            <div className="panel-heading"><div><span className="step">01</span><div><h2>Disruption brief</h2><p>Describe the material shortage</p></div></div><button className="text-button" onClick={() => {setForm(initialForm);setResult(null);setError("");}}>Reset</button></div>
            <form onSubmit={e => {e.preventDefault();runRecovery();}}>
              <label>Material or product<input value={form.material} onChange={e=>update("material",e.target.value)} required placeholder="e.g. aluminium profile"/></label>
              <label>Required specification<textarea value={form.specification} onChange={e=>update("specification",e.target.value)} required rows="2" placeholder="Grade, dimensions, certification…"/></label>
              <div className="form-row">
                <label>Shortfall quantity<input type="number" min="1" value={form.shortfallQuantity} onChange={e=>update("shortfallQuantity",e.target.value)} required/></label>
                <label>Budget cap (₹, optional)<input type="number" min="0" value={form.budget} onChange={e=>update("budget",e.target.value)} placeholder="Leave blank if unknown"/></label>
              </div>
              <label>Delivery location<div className="input-icon"><MapPin size={15}/><input value={form.location} onChange={e=>update("location",e.target.value)} required/></div></label>
              <label>Required delivery window<input value={form.deadline} onChange={e=>update("deadline",e.target.value)} required/></label>
              <button className="primary-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Researching suppliers…</> : <><Search size={17}/> Find recovery options <ArrowRight size={16}/></>}</button>
              <button className="demo-button" type="button" onClick={()=>{setForm(initialForm);setError("");}}>Load demo scenario <ArrowDownRight size={15}/></button>
            </form>
            {error && <div className="error-note"><CircleAlert size={16}/>{error}</div>}
            <div className="privacy-note"><ShieldCheck size={15}/> No purchase is made. Human approval stays in control.</div>
          </section>

          <section className="results-column">
            {!result && !loading && <div className="empty-state panel">
              <div className="empty-icon"><Globe2 size={27}/></div>
              <span className="eyebrow">READY WHEN YOU ARE</span>
              <h2>Turn a shortage into a recovery plan.</h2>
              <p>Run the sample scenario to see how the agent gathers supplier leads, flags missing evidence, and builds a structured next-step plan.</p>
              <div className="empty-points"><div><Search size={16}/> Live supplier discovery</div><div><BadgeCheck size={16}/> Constraint-aware review</div><div><FileText size={16}/> RFQ draft generation</div></div>
            </div>}
            {loading && <div className="panel loading-panel"><div className="loader-orbit"><LoaderCircle size={30}/></div><h2>Investigating sourcing options</h2><p>Searching supplier pages and organizing the evidence. This may take a little time.</p><div className="loading-steps"><span>01 · Discover candidates</span><span>02 · Normalize evidence</span><span>03 · Evaluate constraints</span></div></div>}
            {result && <>
              <div className="summary-row">
                <div className="metric panel"><div className="metric-label">CANDIDATES</div><strong>{result.suppliers.length}</strong><small>Supplier leads returned</small></div>
                <div className="metric panel"><div className="metric-label">SHORTFALL</div><strong>{Number(result.requirements.shortfallQuantity).toLocaleString("en-IN")} <em>units</em></strong><small>{result.requirements.material}</small></div>
                <div className="metric panel"><div className="metric-label">RESEARCH MODE</div><strong className={`mode-${result.mode}`}>{result.mode === "live" ? "LIVE WEB" : "DEMO"}</strong><small>{result.mode === "live" ? "Search results returned" : "Illustrative records"}</small></div>
              </div>
              <div className={`notice ${result.mode === "live" ? "notice-live" : "notice-demo"}`}><CircleAlert size={16}/><span>{result.searchMessage}</span></div>
              {recommendation && <div className="recommendation panel"><div className="rec-top"><div className="rec-icon"><PackageCheck size={20}/></div><div><div className="eyebrow">NEXT CANDIDATE TO VERIFY</div><h2>{recommendation.name}</h2></div><span className="score">{recommendation.score}/100</span></div><p>{result.recommendation.rationale}</p><div className="rec-caveat"><ShieldCheck size={15}/>{result.recommendation.caveat}</div></div>}
              <div className="panel result-panel">
                <div className="tabs"><button className={activeTab==="suppliers"?"tab active":"tab"} onClick={()=>setActiveTab("suppliers")}>Supplier leads <span>{result.suppliers.length}</span></button><button className={activeTab==="plan"?"tab active":"tab"} onClick={()=>setActiveTab("plan")}>Recovery plan</button><button className={activeTab==="rfq"?"tab active":"tab"} onClick={()=>setActiveTab("rfq")}>RFQ draft</button></div>
                {activeTab==="suppliers" && <div className="supplier-list">{result.suppliers.map((s, i)=><article className="supplier-card" key={s.id}><div className="supplier-number">{String(i+1).padStart(2,"0")}</div><div className="supplier-body"><div className="supplier-title"><h3>{s.name}</h3>{s.eligible ? <span className="pill good">Not ruled out</span> : <span className="pill bad">Review constraint</span>}</div><p>{s.description}</p><div className="supplier-meta"><span><Wallet size={13}/>{money(s.price,s.currency)}</span><span><Clock3 size={13}/>{s.leadTimeDays ? `${s.leadTimeDays} days` : "Lead time unknown"}</span><span><MapPin size={13}/>{s.location || "Location unknown"}</span></div><div className="statuses"><Status status={s.specificationStatus}/><Status status={s.deliveryStatus}/></div><div className="evidence">{s.evidence}</div>{s.sourceUrl && <a className="source-link" href={s.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={12}/></a>}</div><div className="supplier-score"><small>MATCH SCORE</small><strong>{s.score}</strong><div className="score-track"><span style={{width:`${s.score}%`}}/></div></div></article>)}</div>}
                {activeTab==="plan" && <div className="plan-content"><h3>Recommended next steps</h3><ol><li><b>Confirm the original shortfall.</b><span>Obtain the written quantity and delivery commitment from the existing supplier.</span></li><li><b>Verify candidate specifications.</b><span>Ask for datasheets, grade, dimensions, tolerances and certifications where applicable.</span></li><li><b>Request written quotations.</b><span>Confirm unit price, taxes, MOQ, dispatch date, freight and quotation validity.</span></li><li><b>Choose a feasible recovery.</b><span>Compare only verified facts; do not approve a substitute material without technical sign-off.</span></li></ol><div className="rec-caveat"><ShieldCheck size={15}/> No supplier is approved automatically. Unknowns must be resolved by the buyer.</div></div>}
                {activeTab==="rfq" && <div className="rfq-content"><div className="rfq-toolbar"><div><h3>Request for quotation</h3><p>Review and edit before sending.</p></div><button className="copy-button" onClick={copyRfq}>{copied ? <CheckCircle2 size={14}/> : <FileText size={14}/>} {copied ? "Copied" : "Copy RFQ"}</button></div><pre>{result.rfq}</pre></div>}
              </div>
            </>}
          </section>
        </div>
        <footer><span>PROCURES CUE AI <i>•</i> HACKATHON MVP</span><span>Evidence first. Human-approved decisions.</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
