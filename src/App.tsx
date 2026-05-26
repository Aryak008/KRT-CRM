// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ebhaztndepodowsxfbmw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UxEPSa9z0XzkFEFAstGtoA_sC9aufto";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Mappers ──────────────────────────────────────────────────────────────────
const mapUser = (u) => ({ id: u.id, name: u.name, role: u.role, isAdmin: u.is_admin, active: u.is_active, passHash: u.password_hash, createdAt: u.created_at, createdBy: u.created_by });
const mapOcc = (o) => ({ id: o.id, name: o.name, tier: o.tier, depth: o.depth, sector: o.sector, city: o.city, sqft: o.sqft, leaseExpiry: o.lease_expiry, risk: o.risk, owner: o.owner, notes: o.notes, createdBy: o.created_by, createdAt: o.created_at, updatedBy: o.updated_by, updatedAt: o.updated_at, gccClassification: o.gcc_classification, asset: o.asset, building: o.building, unitFloor: o.unit_floor, renewalStatus: o.renewal_status, relationshipTenure: o.relationship_tenure });
const mapMeet = (m) => ({ id: m.id, occupierId: m.occupier_id, date: m.meeting_date, type: m.meeting_type, attendees: m.attendees, notes: m.notes, actions: m.actions, outcome: m.outcome, createdBy: m.created_by, createdAt: m.created_at, department: m.department, followUpDate: m.follow_up_date, relationshipOwner: m.relationship_owner });
const mapAudit = (a) => ({ id: a.id, user: a.user_name, action: a.action, target: a.target, at: a.at });
const mapContact = (c) => ({ id: c.id, occupierId: c.occupier_id, name: c.name, designation: c.designation, email: c.email, phone: c.phone, isPrimary: c.is_primary, createdBy: c.created_by, createdAt: c.created_at });
const mapActionItem = (a) => ({ id: a.id, meetingId: a.meeting_id, description: a.description, owner: a.owner, dueDate: a.due_date, status: a.status, createdAt: a.created_at, updatedAt: a.updated_at });
const mapEvent = (e) => ({ id: e.id, occupierId: e.occupier_id, title: e.title, eventDate: e.event_date, eventType: e.event_type, recurrence: e.recurrence, reminderDays: e.reminder_days, notes: e.notes, createdBy: e.created_by, createdAt: e.created_at });

// ─── Constants ────────────────────────────────────────────────────────────────
const TIERS = ["Platinum", "Gold", "Silver"];
const TIER_ALIAS = { Platinum: "A", Gold: "B", Silver: "C" };
const TIER_CADENCE = { Platinum: 30, Gold: 90, Silver: 180 };
const DEPTHS = ["Average", "Good", "Very Good", "Excellent"];
const MTYPES = ["Leasing Review", "Operations Review", "Management Connect", "CXO Connect", "Asset Walkthrough", "Occupier Connect Event", "Other"];
const SECTORS = ["Technology / GCC", "BFSI", "Professional Services", "Manufacturing", "Healthcare", "Retail / Consumer", "Other"];
const CITIES = ["Bengaluru", "Hyderabad", "Mumbai", "Chennai", "Gurugram", "GIFT City", "Other"];
const OUTCOMES = ["Positive", "Neutral", "Concerning", "Action Required"];
const RISK = ["Low", "Medium", "High"];
const ROLES = ["Leasing", "Operations", "Portfolio Operations", "Marketing", "Management", "Read Only"];
const DEPARTMENTS = ["Leasing", "Operations", "Portfolio Operations", "Marketing", "Management", "CXO", "Other"];
const GCC_OPTIONS = ["GCC", "Non-GCC"];
const RENEWAL_STATUSES = ["Active", "Up for Renewal", "Expanding", "At Risk", "Exited"];
const ACTION_STATUSES = ["Open", "In Progress", "Closed"];
const EVENT_TYPES = ["Planned Occupier Connect", "Recurring Meeting", "Team Schedule", "Site Visit", "Other"];
const RECURRENCES = ["None", "Weekly", "Monthly", "Quarterly", "Bi-Annual"];

const DEPT_TO_RDI = { Excellent: "High", "Very Good": "High", Good: "Medium", Average: "Low" };
const RDI_COLORS = { High: "#10b981", Medium: "#f59e0b", Low: "#ef4444" };
const EVENT_TYPE_COLORS = { "Planned Occupier Connect": "#3b82f6", "Recurring Meeting": "#8b5cf6", "Team Schedule": "#0d9488", "Site Visit": "#f59e0b", Other: "#6b7280" };

const HEALTH_COLOR = { Average: "#e74c3c", "Good": "#f59e0b", "Very Good": "#10b981", "Excellent": "#3b82f6" };
const TIER_BG = { Platinum: "#0d1b2a", Gold: "#92400e", Silver: "#334155" };
const TIER_TEXT = { Platinum: "#b8d4e8", Gold: "#fde68a", Silver: "#e2e8f0" };
const DEPTH_BG = { Average: "#fee2e2", "Good": "#fef9c3", "Very Good": "#d1fae5", "Excellent": "#dbeafe" };
const DEPTH_TEXT = { Average: "#991b1b", "Good": "#854d0e", "Very Good": "#065f46", "Excellent": "#1e3a8a" };
const OUTCOME_BG = { Positive: "#d1fae5", Neutral: "#f3f4f6", Concerning: "#fee2e2", "Action Required": "#fef3c7" };
const OUTCOME_TEXT = { Positive: "#065f46", Neutral: "#374151", Concerning: "#991b1b", "Action Required": "#92400e" };
const RISK_COLOR = { Low: "#065f46", Medium: "#854d0e", High: "#991b1b" };
const ACTION_STATUS_BG = { Open: "#fee2e2", "In Progress": "#fef9c3", Closed: "#d1fae5" };
const ACTION_STATUS_COLOR = { Open: "#991b1b", "In Progress": "#854d0e", Closed: "#065f46" };

const SK_SESSION = "krt_crm_session_v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().slice(0, 10); }
function tsNow() { return new Date().toISOString(); }
function isReadOnly(user) { return user && user.role === "Read Only" && !user.isAdmin; }
function fmtNum(n) { return n ? Number(n).toLocaleString() : "—"; }
function fmtDateTime(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}
function leaseMonths(exp) {
  if (!exp) return null;
  const d = new Date(exp + "-01");
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24 * 30));
}
function initials(name) { return name.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(); }
function avatarColor(name) {
  const colors = ["#0d9488", "#0d1b2a", "#7c3aed", "#b45309", "#0f766e", "#1d4ed8", "#be185d"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[Math.abs(h)];
}
async function hashCode(code) {
  const buf = new TextEncoder().encode(code + "::krt_salt_v1");
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function tierLabel(tier) { return `${TIER_ALIAS[tier] || tier} (${tier})`; }
function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

// ─── Theme & Styles ───────────────────────────────────────────────────────────
const ThemeStyles = () => (
  <style>{`
    :root, [data-theme="dark"] {
      --app-bg: radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 100%);
      --app-color: #e2e8f0;
      --topbar-bg: rgba(2, 6, 23, 0.7);
      --topbar-title: #f8fafc;
      --border-light: rgba(255,255,255,0.04);
      --border-med: rgba(255,255,255,0.08);
      --tabs-bg: rgba(0,0,0,0.2);
      --tab-color: #94a3b8;
      --tab-active-bg: rgba(255,255,255,0.08);
      --tab-active-color: #fff;
      --card-bg: rgba(255, 255, 255, 0.02);
      --stat-bg: rgba(255,255,255,0.015);
      --text-muted: #94a3b8;
      --text-strong: #fff;
      --text-accent: #cbd5e1;
      --btn-bg: rgba(255,255,255,0.04);
      --input-bg: rgba(0,0,0,0.25);
      --occ-hover: rgba(255,255,255,0.015);
      --modal-overlay: rgba(0,0,0,0.8);
      --modal-bg: rgba(15, 23, 42, 0.85);
      --auth-bg: #020617;
      --auth-card: rgba(15, 23, 42, 0.7);
    }
    [data-theme="light"] {
      --app-bg: #f8fafc;
      --app-color: #334155;
      --topbar-bg: rgba(255, 255, 255, 0.8);
      --topbar-title: #0f172a;
      --border-light: #e2e8f0;
      --border-med: #cbd5e1;
      --tabs-bg: #fff;
      --tab-color: #64748b;
      --tab-active-bg: #0f172a;
      --tab-active-color: #fff;
      --card-bg: #fff;
      --stat-bg: #fff;
      --text-muted: #64748b;
      --text-strong: #0f172a;
      --text-accent: #64748b;
      --btn-bg: #fff;
      --input-bg: #fff;
      --occ-hover: #f1f5f9;
      --modal-overlay: rgba(15,23,42,0.6);
      --modal-bg: #fff;
      --auth-bg: #f8fafc;
      --auth-card: #fff;
    }
  `}</style>
);

const S = {
  app: { fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", background: "var(--app-bg)", minHeight: "100vh", padding: "0", color: "var(--app-color)", transition: "background 0.3s ease, color 0.3s ease" },
  topbar: { background: "var(--topbar-bg)", backdropFilter: "blur(20px)", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--border-light)" },
  topbarTitle: { fontSize: 17, fontWeight: 500, color: "var(--topbar-title)", marginLeft: 16, letterSpacing: "0.01em" },
  main: { maxWidth: 1400, margin: "0 auto", padding: "40px 24px 80px" },
  tabs: { display: "flex", gap: 8, background: "var(--tabs-bg)", backdropFilter: "blur(12px)", borderRadius: 14, padding: 8, border: "1px solid var(--border-light)", marginBottom: 32, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" },
  tab: { flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "var(--tab-color)", background: "none", border: "none", cursor: "pointer", borderRadius: 10, transition: "all .3s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  tabActive: { background: "var(--tab-active-bg)", color: "var(--tab-active-color)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  card: { background: "var(--card-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--border-light)", borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.1)" },
  statCard: { background: "var(--stat-bg)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "24px", border: "1px solid var(--border-light)", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", transition: "transform 0.2s" },
  statLabel: { fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" },
  statValue: { fontSize: 36, fontWeight: 500, color: "var(--text-strong)", letterSpacing: "-0.02em" },
  statSub: { fontSize: 13, color: "var(--tab-color)", marginTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "var(--text-accent)", marginBottom: 20, textTransform: "uppercase", letterSpacing: ".08em" },
  btn: { padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border-med)", background: "var(--btn-bg)", color: "var(--app-color)", display: "inline-flex", alignItems: "center", gap: 8, transition: "all .2s", fontFamily: "inherit", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  btnPrimary: { background: "linear-gradient(135deg, #0284c7, #1d4ed8)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(29,78,216,0.4)" },
  btnTeal: { background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(13,148,136,0.3)" },
  btnSm: { padding: "8px 16px", fontSize: 13 },
  btnDanger: { color: "#fca5a5", borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.05)" },
  input: { width: "100%", padding: "14px 18px", fontSize: 14, border: "1px solid var(--border-med)", borderRadius: 12, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "all .2s" },
  textarea: { width: "100%", padding: "14px 18px", fontSize: 14, border: "1px solid var(--border-med)", borderRadius: 12, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 100, lineHeight: 1.6, boxSizing: "border-box", transition: "all .2s" },
  select: { width: "100%", padding: "14px 18px", fontSize: 14, border: "1px solid var(--border-med)", borderRadius: 12, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "all .2s" },
  label: { display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 },
  formGroup: { marginBottom: 24 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 },
  divider: { height: 1, background: "var(--border-light)", margin: "24px 0" },
  occRow: { display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderRadius: 16, cursor: "pointer", border: "1px solid transparent", transition: "all .2s", background: "var(--occ-hover)" },
  badge: { display: "inline-block", padding: "6px 14px", borderRadius: 30, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", border: "1px solid var(--border-med)", color: "var(--text-strong)" },
  meetingItem: { padding: 24, border: "1px solid var(--border-light)", borderRadius: 20, marginBottom: 20, background: "var(--occ-hover)", boxShadow: "0 8px 24px rgba(0,0,0,0.05)" },
  avatar: { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  modalOverlay: { position: "fixed", inset: 0, background: "var(--modal-overlay)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 },
  modal: { background: "var(--modal-bg)", backdropFilter: "blur(32px)", borderRadius: 28, padding: 40, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border-med)", boxShadow: "0 32px 64px rgba(0,0,0,0.3)", color: "var(--app-color)" },
  alertWarn: { padding: "16px 24px", borderRadius: 16, fontSize: 14, marginBottom: 24, background: "rgba(245,158,11,0.08)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)", display: "flex", gap: 14, alignItems: "flex-start" },
  alertRed: { padding: "16px 24px", borderRadius: 16, fontSize: 14, marginBottom: 24, background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: 14 },
  progressBar: { height: 6, background: "var(--border-med)", borderRadius: 4, marginTop: 10, overflow: "hidden" },
  activityLine: { display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--border-light)" },
  authPage: { minHeight: "100vh", display: "flex", background: "var(--auth-bg)", transition: "background 0.3s ease" },
  authCard: { background: "var(--auth-card)", backdropFilter: "blur(30px)", borderRadius: 28, padding: 48, width: "100%", maxWidth: 480, boxShadow: "0 32px 64px rgba(0,0,0,0.2)", border: "1px solid var(--border-med)", color: "var(--app-color)" },
};

// ─── Logos ────────────────────────────────────────────────────────────────────
const Logo = () => <div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src="/logo-official.webp" alt="KRT Logo" style={{ width: 160, height: "auto", objectFit: "contain" }} /></div>;
const LogoWhite = () => <div style={{ display: "flex", alignItems: "center", gap: 10, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}><img src="/logo-official.webp" alt="KRT Logo" style={{ width: 220, height: "auto", objectFit: "contain" }} /></div>;
const LogoTopbar = () => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/logo-official.webp" alt="KRT Logo" style={{ height: 28, width: "auto", objectFit: "contain" }} /></div>;

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({ label, bg, color }) { return <span style={{ ...S.badge, background: bg, color }}>{label}</span>; }
function TierBadge({ tier }) { return <Badge label={tierLabel(tier)} bg={TIER_BG[tier] || "#334155"} color={TIER_TEXT[tier] || "#fff"} />; }
function DepthBadge({ depth }) { return <Badge label={depth} bg={DEPTH_BG[depth] || "#f3f4f6"} color={DEPTH_TEXT[depth] || "#374151"} />; }
function OutcomeBadge({ outcome }) { return <Badge label={outcome} bg={OUTCOME_BG[outcome] || "#f3f4f6"} color={OUTCOME_TEXT[outcome] || "#374151"} />; }
function RDIBadge({ rdi }) { return <Badge label={rdi + " RDI"} bg={RDI_COLORS[rdi] + "22"} color={RDI_COLORS[rdi]} />; }
function ActionStatusBadge({ status }) { return <Badge label={status} bg={ACTION_STATUS_BG[status] || "#f3f4f6"} color={ACTION_STATUS_COLOR[status] || "#374151"} />; }
function Avatar({ name, size = 28 }) {
  return <div style={{ ...S.avatar, width: size, height: size, background: avatarColor(name || "?"), fontSize: size < 30 ? 10 : 13 }}>{initials(name || "?")}</div>;
}
function Btn({ style: extraStyle, children, ...props }) { return <button style={{ ...S.btn, ...extraStyle }} {...props}>{children}</button>; }
function Input({ style: extraStyle, ...props }) { return <input style={{ ...S.input, ...extraStyle }} {...props} />; }
function Select({ style: extraStyle, children, ...props }) { return <select style={{ ...S.select, ...extraStyle }} {...props}>{children}</select>; }
function Textarea({ style: extraStyle, ...props }) { return <textarea style={{ ...S.textarea, ...extraStyle }} {...props} />; }
function ProgressBar({ pct, color }) {
  return <div style={S.progressBar}><div style={{ height: "100%", borderRadius: 3, width: `${Math.round(Math.min(pct, 100))}%`, background: color, transition: "width .3s" }} /></div>;
}
function Spinner({ label = "Syncing..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "#aaa", gap: 10, fontSize: 13 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e0e0e0", borderTop: "2px solid #0d9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      {label}
    </div>
  );
}

// ─── Auth Screens ─────────────────────────────────────────────────────────────
function FirstRunSetup({ onDone }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Management");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    if (name.trim().length < 2) return setErr("Name is required.");
    if (pass.length < 6) return setErr("Passcode must be at least 6 characters.");
    if (pass !== pass2) return setErr("Passcodes don't match.");
    setBusy(true);
    try { await onDone({ name: name.trim(), role, pass }); }
    catch (e) { console.error(e); setErr("Setup failed: " + (e.message || e.toString())); setBusy(false); }
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`.auth-sidebar{display:none}@media(min-width:900px){.auth-sidebar{display:flex;flex:1;position:relative;overflow:hidden;align-items:center;justify-content:center}}`}</style>
      <div className="auth-sidebar">
        <div style={{ position: "absolute", inset: 0, background: "url('/real_estate_bg.png') center/cover no-repeat" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.7) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, color: "#fff", padding: 60, maxWidth: 500 }}>
          <div style={{ marginBottom: 40 }}><LogoWhite /></div>
          <h1 style={{ fontSize: 40, fontWeight: 700, marginTop: 24, marginBottom: 16, lineHeight: 1.1 }}>Initialize Workspace</h1>
          <p style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.6, fontWeight: 300 }}>Set up the core administrative account to begin tracking occupiers and managing portfolio relationships.</p>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={S.authCard}>
          <div style={{ textAlign: "center", marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginBottom: 20 }}><Logo /></div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Set up your CRM</h2>
            <p style={{ fontSize: 15, color: "#94a3b8" }}>Create the initial admin account to start</p>
          </div>
          {err && <div style={{ ...S.alertRed, marginBottom: 14 }}><span>⚠️</span><div>{err}</div></div>}
          <div style={S.formGroup}><label style={S.label}>Your full name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Mehta" autoFocus /></div>
          <div style={S.formGroup}><label style={S.label}>Your function</label><Select value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></div>
          <div style={S.formGroup}><label style={S.label}>Create passcode (min 6 chars) *</label><Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" /></div>
          <div style={S.formGroup}><label style={S.label}>Confirm passcode *</label><Input type="password" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" /></div>
          <Btn style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 0", marginTop: 4, fontSize: 15 }} disabled={busy} onClick={submit}>{busy ? "Creating..." : "Create admin account →"}</Btn>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ users, onLogin, onSignUp }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Leasing");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submitSignIn = async () => {
    setErr(""); if (!name || !pass) return setErr("Both name and passcode are required."); setBusy(true);
    const user = users.find(u => u.name.toLowerCase() === name.trim().toLowerCase() && u.active !== false);
    if (!user) { setBusy(false); return setErr("User not found."); }
    const hashed = await hashCode(pass);
    if (hashed !== user.passHash) { setBusy(false); return setErr("Incorrect passcode."); }
    onLogin(user);
  };
  const submitSignUp = async () => {
    setErr(""); if (name.trim().length < 2) return setErr("Name is required."); if (pass.length < 6) return setErr("Passcode must be at least 6 characters."); if (pass !== pass2) return setErr("Passcodes don't match."); setBusy(true);
    try { await onSignUp({ name: name.trim(), role, pass }); } catch (e) { console.error(e); setErr("Sign-up failed: " + (e.message || e.toString())); setBusy(false); }
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`.auth-sidebar{display:none}@media(min-width:900px){.auth-sidebar{display:flex;flex:1;position:relative;overflow:hidden;align-items:center;justify-content:center}}`}</style>
      <div className="auth-sidebar">
        <div style={{ position: "absolute", inset: 0, background: "url('/real_estate_bg.png') center/cover no-repeat" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.7) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, color: "#fff", padding: 60, maxWidth: 500 }}>
          <div style={{ marginBottom: 40 }}><LogoWhite /></div>
          <h1 style={{ fontSize: 40, fontWeight: 700, marginTop: 24, marginBottom: 16, lineHeight: 1.1 }}>Enterprise Real Estate Management</h1>
          <p style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.6, fontWeight: 300 }}>Streamline operations, track portfolio engagement, and manage occupier relations.</p>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={S.authCard}>
          <div style={{ textAlign: "center", marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginBottom: 20 }}><Logo /></div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <p style={{ fontSize: 15, color: "#94a3b8" }}>{mode === "login" ? "Sign in to access your dashboard" : "Sign up to join the workspace"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {["login", "signup"].map(m => (
              <button key={m} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "rgba(255,255,255,0.1)" : "transparent", color: mode === m ? "#fff" : "#64748b" }} onClick={() => { setMode(m); setErr(""); }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          {err && <div style={{ ...S.alertRed, marginBottom: 14 }}><span>⚠️</span><div>{err}</div></div>}
          {mode === "login" ? (
            <>
              <div style={S.formGroup}><label style={S.label}>Your full name</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name as registered" autoFocus list="user-names" /><datalist id="user-names">{users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.name} />)}</datalist></div>
              <div style={S.formGroup}><label style={S.label}>Passcode</label><Input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submitSignIn()} placeholder="••••••••" /></div>
              <Btn style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 0", marginTop: 4, fontSize: 15 }} disabled={busy} onClick={submitSignIn}>{busy ? "Signing in..." : "Sign in →"}</Btn>
            </>
          ) : (
            <>
              <div style={S.formGroup}><label style={S.label}>Your full name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Mehta" autoFocus /></div>
              <div style={S.formGroup}><label style={S.label}>Your function</label><Select value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></div>
              <div style={S.formGroup}><label style={S.label}>Create passcode (min 6 chars) *</label><Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" /></div>
              <div style={S.formGroup}><label style={S.label}>Confirm passcode *</label><Input type="password" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && submitSignUp()} placeholder="••••••••" /></div>
              <Btn style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 0", marginTop: 4, fontSize: 15 }} disabled={busy} onClick={submitSignUp}>{busy ? "Creating..." : "Create account →"}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ users, audit, currentUser, onAddUser, onResetPass, onToggleActive, onToggleAdmin }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetForUser, setResetForUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Leasing");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [resetPass, setResetPass] = useState("");
  const [err, setErr] = useState("");
  const submitAdd = async () => {
    setErr(""); if (newName.trim().length < 2) return setErr("Name required.");
    if (users.some(u => u.name.toLowerCase() === newName.trim().toLowerCase())) return setErr("That name already exists.");
    if (newPass.length < 6) return setErr("Passcode min 6 chars.");
    await onAddUser({ name: newName.trim(), role: newRole, isAdmin: newIsAdmin, pass: newPass });
    setNewName(""); setNewRole("Leasing"); setNewIsAdmin(false); setNewPass(""); setShowAddForm(false);
  };
  const submitReset = async () => {
    setErr(""); if (resetPass.length < 6) return setErr("Passcode min 6 chars.");
    await onResetPass(resetForUser.id, resetPass);
    setResetPass(""); setResetForUser(null);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div><div style={{ ...S.sectionTitle, margin: 0 }}>Users ({users.length})</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{users.filter(u => u.isAdmin && u.active !== false).length} admin · {users.filter(u => !u.isAdmin && u.active !== false).length} standard · {users.filter(u => u.active === false).length} inactive</div></div>
        <Btn style={S.btnPrimary} onClick={() => { setShowAddForm(true); setErr(""); }}>+ Add User</Btn>
      </div>
      <div style={S.card}>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: ".5px solid var(--border-light)" }}>
            <Avatar name={u.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: u.active === false ? "var(--text-muted)" : "var(--text-strong)" }}>{u.name} {u.isAdmin && <span style={{ ...S.badge, background: "#0d9488", color: "#fff", marginLeft: 6, fontSize: 9 }}>ADMIN</span>}{u.active === false && <span style={{ ...S.badge, background: "rgba(239,68,68,0.1)", color: "#ef4444", marginLeft: 6, fontSize: 9 }}>INACTIVE</span>}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{u.role} · Added {fmtDateTime(u.createdAt)}</div>
            </div>
            <Btn style={S.btnSm} onClick={() => { setResetForUser(u); setErr(""); }}>Reset Pass</Btn>
            {u.id !== currentUser.id && (<><Btn style={S.btnSm} onClick={() => onToggleAdmin(u.id)}>{u.isAdmin ? "↓ Demote" : "↑ Make admin"}</Btn><Btn style={{ ...S.btnSm, ...(u.active === false ? S.btnTeal : S.btnDanger) }} onClick={() => onToggleActive(u.id)}>{u.active === false ? "Reactivate" : "Deactivate"}</Btn></>)}
          </div>
        ))}
      </div>
      <div style={{ ...S.sectionTitle, marginTop: 24 }}>Audit log ({audit.length} actions)</div>
      <div style={{ ...S.card, maxHeight: 400, overflowY: "auto" }}>
        {audit.length === 0 ? <div style={{ textAlign: "center", padding: 20, color: "#aaa", fontSize: 13 }}>No activity yet</div>
          : [...audit].slice(0, 100).map(a => (
            <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 6px", borderBottom: ".5px solid var(--border-light)", fontSize: 12 }}>
              <Avatar name={a.user} size={22} />
              <div style={{ flex: 1 }}><div><strong>{a.user}</strong> <span style={{ color: "var(--text-muted)" }}>{a.action}</span> {a.target && <em style={{ color: "#888" }}>"{a.target}"</em>}</div><div style={{ color: "#aaa", fontSize: 11 }}>{fmtDateTime(a.at)}</div></div>
            </div>
          ))}
      </div>
      {showAddForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-strong)" }}>Add team member</h2>
            {err && <div style={{ ...S.alertRed, marginBottom: 12 }}><span>⚠️</span><div>{err}</div></div>}
            <div style={S.formGroup}><label style={S.label}>Full name *</label><Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></div>
            <div style={S.formGroup}><label style={S.label}>Function</label><Select value={newRole} onChange={e => setNewRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></div>
            <div style={S.formGroup}><label style={S.label}>Initial passcode (min 6 chars) *</label><Input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
            <div style={S.formGroup}><label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />Grant admin privileges</label></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Btn onClick={() => setShowAddForm(false)}>Cancel</Btn><Btn style={S.btnPrimary} onClick={submitAdd}>✓ Add user</Btn></div>
          </div>
        </div>
      )}
      {resetForUser && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setResetForUser(null); }}>
          <div style={{ ...S.modal, maxWidth: 380 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-strong)" }}>Reset passcode for {resetForUser.name}</h2>
            {err && <div style={{ ...S.alertRed, marginBottom: 12 }}><span>⚠️</span><div>{err}</div></div>}
            <div style={S.formGroup}><label style={S.label}>New passcode</label><Input type="text" value={resetPass} onChange={e => setResetPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submitReset()} autoFocus /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Btn onClick={() => setResetForUser(null)}>Cancel</Btn><Btn style={S.btnPrimary} onClick={submitReset}>Reset</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Occupier Form ────────────────────────────────────────────────────────────
function OccupierForm({ occ, currentUser, onSave, onCancel }) {
  const blank = { id: "", name: "", tier: "Gold", depth: "Good", sector: "Technology / GCC", city: "Bengaluru", sqft: "", leaseExpiry: "", risk: "Low", owner: currentUser.name, notes: "", gccClassification: "GCC", asset: "", building: "", unitFloor: "", renewalStatus: "Active", relationshipTenure: "" };
  const [f, setF] = useState(occ ? { ...blank, ...occ } : blank);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Occupier name *</label><Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Google" /></div>
        <div style={S.formGroup}><label style={S.label}>Tier *</label>
          <Select value={f.tier} onChange={e => set("tier", e.target.value)}>{TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</Select>
        </div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Relationship depth</label><Select value={f.depth} onChange={e => set("depth", e.target.value)}>{DEPTHS.map(d => <option key={d}>{d}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Sector</label><Select value={f.sector} onChange={e => set("sector", e.target.value)}>{SECTORS.map(s => <option key={s}>{s}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>City</label><Select value={f.city} onChange={e => set("city", e.target.value)}>{CITIES.map(c => <option key={c}>{c}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>GCC Classification</label><Select value={f.gccClassification || "GCC"} onChange={e => set("gccClassification", e.target.value)}>{GCC_OPTIONS.map(g => <option key={g}>{g}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Asset name</label><Input value={f.asset || ""} onChange={e => set("asset", e.target.value)} placeholder="e.g. Embassy Golf Links" /></div>
        <div style={S.formGroup}><label style={S.label}>Building name</label><Input value={f.building || ""} onChange={e => set("building", e.target.value)} placeholder="e.g. Block A" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Unit & Floor</label><Input value={f.unitFloor || ""} onChange={e => set("unitFloor", e.target.value)} placeholder="e.g. Floor 5, Unit 501" /></div>
        <div style={S.formGroup}><label style={S.label}>Area (sq ft)</label><Input type="number" value={f.sqft || ""} onChange={e => set("sqft", e.target.value)} placeholder="50000" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Lease expiry (YYYY-MM)</label><Input value={f.leaseExpiry || ""} onChange={e => set("leaseExpiry", e.target.value)} placeholder="2027-06" /></div>
        <div style={S.formGroup}><label style={S.label}>Renewal Status</label><Select value={f.renewalStatus || "Active"} onChange={e => set("renewalStatus", e.target.value)}>{RENEWAL_STATUSES.map(r => <option key={r}>{r}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>At-risk flag</label><Select value={f.risk} onChange={e => set("risk", e.target.value)}>{RISK.map(r => <option key={r}>{r}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Relationship Tenure (since)</label><Input type="date" value={f.relationshipTenure || ""} onChange={e => set("relationshipTenure", e.target.value)} /></div>
      </div>
      <div style={S.formGroup}><label style={S.label}>Relationship owner</label><Input value={f.owner || ""} onChange={e => set("owner", e.target.value)} placeholder="Name" /></div>
      <div style={S.formGroup}><label style={S.label}>Account notes</label><Textarea value={f.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Key context, expansion signals, renewal status, watch items..." /></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn style={S.btnPrimary} onClick={() => { if (!f.name.trim()) return; onSave({ ...f, id: f.id || genId() }); }}>✓ Save Occupier</Btn>
      </div>
    </div>
  );
}

// ─── Meeting Form ─────────────────────────────────────────────────────────────
function MeetingForm({ occs, preOccId, currentUser, onSave, onCancel, editMeet = null }: any) {
  const blank = { id: "", occupierId: preOccId || "", date: today(), type: "Leasing Review", attendees: currentUser.name, notes: "", actions: "", outcome: "Positive", department: "", followUpDate: "", relationshipOwner: currentUser.name };
  const [f, setF] = useState(editMeet ? { ...blank, id: editMeet.id, occupierId: editMeet.occupierId, date: editMeet.date, type: editMeet.type, attendees: editMeet.attendees || "", notes: editMeet.notes || "", actions: editMeet.actions || "", outcome: editMeet.outcome || "Positive", department: editMeet.department || "", followUpDate: editMeet.followUpDate || "", relationshipOwner: editMeet.relationshipOwner || "" } : blank);
  const [actionItems, setActionItems] = useState([]);
  const [newAI, setNewAI] = useState({ description: "", owner: "", dueDate: "", status: "Open" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const addAI = () => {
    if (!newAI.description.trim()) return;
    setActionItems(prev => [...prev, { ...newAI, id: genId() }]);
    setNewAI({ description: "", owner: "", dueDate: "", status: "Open" });
  };
  const removeAI = (id) => setActionItems(prev => prev.filter(a => a.id !== id));
  return (
    <div>
      <div style={S.formGroup}><label style={S.label}>Occupier *</label>
        {preOccId
          ? <div style={{ padding: "8px 10px", background: "var(--input-bg)", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{occs.find(o => o.id === preOccId)?.name || "—"}</div>
          : <Select value={f.occupierId} onChange={e => set("occupierId", e.target.value)}><option value="">Select occupier...</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name} ({tierLabel(o.tier)})</option>)}</Select>}
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Date *</label><Input type="date" value={f.date} onChange={e => set("date", e.target.value)} /></div>
        <div style={S.formGroup}><label style={S.label}>Meeting type</label><Select value={f.type} onChange={e => set("type", e.target.value)}>{MTYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Department</label><Select value={f.department} onChange={e => set("department", e.target.value)}><option value="">Select department...</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Relationship Owner</label><Input value={f.relationshipOwner} onChange={e => set("relationshipOwner", e.target.value)} placeholder="Name" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Follow-up Date</label><Input type="date" value={f.followUpDate} onChange={e => set("followUpDate", e.target.value)} /></div>
        <div style={S.formGroup}><label style={S.label}>Meeting outcome</label><Select value={f.outcome} onChange={e => set("outcome", e.target.value)}>{OUTCOMES.map(o => <option key={o}>{o}</option>)}</Select></div>
      </div>
      <div style={S.formGroup}><label style={S.label}>Attendees</label><Input value={f.attendees} onChange={e => set("attendees", e.target.value)} placeholder="Name (Role), Name (Role)..." /></div>
      <div style={S.formGroup}><label style={S.label}>Meeting notes *</label><Textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 110 }} placeholder="What was discussed, signals observed, decisions made..." /></div>
      {editMeet ? (
        <div style={{ ...S.alertWarn, marginBottom: 24 }}><span>ℹ️</span><div>Action items are managed in the <strong>TAT Tracker</strong> tab after saving.</div></div>
      ) : (
        <div style={S.formGroup}>
          <label style={S.label}>Action Items (TAT Tracker)</label>
          {actionItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {actionItems.map(ai => (
                <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--input-bg)", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                  <div style={{ flex: 1 }}><strong>{ai.description}</strong> <span style={{ color: "var(--text-muted)" }}>| {ai.owner || "—"} | {ai.dueDate || "—"}</span></div>
                  <ActionStatusBadge status={ai.status} />
                  <button onClick={() => removeAI(ai.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 8, alignItems: "flex-end" }}>
            <Input value={newAI.description} onChange={e => setNewAI(p => ({ ...p, description: e.target.value }))} placeholder="Action description..." style={{ padding: "10px 12px", fontSize: 13 }} />
            <Input value={newAI.owner} onChange={e => setNewAI(p => ({ ...p, owner: e.target.value }))} placeholder="Owner" style={{ padding: "10px 12px", fontSize: 13 }} />
            <Input type="date" value={newAI.dueDate} onChange={e => setNewAI(p => ({ ...p, dueDate: e.target.value }))} style={{ padding: "10px 12px", fontSize: 13 }} />
            <Select value={newAI.status} onChange={e => setNewAI(p => ({ ...p, status: e.target.value }))} style={{ padding: "10px 12px", fontSize: 13, width: "auto" }}>{ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
            <Btn style={{ ...S.btnTeal, ...S.btnSm, whiteSpace: "nowrap" }} onClick={addAI}>+ Add</Btn>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn style={S.btnTeal} onClick={() => {
          const occId = preOccId || f.occupierId;
          if (!occId || !f.notes.trim()) return;
          onSave({ ...f, id: f.id || genId(), occupierId: occId, newActionItems: editMeet ? [] : actionItems });
        }}>✓ {editMeet ? "Update Meeting" : "Log Meeting"}</Btn>
      </div>
    </div>
  );
}

// ─── Copy Synopsis Button ─────────────────────────────────────────────────────
function CopySynopsisBtn({ meeting, occName, actionItems }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const items = actionItems || [];
    const aiText = items.length > 0
      ? items.map((a, i) => `${i + 1}. ${a.description} | Owner: ${a.owner || "—"} | Due: ${a.dueDate || "—"} | ${a.status}`).join("\n")
      : (meeting.actions || "—");
    const synopsis = `MEETING SYNOPSIS — ${occName}
──────────────────────────────────
Date         : ${meeting.date}
Type         : ${meeting.type}
Department   : ${meeting.department || "—"}
Attendees    : ${meeting.attendees || "—"}
Outcome      : ${meeting.outcome || "—"}
Follow-up    : ${meeting.followUpDate || "—"}
Rel. Owner   : ${meeting.relationshipOwner || "—"}

DISCUSSION NOTES
──────────────────────────────────
${meeting.notes || "—"}

ACTION ITEMS
──────────────────────────────────
${aiText}`;
    try {
      await navigator.clipboard.writeText(synopsis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error(e); }
  };
  return (
    <Btn style={{ ...S.btnSm, background: copied ? "#d1fae5" : "var(--btn-bg)", color: copied ? "#065f46" : "var(--app-color)", border: "1px solid var(--border-med)" }} onClick={copy}>
      {copied ? "✓ Copied!" : "📋 Copy Synopsis"}
    </Btn>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ occs, meets, currentUser, onGotoOcc, onLogMeeting }) {
  const total = occs.length;
  const atRisk = occs.filter(o => o.risk === "High");
  const expiring18 = occs.filter(o => { const m = leaseMonths(o.leaseExpiry); return m !== null && m <= 18 && m > 0; });
  const recent = [...meets].sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)).slice(0, 6);
  const tierCounts = TIERS.map(t => ({ t, n: occs.filter(o => o.tier === t).length }));
  const depthCounts = DEPTHS.map(d => ({ d, n: occs.filter(o => o.depth === d).length }));
  const depthScore = { Average: 1, "Good": 2, "Very Good": 3, "Excellent": 4 };
  const avgD = occs.reduce((a, o) => a + (depthScore[o.depth] || 2), 0) / Math.max(total, 1);
  const avgLabel = avgD < 1.75 ? "Average" : avgD < 2.5 ? "Good" : avgD < 3.5 ? "Very Good" : "Excellent";
  const rdiCounts = { High: 0, Medium: 0, Low: 0 };
  occs.forEach(o => { const rdi = DEPT_TO_RDI[o.depth] || "Low"; rdiCounts[rdi]++; });
  const totalRDI = total || 1;
  const rdiScore = (rdiCounts.High * 3 + rdiCounts.Medium * 2 + rdiCounts.Low * 1) / (totalRDI * 3);
  const portfolioHealth = rdiScore >= 0.67 ? "Strong" : rdiScore >= 0.33 ? "Moderate" : "Needs Attention";
  const portfolioHealthColor = rdiScore >= 0.67 ? "#10b981" : rdiScore >= 0.33 ? "#f59e0b" : "#ef4444";
  const overdueOccs = occs.map(o => {
    const occMeets = meets.filter(m => m.occupierId === o.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastDate = occMeets[0]?.date;
    const days = lastDate ? daysBetween(lastDate) : 999;
    const cadence = TIER_CADENCE[o.tier] || 90;
    return { ...o, daysSinceMeeting: days, cadence, overdue: days > cadence, daysOverdue: days - cadence };
  }).filter(o => o.overdue).sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5);
  const deptCounts = {};
  meets.forEach(m => { const d = m.department || "Uncategorised"; deptCounts[d] = (deptCounts[d] || 0) + 1; });
  const deptEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxDeptCount = Math.max(...deptEntries.map(([, n]) => n), 1);
  const tierMeetCounts = TIERS.map(t => ({ t, n: meets.filter(m => occs.find(o => o.id === m.occupierId)?.tier === t).length }));
  const maxTierMeet = Math.max(...tierMeetCounts.map(x => x.n), 1);
  const barW = 60; const barGap = 24; const chartH = 100;
  return (
    <div>
      <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", marginBottom: 32, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
        <img src="/gallery.webp" alt="Dashboard Banner" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.4) 60%, transparent 100%)", display: "flex", alignItems: "center", padding: 48 }}>
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 12, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Welcome, {currentUser.name}</h2>
            <p style={{ color: "#cbd5e1", fontSize: 17, fontWeight: 300, lineHeight: 1.6 }}>Here's the latest overview of your portfolio engagement and real estate operations.</p>
          </div>
        </div>
      </div>
      {expiring18.length > 0 && <div style={S.alertWarn}><span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span><div><strong>{expiring18.length} lease{expiring18.length > 1 ? "s" : ""} expiring within 18 months:</strong>{" "}{expiring18.map(o => `${o.name} (${o.leaseExpiry})`).join(", ")}</div></div>}
      {atRisk.length > 0 && <div style={S.alertRed}><span style={{ fontSize: 18, flexShrink: 0 }}>🔴</span><div><strong>{atRisk.length} high-risk account{atRisk.length > 1 ? "s" : ""}:</strong>{" "}{atRisk.map(o => o.name).join(", ")}</div></div>}
      <div style={{ ...S.grid4, marginBottom: 24 }}>
        <div style={S.statCard}><div style={S.statLabel}>Total Occupiers</div><div style={S.statValue}>{total}</div><div style={S.statSub}>{occs.filter(o => o.tier === "Platinum").length} Platinum</div></div>
        <div style={S.statCard}><div style={S.statLabel}>Meetings Logged</div><div style={S.statValue}>{meets.length}</div><div style={S.statSub}>Across all accounts</div></div>
        <div style={S.statCard}><div style={S.statLabel}>At-Risk</div><div style={{ ...S.statValue, color: atRisk.length > 0 ? "#c0392b" : "#065f46" }}>{atRisk.length}</div><div style={S.statSub}>High risk flag</div></div>
        <div style={S.statCard}><div style={S.statLabel}>Avg Depth</div><div style={{ ...S.statValue, fontSize: 16, paddingTop: 4 }}>{avgLabel}</div><div style={S.statSub}>{avgD.toFixed(1)} / 4.0</div></div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Relationship Depth Index (RDI) Health</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: portfolioHealthColor }}>Portfolio: {portfolioHealth}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {["High", "Medium", "Low"].map(rdi => (
            <div key={rdi} style={{ ...S.statCard, borderLeft: `4px solid ${RDI_COLORS[rdi]}`, padding: 20 }}>
              <div style={{ ...S.statLabel, color: RDI_COLORS[rdi] }}>{rdi} RDI</div>
              <div style={{ ...S.statValue, color: RDI_COLORS[rdi] }}>{rdiCounts[rdi]}</div>
              <div style={S.statSub}>{Math.round(rdiCounts[rdi] / totalRDI * 100)}% of portfolio</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.sectionTitle}>Cadence Alerts — Overdue</div>
          {overdueOccs.length === 0
            ? <div style={{ color: "#10b981", fontSize: 13, textAlign: "center", padding: 20 }}>✓ All occupiers are on track</div>
            : overdueOccs.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{o.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tierLabel(o.tier)} · Cadence: {o.cadence}d</div></div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{o.daysOverdue}d overdue</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.daysSinceMeeting === 999 ? "No meetings" : `Last: ${o.daysSinceMeeting}d ago`}</div>
                </div>
              </div>
            ))}
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>Meetings by Tier</div>
          <svg width="100%" viewBox={`0 0 ${TIERS.length * (barW + barGap) + 20} ${chartH + 50}`} style={{ overflow: "visible" }}>
            {tierMeetCounts.map(({ t, n }, i) => {
              const x = 10 + i * (barW + barGap);
              const h = Math.max(4, (n / maxTierMeet) * chartH);
              return (
                <g key={t}>
                  <rect x={x} y={chartH - h} width={barW} height={h} rx={6} fill={TIER_BG[t]} opacity={0.85} />
                  <text x={x + barW / 2} y={chartH - h - 6} textAnchor="middle" fill="var(--text-strong)" fontSize={13} fontWeight={700}>{n}</text>
                  <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{TIER_ALIAS[t]} ({t})</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.sectionTitle}>Team Engagement by Department</div>
          {deptEntries.length === 0
            ? <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No department data yet</div>
            : deptEntries.map(([dept, count]) => (
              <div key={dept} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{dept}</span><strong>{count}</strong></div>
                <div style={{ height: 8, background: "var(--border-med)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxDeptCount) * 100}%`, background: "linear-gradient(135deg, #0d9488, #0f766e)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Portfolio Composition</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...S.sectionTitle, fontSize: 10, marginBottom: 6 }}>By tier</div>
              {tierCounts.map(({ t, n }) => (
                <div key={t} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span>{tierLabel(t)}</span><strong>{n}</strong></div>
                  <ProgressBar pct={n / Math.max(total, 1) * 100} color={TIER_BG[t]} />
                </div>
              ))}
            </div>
            <div style={S.divider} />
            <div>
              <div style={{ ...S.sectionTitle, fontSize: 10, marginBottom: 6 }}>By relationship depth</div>
              {depthCounts.map(({ d, n }) => (
                <div key={d} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span>{d}</span><strong>{n}</strong></div>
                  <ProgressBar pct={n / Math.max(total, 1) * 100} color={HEALTH_COLOR[d]} />
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={S.sectionTitle}>Recent Activity</div>
              {!isReadOnly(currentUser) && <Btn style={{ ...S.btnTeal, ...S.btnSm }} onClick={onLogMeeting}>+ Log Meeting</Btn>}
            </div>
            {recent.length === 0
              ? <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>No meetings logged yet</div>
              : recent.map(m => {
                const occ = occs.find(o => o.id === m.occupierId);
                return (
                  <div key={m.id} style={S.activityLine}>
                    {m.createdBy && <Avatar name={m.createdBy} size={26} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => occ && onGotoOcc(occ.id)}>🏢 {occ?.name || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>{m.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.type}{m.createdBy ? ` · by ${m.createdBy}` : ""}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(m.notes || "").replace(/\n/g, " ")}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Key Contact Form ─────────────────────────────────────────────────────────
function ContactModal({ occupierId, currentUser, onSave, onCancel, editContact = null }: any) {
  const blank = { name: "", designation: "", email: "", phone: "", isPrimary: false };
  const [f, setF] = useState(editContact ? { name: editContact.name || "", designation: editContact.designation || "", email: editContact.email || "", phone: editContact.phone || "", isPrimary: editContact.isPrimary || false } : blank);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isEdit = !!editContact;
  return (
    <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modal, maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>{isEdit ? "Edit Contact" : "Add Key Contact"}</h2>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Name *</label><Input value={f.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
          <div style={S.formGroup}><label style={S.label}>Designation</label><Input value={f.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Head of Facilities" /></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Email</label><Input type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Phone</label><Input value={f.phone} onChange={e => set("phone", e.target.value)} /></div>
        </div>
        <div style={S.formGroup}><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={f.isPrimary} onChange={e => set("isPrimary", e.target.checked)} />Primary contact</label></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn style={S.btnPrimary} onClick={() => { if (!f.name.trim()) return; isEdit ? onSave({ ...editContact, ...f }) : onSave({ ...f, occupierId, id: genId(), createdBy: currentUser.name }); }}>✓ {isEdit ? "Update Contact" : "Save Contact"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Occupier Detail ──────────────────────────────────────────────────────────
function OccupierDetail({ occ, meets, contacts, actionItems, currentUser, onBack, onEdit, onDeleteOcc, onAddMeeting, onDeleteMeeting, onAddContact, onDeleteContact, onEditContact, onUpdateActionItem }: any) {
  const occMeets = [...meets.filter(m => m.occupierId === occ.id)].sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
  const occContacts = contacts.filter(c => c.occupierId === occ.id);
  const months = leaseMonths(occ.leaseExpiry);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContactLocal, setEditContactLocal] = useState(null);
  return (
    <div>
      <button style={{ ...S.btn, background: "none", border: "none", padding: 0, color: "var(--text-muted)", marginBottom: 14, fontSize: 13 }} onClick={onBack}>← Back to all occupiers</button>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>🏢 {occ.name}</span>
              <TierBadge tier={occ.tier} />
              <DepthBadge depth={occ.depth} />
              <Badge label={`${occ.risk} risk`} bg={occ.risk === "High" ? "rgba(239,68,68,0.1)" : occ.risk === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)"} color={RISK_COLOR[occ.risk]} />
              {occ.renewalStatus && <Badge label={occ.renewalStatus} bg="rgba(139,92,246,0.1)" color="#7c3aed" />}
              {occ.gccClassification && <Badge label={occ.gccClassification} bg="rgba(59,130,246,0.1)" color="#1d4ed8" />}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>📍 {occ.city || "—"}</span>
              <span>🏭 {occ.sector || "—"}</span>
              {occ.sqft && <span>📐 {fmtNum(occ.sqft)} sq ft</span>}
              {occ.asset && <span>🏗 {occ.asset}</span>}
              {occ.building && <span>🏛 {occ.building}</span>}
              {occ.unitFloor && <span>📌 {occ.unitFloor}</span>}
              <span>👤 Owner: {occ.owner || "Unassigned"}</span>
              {occ.relationshipTenure && <span>📅 Tenant since: {occ.relationshipTenure}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn style={S.btnSm} onClick={onEdit} disabled={isReadOnly(currentUser)}>{isReadOnly(currentUser) ? "👁 View only" : "✏️ Edit"}</Btn>
            {!isReadOnly(currentUser) && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm(`Delete ${occ.name}? This will remove all their meetings and contacts.`)) onDeleteOcc(occ.id); }}>🗑 Delete</Btn>}
          </div>
        </div>
        <div style={{ ...S.grid3, marginBottom: occ.notes ? 12 : 0 }}>
          <div style={S.statCard}><div style={S.statLabel}>Lease Expiry</div><div style={{ ...S.statValue, fontSize: 17 }}>{occ.leaseExpiry || "—"}</div>{months !== null && <div style={{ ...S.statSub, color: months < 12 ? "#c0392b" : months < 24 ? "#d97706" : "#065f46" }}>{months > 0 ? `${months} months away` : "Expired"}</div>}</div>
          <div style={S.statCard}><div style={S.statLabel}>Leased Area</div><div style={{ ...S.statValue, fontSize: 17 }}>{occ.sqft ? fmtNum(occ.sqft) : "—"}</div>{occ.sqft && <div style={S.statSub}>sq ft</div>}</div>
          <div style={S.statCard}><div style={S.statLabel}>Meetings Logged</div><div style={S.statValue}>{occMeets.length}</div><div style={S.statSub}>{occMeets.length > 0 ? `Last: ${occMeets[0].date}` : "No meetings yet"}</div></div>
        </div>
        {occ.notes && <div style={{ padding: "10px 12px", background: "var(--input-bg)", borderRadius: 8, fontSize: 13, lineHeight: 1.7, borderLeft: "3px solid #0d9488", whiteSpace: "pre-wrap" }}>{occ.notes}</div>}
      </div>

      {/* Key Contacts */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...S.sectionTitle, margin: 0 }}>Key Contacts ({occContacts.length})</div>
        {!isReadOnly(currentUser) && <Btn style={{ ...S.btnSm, ...S.btnPrimary }} onClick={() => setShowContactModal(true)}>+ Add Contact</Btn>}
      </div>
      {occContacts.length === 0
        ? <div style={{ ...S.card, textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>No contacts added yet.</div>
        : (
          <div style={S.card}>
            {occContacts.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <Avatar name={c.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name} {c.isPrimary && <span style={{ ...S.badge, background: "#0d9488", color: "#fff", fontSize: 9, padding: "3px 8px" }}>PRIMARY</span>}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.designation || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, marginTop: 2 }}>
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                  </div>
                </div>
                {!isReadOnly(currentUser) && <div style={{ display: "flex", gap: 6 }}><Btn style={S.btnSm} onClick={() => setEditContactLocal(c)}>✏️</Btn><Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm(`Delete contact ${c.name}?`)) onDeleteContact(c.id); }}>🗑</Btn></div>}
              </div>
            ))}
          </div>
        )}

      {/* Meeting Log */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...S.sectionTitle, margin: 0 }}>Meeting log ({occMeets.length})</div>
        {!isReadOnly(currentUser) && <Btn style={S.btnTeal} onClick={onAddMeeting}>+ Log Meeting</Btn>}
      </div>
      {occMeets.length === 0
        ? <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>No meetings logged yet.</div>
        : occMeets.map(m => {
          const meetAIs = actionItems.filter(a => a.meetingId === m.id);
          return (
            <div key={m.id} style={S.meetingItem}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>{m.date}</strong>
                  <Badge label={m.type} bg="var(--border-light)" color="var(--text-muted)" />
                  <OutcomeBadge outcome={m.outcome || "Neutral"} />
                  {m.department && <Badge label={m.department} bg="rgba(139,92,246,0.1)" color="#7c3aed" />}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <CopySynopsisBtn meeting={m} occName={occ.name} actionItems={meetAIs} />
                  <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete this meeting?")) onDeleteMeeting(m.id); }} disabled={isReadOnly(currentUser)}>🗑</Btn>
                </div>
              </div>
              {m.attendees && <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>👥 {m.attendees}</div>}
              {m.followUpDate && <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 4 }}>📅 Follow-up: {m.followUpDate}</div>}
              {m.relationshipOwner && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>👤 Rel. Owner: {m.relationshipOwner}</div>}
              <div style={{ fontSize: 13, color: "var(--text-strong)", lineHeight: 1.6, background: "var(--input-bg)", padding: "12px", borderRadius: 8, borderLeft: "3px solid #0d9488", whiteSpace: "pre-wrap", marginBottom: 8 }}>{m.notes}</div>
              {meetAIs.length > 0 && (
                <div style={{ background: "rgba(217,119,6,0.08)", padding: 12, borderRadius: 8, borderLeft: "3px solid #d97706" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 8, textTransform: "uppercase" }}>Action Items</div>
                  {meetAIs.map(ai => (
                    <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
                      {!isReadOnly(currentUser)
                        ? <button onClick={() => { const nx: any = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" }; onUpdateActionItem(ai.id, nx[ai.status]); }} style={{ background: (ACTION_STATUS_BG as any)[ai.status] || "#f3f4f6", color: (ACTION_STATUS_COLOR as any)[ai.status] || "#374151", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} title="Click to advance status">{ai.status} →</button>
                        : <ActionStatusBadge status={ai.status} />}
                      <span style={{ flex: 1 }}>{ai.description}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Owner: {ai.owner || "—"} · Due: {ai.dueDate || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              {!meetAIs.length && m.actions && (
                <div style={{ fontSize: 13, background: "rgba(217,119,6,0.1)", padding: 12, borderRadius: 8, borderLeft: "3px solid #d97706", whiteSpace: "pre-wrap" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4, textTransform: "uppercase" }}>Action items</div>{m.actions}
                </div>
              )}
              {m.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><Avatar name={m.createdBy} size={16} />Logged by {m.createdBy}{m.createdAt ? ` · ${fmtDateTime(m.createdAt)}` : ""}</div>}
            </div>
          );
        })}
      {(showContactModal || editContactLocal) && <ContactModal occupierId={occ.id} currentUser={currentUser} editContact={editContactLocal} onSave={(c) => { if (editContactLocal) { onEditContact(c); setEditContactLocal(null); } else { onAddContact(c); setShowContactModal(false); } }} onCancel={() => { setShowContactModal(false); setEditContactLocal(null); }} />}
    </div>
  );
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────
function EventModal({ occs, currentUser, defaultDate, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", occupierId: "", eventDate: defaultDate || today(), eventType: "Planned Occupier Connect", recurrence: "None", reminderDays: 3, notes: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modal, maxWidth: 540 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>Add Engagement Event</h2>
        <div style={S.formGroup}><label style={S.label}>Title *</label><Input value={f.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Q2 Occupier Connect" autoFocus /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Date *</label><Input type="date" value={f.eventDate} onChange={e => set("eventDate", e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Event Type</label><Select value={f.eventType} onChange={e => set("eventType", e.target.value)}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Occupier (optional)</label><Select value={f.occupierId} onChange={e => set("occupierId", e.target.value)}><option value="">All / Portfolio-wide</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div>
          <div style={S.formGroup}><label style={S.label}>Recurrence</label><Select value={f.recurrence} onChange={e => set("recurrence", e.target.value)}>{RECURRENCES.map(r => <option key={r}>{r}</option>)}</Select></div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Reminder (days before)</label><Input type="number" value={f.reminderDays} onChange={e => set("reminderDays", parseInt(e.target.value) || 0)} min={0} max={30} style={{ width: 120 }} /></div>
        <div style={S.formGroup}><label style={S.label}>Notes</label><Textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 70 }} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn style={S.btnPrimary} onClick={() => { if (!f.title.trim() || !f.eventDate) return; onSave({ ...f, id: genId(), createdBy: currentUser.name }); }}>✓ Add Event</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
function CalendarTab({ events, meets, occs, currentUser, onAddEvent, onDeleteEvent }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [defaultDate, setDefaultDate] = useState(null);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;
  const eventsByDate = {};
  events.forEach(e => {
    const d = e.eventDate?.slice(0, 10);
    if (d) { if (!eventsByDate[d]) eventsByDate[d] = []; eventsByDate[d].push({ ...e, _kind: "event" }); }
  });
  meets.forEach(m => {
    if (m.followUpDate) {
      const d = m.followUpDate.slice(0, 10);
      if (!eventsByDate[d]) eventsByDate[d] = [];
      const occ = occs.find(o => o.id === m.occupierId);
      eventsByDate[d].push({ id: m.id + "_fu", title: `Follow-up: ${occ?.name || "Meeting"}`, eventType: "Recurring Meeting", _kind: "followup" });
    }
  });
  const todayStr = today();
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const upcomingLimit = new Date(); upcomingLimit.setDate(upcomingLimit.getDate() + 30);
  const upcomingEvents = [...events].filter(e => { const d = new Date(e.eventDate); return d >= new Date(todayStr) && d <= upcomingLimit; }).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>Engagement Calendar</h2>
        {!isReadOnly(currentUser) && <Btn style={S.btnPrimary} onClick={() => { setDefaultDate(today()); setShowEventModal(true); }}>+ Add Event</Btn>}
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Btn style={S.btnSm} onClick={prevMonth}>‹ Prev</Btn>
            <strong style={{ fontSize: 15 }}>{monthName}</strong>
            <Btn style={S.btnSm} onClick={nextMonth}>Next ›</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = dateStr(day);
              const dayEvents = eventsByDate[ds] || [];
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDay;
              return (
                <div key={day} onClick={() => setSelectedDay(ds === selectedDay ? null : ds)}
                  style={{ padding: "6px 2px", borderRadius: 8, cursor: "pointer", background: isSelected ? "#0d9488" : isToday ? "rgba(13,148,136,0.15)" : "transparent", border: isToday ? "1px solid #0d9488" : "1px solid transparent", transition: "all .15s" }}>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isSelected ? "#fff" : "var(--text-strong)" }}>{day}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", marginTop: 2 }}>
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280" }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EVENT_TYPES.map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_TYPE_COLORS[t] || "#6b7280" }} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div>
          {selectedDay && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ ...S.sectionTitle, margin: "0 0 12px" }}>{selectedDay} — {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</div>
              {selectedDayEvents.length === 0
                ? <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>No events on this day.</div>
                : selectedDayEvents.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ev.eventType}{ev.recurrence && ev.recurrence !== "None" ? ` · ${ev.recurrence}` : ""}</div>
                      {ev.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{ev.notes}</div>}
                    </div>
                    {!isReadOnly(currentUser) && ev._kind === "event" && (
                      <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete this event?")) onDeleteEvent(ev.id); }}>🗑</Btn>
                    )}
                  </div>
                ))}
              {!isReadOnly(currentUser) && (
                <Btn style={{ ...S.btnPrimary, ...S.btnSm, marginTop: 12 }} onClick={() => { setDefaultDate(selectedDay); setShowEventModal(true); }}>+ Add event on this day</Btn>
              )}
            </div>
          )}
          <div style={S.card}>
            <div style={S.sectionTitle}>Upcoming Events (next 30 days)</div>
            {upcomingEvents.length === 0
              ? <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>No upcoming events</div>
              : upcomingEvents.map(ev => {
                const occ = ev.occupierId ? occs.find(o => o.id === ev.occupierId) : null;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280", flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ev.eventDate} · {ev.eventType}{occ ? ` · ${occ.name}` : ""}</div>
                    </div>
                    {ev.recurrence && ev.recurrence !== "None" && <Badge label={ev.recurrence} bg="rgba(139,92,246,0.1)" color="#7c3aed" />}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {showEventModal && <EventModal occs={occs} currentUser={currentUser} defaultDate={defaultDate} onSave={(ev) => { onAddEvent(ev); setShowEventModal(false); }} onCancel={() => setShowEventModal(false)} />}
    </div>
  );
}

// ─── TAT Tracker Tab ─────────────────────────────────────────────────────────
function TasksTab({ actionItems, meets, occs, currentUser, onUpdateStatus }: any) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOcc, setFilterOcc] = useState("");
  const nextStatus: any = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" };
  const enriched = actionItems.map((ai: any) => {
    const meet = meets.find((m: any) => m.id === ai.meetingId);
    const occ = meet ? occs.find((o: any) => o.id === meet.occupierId) : null;
    return { ...ai, meetDate: meet?.date, occName: occ?.name || "Unknown", occId: occ?.id };
  }).filter((ai: any) => {
    if (filterStatus && ai.status !== filterStatus) return false;
    if (filterOcc && ai.occId !== filterOcc) return false;
    return true;
  }).sort((a: any, b: any) => {
    const order: any = { Open: 0, "In Progress": 1, Closed: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const counts: any = { Open: 0, "In Progress": 0, Closed: 0 };
  actionItems.forEach((ai: any) => { if (counts[ai.status] !== undefined) counts[ai.status]++; });
  const exportCSV = () => {
    const rows = [["Occupier", "Meeting Date", "Action Item", "Owner", "Due Date", "Status"],
      ...enriched.map((ai: any) => [ai.occName, ai.meetDate || "—", ai.description, ai.owner || "—", ai.dueDate || "—", ai.status])];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "action-items.csv" }).click();
    URL.revokeObjectURL(url);
  };
  const statusColors: any = { Open: "#ef4444", "In Progress": "#f59e0b", Closed: "#10b981" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>TAT Tracker — Action Items</h2>
        <Btn style={S.btnSm} onClick={exportCSV}>⬇ Export CSV</Btn>
      </div>
      <div style={{ ...S.grid3, marginBottom: 24 }}>
        {(["Open", "In Progress", "Closed"] as const).map(s => (
          <div key={s} style={{ ...S.statCard, borderLeft: `4px solid ${statusColors[s]}`, cursor: "pointer", outline: filterStatus === s ? `2px solid ${statusColors[s]}` : "none" }} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}>
            <div style={{ ...S.statLabel, color: statusColors[s] }}>{s}</div>
            <div style={{ ...S.statValue, color: statusColors[s] }}>{counts[s]}</div>
            <div style={S.statSub}>Click to filter</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Select style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus((e.target as any).value)}>
          <option value="">All statuses</option>{ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}
        </Select>
        <Select style={{ width: "auto" }} value={filterOcc} onChange={e => setFilterOcc((e.target as any).value)}>
          <option value="">All occupiers</option>{occs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        {(filterStatus || filterOcc) && <Btn style={S.btnSm} onClick={() => { setFilterStatus(""); setFilterOcc(""); }}>✕ Clear</Btn>}
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{enriched.length} item{enriched.length !== 1 ? "s" : ""}</span>
      </div>
      {enriched.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 13 }}>{actionItems.length === 0 ? "No action items yet — add them when logging a meeting." : "No items match your filter."}</div>
        : <div style={S.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-med)" }}>
                    {["Status", "Occupier", "Meeting Date", "Action Item", "Owner", "Due Date"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((ai: any) => {
                    const overdue = ai.dueDate && ai.status !== "Closed" && new Date(ai.dueDate) < new Date(today());
                    return (
                      <tr key={ai.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          {!isReadOnly(currentUser)
                            ? <button onClick={() => onUpdateStatus(ai.id, nextStatus[ai.status])} style={{ background: (ACTION_STATUS_BG as any)[ai.status] || "#f3f4f6", color: (ACTION_STATUS_COLOR as any)[ai.status] || "#374151", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }} title={`→ ${nextStatus[ai.status]}`}>{ai.status} →</button>
                            : <ActionStatusBadge status={ai.status} />}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{ai.occName}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{ai.meetDate || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{ai.description}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{ai.owner || "—"}</td>
                        <td style={{ padding: "10px 12px", color: overdue ? "#ef4444" : "var(--text-muted)", fontWeight: overdue ? 700 : 400, whiteSpace: "nowrap" }}>{ai.dueDate || "—"}{overdue ? " ⚠️" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ occs, meets }: any) {
  const teamMap = {};
  meets.forEach(m => {
    const u = m.createdBy || "Unknown";
    if (!teamMap[u]) teamMap[u] = { user: u, count: 0, lastDate: null, occIds: new Set() };
    teamMap[u].count++;
    if (!teamMap[u].lastDate || m.date > teamMap[u].lastDate) teamMap[u].lastDate = m.date;
    teamMap[u].occIds.add(m.occupierId);
  });
  const teamRows = Object.values(teamMap).sort((a, b) => b.count - a.count);
  const coverageRows = occs.map(o => {
    const occMeets = meets.filter(m => m.occupierId === o.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastDate = occMeets[0]?.date;
    const days = lastDate ? daysBetween(lastDate) : null;
    const cadence = TIER_CADENCE[o.tier] || 90;
    const status = days === null ? "Never Met" : days > cadence ? "Overdue" : "On Track";
    return { ...o, lastDate, daysSince: days, cadence, status };
  }).sort((a, b) => (b.daysSince || 9999) - (a.daysSince || 9999));
  const rdiCounts = { High: 0, Medium: 0, Low: 0 };
  occs.forEach(o => { const rdi = DEPT_TO_RDI[o.depth] || "Low"; rdiCounts[rdi]++; });
  const totalOccs = occs.length || 1;
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleString("en-IN", { month: "short" });
    const count = meets.filter(m => m.date?.startsWith(`${y}-${mo}`)).length;
    trendData.push({ label, count });
  }
  const maxTrend = Math.max(...trendData.map(x => x.count), 1);
  const tBarW = 48; const tBarGap = 16; const tChartH = 100;
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--text-strong)" }}>Analytics & Reports</h2>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.sectionTitle}>RDI Health Distribution</div>
          {["High", "Medium", "Low"].map(rdi => (
            <div key={rdi} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: RDI_COLORS[rdi] }}>{rdi} RDI</span>
                <span>{rdiCounts[rdi]} ({Math.round(rdiCounts[rdi] / totalOccs * 100)}%)</span>
              </div>
              <div style={{ height: 12, background: "var(--border-med)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${rdiCounts[rdi] / totalOccs * 100}%`, background: RDI_COLORS[rdi], borderRadius: 6, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>Meetings Trend — Last 6 Months</div>
          <svg width="100%" viewBox={`0 0 ${trendData.length * (tBarW + tBarGap) + 20} ${tChartH + 50}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            {trendData.map(({ label, count }, i) => {
              const x = 10 + i * (tBarW + tBarGap);
              const h = Math.max(4, (count / maxTrend) * tChartH);
              return (
                <g key={label}>
                  <rect x={x} y={tChartH - h} width={tBarW} height={h} rx={5} fill="url(#trendGrad)" opacity={0.9} />
                  <text x={x + tBarW / 2} y={tChartH - h - 6} textAnchor="middle" fill="var(--text-strong)" fontSize={12} fontWeight={700}>{count}</text>
                  <text x={x + tBarW / 2} y={tChartH + 18} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Team Engagement Summary</div>
          <Btn style={S.btnSm} onClick={() => {
            const rows = [["Team Member","Total Meetings","Last Meeting","Occupiers Covered"], ...teamRows.map((r: any) => [r.user, r.count, r.lastDate || "—", r.occIds.size])];
            const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
            const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
            Object.assign(document.createElement("a"),{href:url,download:"team-engagement.csv"}).click();
            URL.revokeObjectURL(url);
          }}>⬇ Export CSV</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-med)" }}>
                {["Team Member", "Total Meetings", "Last Meeting", "Occupiers Covered"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamRows.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No meeting data</td></tr>
                : teamRows.map(row => (
                  <tr key={row.user} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={row.user} size={26} />{row.user}</div></td>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.count}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{row.lastDate || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.occIds.size}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Occupier Coverage</div>
          <Btn style={S.btnSm} onClick={() => {
            const rows = [["Occupier","Tier","Last Meeting","Days Since","Cadence (days)","Status"], ...coverageRows.map((r: any) => [r.name, r.tier, r.lastDate || "Never", r.daysSince !== null ? r.daysSince : "—", r.cadence, r.status])];
            const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
            const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
            Object.assign(document.createElement("a"),{href:url,download:"occupier-coverage.csv"}).click();
            URL.revokeObjectURL(url);
          }}>⬇ Export CSV</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-med)" }}>
                {["Occupier", "Tier", "Last Meeting", "Days Since", "Cadence", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverageRows.map(row => {
                const statusColor = row.status === "On Track" ? "#10b981" : row.status === "Overdue" ? "#ef4444" : "#f59e0b";
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "10px 12px" }}><TierBadge tier={row.tier} /></td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{row.lastDate || "Never"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: row.daysSince && row.daysSince > row.cadence ? "#ef4444" : "var(--text-strong)" }}>{row.daysSince !== null ? `${row.daysSince}d` : "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{row.cadence}d</td>
                    <td style={{ padding: "10px 12px" }}><Badge label={row.status} bg={statusColor + "22"} color={statusColor} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [audit, setAudit] = useState([]);
  const [occs, setOccs] = useState([]);
  const [meets, setMeets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [selectedOccId, setSelectedOccId] = useState(null);
  const [showOccForm, setShowOccForm] = useState(false);
  const [editOcc, setEditOcc] = useState(null);
  const [showMeetForm, setShowMeetForm] = useState(false);
  const [preOccId, setPreOccId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterDepth, setFilterDepth] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [editMeet, setEditMeet] = useState(null);
  const [editContact, setEditContact] = useState(null);
  const [filterMeetSearch, setFilterMeetSearch] = useState("");
  const [filterMeetOcc, setFilterMeetOcc] = useState("");
  const [filterMeetOutcome, setFilterMeetOutcome] = useState("");
  const [filterMeetDept, setFilterMeetDept] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [uR, oR, mR, aR, cR, aiR, evR] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('occupiers').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(500),
        supabase.from('key_contacts').select('*'),
        supabase.from('action_items').select('*'),
        supabase.from('engagement_events').select('*').order('event_date', { ascending: true }),
      ]);
      if (uR.data) setUsers(uR.data.map(mapUser));
      if (oR.data) setOccs(oR.data.map(mapOcc));
      if (mR.data) setMeets(mR.data.map(mapMeet));
      if (aR.data) setAudit(aR.data.map(mapAudit));
      if (cR.data) setContacts(cR.data.map(mapContact));
      if (aiR.data) setActionItems(aiR.data.map(mapActionItem));
      if (evR.data) setEvents(evR.data.map(mapEvent));
      setLastSync(new Date());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (users.length === 0) return;
    try {
      const s = localStorage.getItem(SK_SESSION);
      if (s) {
        const sd = JSON.parse(s);
        const u = users.find(x => x.id === sd.id && x.active !== false);
        if (u) setCurrentUser(u);
      }
    } catch (e) {}
  }, [users.length]);

  useEffect(() => { const iv = setInterval(loadAll, 30000); return () => clearInterval(iv); }, [loadAll]);

  const addAudit = async (user, action, target = "") => {
    const entry = { user_name: user, action, target, at: tsNow() };
    await supabase.from('audit_log').insert([entry]);
    setAudit(prev => [{ id: genId(), user, action, target, at: entry.at }, ...prev].slice(0, 500));
  };

  const handleFirstRun = async ({ name, role, pass }) => {
    const passHash = await hashCode(pass);
    const dbUser = { name, role, is_admin: true, is_active: true, password_hash: passHash, created_by: name };
    const { data, error } = await supabase.from('users').insert([dbUser]).select();
    if (error) throw error;
    const admin = mapUser(data[0]);
    await addAudit(admin.name, "set up CRM as admin");
    setUsers([admin]); setCurrentUser(admin);
    try { localStorage.setItem(SK_SESSION, JSON.stringify({ id: admin.id })); } catch (e) {}
  };

  const handleSignUp = async ({ name, role, pass }) => {
    const { data: latestUsersData } = await supabase.from('users').select('*');
    const latestUsers = latestUsersData ? latestUsersData.map(mapUser) : users;
    if (latestUsers.some(u => u.name.toLowerCase() === name.toLowerCase())) throw new Error("Name already exists");
    const passHash = await hashCode(pass);
    const dbUser = { name, role, is_admin: false, is_active: true, password_hash: passHash, created_by: "Self" };
    const { data, error } = await supabase.from('users').insert([dbUser]).select();
    if (error) throw error;
    const u = mapUser(data[0]);
    setUsers([...latestUsers, u]);
    await addAudit(name, "self-registered as new user");
    setCurrentUser(u);
    try { localStorage.setItem(SK_SESSION, JSON.stringify({ id: u.id })); } catch (e) {}
  };

  const handleLogin = async (user) => {
    setCurrentUser(user);
    await addAudit(user.name, "signed in");
    try { localStorage.setItem(SK_SESSION, JSON.stringify({ id: user.id })); } catch (e) {}
  };

  const handleLogout = async () => {
    if (currentUser) await addAudit(currentUser.name, "signed out");
    setCurrentUser(null);
    try { localStorage.removeItem(SK_SESSION); } catch (e) {}
  };

  const handleAddUser = async ({ name, role, isAdmin, pass }) => {
    const passHash = await hashCode(pass);
    const dbUser = { name, role, is_admin: isAdmin, is_active: true, password_hash: passHash, created_by: currentUser.name };
    const { data, error } = await supabase.from('users').insert([dbUser]).select();
    if (error) throw error;
    const u = mapUser(data[0]);
    setUsers(prev => [...prev, u]);
    await addAudit(currentUser.name, `added user${isAdmin ? " (admin)" : ""}`, name);
  };

  const handleResetPass = async (uid, newPass) => {
    const passHash = await hashCode(newPass);
    await supabase.from('users').update({ password_hash: passHash }).eq('id', uid);
    const target = users.find(u => u.id === uid);
    setUsers(users.map(u => u.id === uid ? { ...u, passHash } : u));
    await addAudit(currentUser.name, "reset passcode for", target?.name || "user");
  };

  const handleToggleActive = async (uid) => {
    const target = users.find(u => u.id === uid);
    const newActive = target.active === false ? true : false;
    await supabase.from('users').update({ is_active: newActive }).eq('id', uid);
    setUsers(users.map(u => u.id === uid ? { ...u, active: newActive } : u));
    await addAudit(currentUser.name, newActive ? "reactivated" : "deactivated", target?.name);
  };

  const handleToggleAdmin = async (uid) => {
    const target = users.find(u => u.id === uid);
    if (!target) return;
    const adminCount = users.filter(u => u.isAdmin && u.active !== false).length;
    if (target.isAdmin && adminCount <= 1) { alert("Cannot demote — at least one admin must remain."); return; }
    const newIsAdmin = !target.isAdmin;
    await supabase.from('users').update({ is_admin: newIsAdmin }).eq('id', uid);
    setUsers(users.map(u => u.id === uid ? { ...u, isAdmin: newIsAdmin } : u));
    await addAudit(currentUser.name, newIsAdmin ? "promoted to admin" : "demoted from admin", target.name);
  };

  const handleSaveOcc = async (occ) => {
    if (isReadOnly(currentUser)) return;
    const existing = occs.findIndex(o => o.id === occ.id);
    const now = tsNow();
    const dbOcc = {
      name: occ.name, tier: occ.tier, depth: occ.depth, sector: occ.sector, city: occ.city,
      sqft: occ.sqft ? parseInt(occ.sqft) : null, lease_expiry: occ.leaseExpiry, risk: occ.risk,
      owner: occ.owner, notes: occ.notes, gcc_classification: occ.gccClassification,
      asset: occ.asset, building: occ.building, unit_floor: occ.unitFloor,
      renewal_status: occ.renewalStatus, relationship_tenure: occ.relationshipTenure || null,
    };
    if (existing >= 0) {
      dbOcc.updated_by = currentUser.name; dbOcc.updated_at = now;
      const { data } = await supabase.from('occupiers').update(dbOcc).eq('id', occ.id).select();
      setOccs(occs.map(o => o.id === occ.id ? mapOcc(data[0]) : o));
      await addAudit(currentUser.name, "edited occupier", occ.name);
    } else {
      dbOcc.created_by = currentUser.name; dbOcc.created_at = now;
      const { data } = await supabase.from('occupiers').insert([dbOcc]).select();
      const created = mapOcc(data[0]);
      setOccs([...occs, created]);
      setSelectedOccId(created.id);
      await addAudit(currentUser.name, "added occupier", occ.name);
      setTab("occupiers");
    }
    setShowOccForm(false); setEditOcc(null);
  };

  const handleSaveMeet = async (m) => {
    if (isReadOnly(currentUser)) return;
    const occName = occs.find(o => o.id === m.occupierId)?.name || "Unknown";
    const isEdit = meets.some(x => x.id === m.id);
    const dbMeet: any = {
      occupier_id: m.occupierId, meeting_date: m.date, meeting_type: m.type,
      attendees: m.attendees, notes: m.notes, actions: m.actions, outcome: m.outcome,
      department: m.department, follow_up_date: m.followUpDate || null,
      relationship_owner: m.relationshipOwner,
    };
    if (isEdit) {
      await supabase.from('meetings').update(dbMeet).eq('id', m.id);
      setMeets(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x));
      await addAudit(currentUser.name, "edited meeting for", occName);
    } else {
      dbMeet.created_by = currentUser.name; dbMeet.created_at = tsNow();
      const { data } = await supabase.from('meetings').insert([dbMeet]).select();
      const created = mapMeet(data[0]);
      setMeets(prev => [...prev, created]);
      if (m.newActionItems && m.newActionItems.length > 0) {
        const aiRows = m.newActionItems.map(ai => ({ meeting_id: created.id, description: ai.description, owner: ai.owner, due_date: ai.dueDate || null, status: ai.status, created_at: tsNow(), updated_at: tsNow() }));
        const { data: aiData } = await supabase.from('action_items').insert(aiRows).select();
        if (aiData) setActionItems(prev => [...prev, ...aiData.map(mapActionItem)]);
      }
      await addAudit(currentUser.name, "logged meeting for", occName);
    }
    setShowMeetForm(false); setPreOccId(null); setEditMeet(null);
  };

  const handleDeleteMeet = async (id) => {
    if (isReadOnly(currentUser)) return;
    const m = meets.find(x => x.id === id);
    const occName = occs.find(o => o.id === m?.occupierId)?.name || "Unknown";
    await supabase.from('meetings').delete().eq('id', id);
    await supabase.from('action_items').delete().eq('meeting_id', id);
    setMeets(meets.filter(x => x.id !== id));
    setActionItems(prev => prev.filter(a => a.meetingId !== id));
    await addAudit(currentUser.name, "deleted meeting from", occName);
  };

  const handleAddContact = async (contact) => {
    if (isReadOnly(currentUser)) return;
    const occ = occs.find(o => o.id === contact.occupierId);
    const dbContact = { occupier_id: contact.occupierId, name: contact.name, designation: contact.designation, email: contact.email, phone: contact.phone, is_primary: contact.isPrimary, created_by: currentUser.name, created_at: tsNow() };
    const { data } = await supabase.from('key_contacts').insert([dbContact]).select();
    if (data) { setContacts(prev => [...prev, mapContact(data[0])]); await addAudit(currentUser.name, "added contact", contact.name + " @ " + (occ?.name || "")); }
  };

  const handleDeleteContact = async (id) => {
    if (isReadOnly(currentUser)) return;
    const c = contacts.find(x => x.id === id);
    await supabase.from('key_contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(x => x.id !== id));
    await addAudit(currentUser.name, "deleted contact", c?.name || "");
  };

  const handleAddEvent = async (ev) => {
    if (isReadOnly(currentUser)) return;
    const dbEv = { title: ev.title, occupier_id: ev.occupierId || null, event_date: ev.eventDate, event_type: ev.eventType, recurrence: ev.recurrence, reminder_days: ev.reminderDays, notes: ev.notes, created_by: currentUser.name, created_at: tsNow() };
    const { data } = await supabase.from('engagement_events').insert([dbEv]).select();
    if (data) { setEvents(prev => [...prev, mapEvent(data[0])].sort((a, b) => a.eventDate.localeCompare(b.eventDate))); await addAudit(currentUser.name, "added event", ev.title); }
  };

  const handleDeleteEvent = async (id) => {
    if (isReadOnly(currentUser)) return;
    const ev = events.find(x => x.id === id);
    await supabase.from('engagement_events').delete().eq('id', id);
    setEvents(prev => prev.filter(x => x.id !== id));
    await addAudit(currentUser.name, "deleted event", ev?.title || "");
  };

  const handleUpdateActionItem = async (id, newStatus) => {
    if (isReadOnly(currentUser)) return;
    await supabase.from('action_items').update({ status: newStatus, updated_at: tsNow() }).eq('id', id);
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  const handleDeleteOcc = async (id) => {
    if (isReadOnly(currentUser)) return;
    const occ = occs.find(o => o.id === id);
    if (!occ) return;
    const occMeetIds = meets.filter(m => m.occupierId === id).map(m => m.id);
    await supabase.from('occupiers').delete().eq('id', id);
    setOccs(prev => prev.filter(o => o.id !== id));
    setMeets(prev => prev.filter(m => m.occupierId !== id));
    setContacts(prev => prev.filter(c => c.occupierId !== id));
    setActionItems(prev => prev.filter(a => !occMeetIds.includes(a.meetingId)));
    setSelectedOccId(null); setTab("occupiers");
    await addAudit(currentUser.name, "deleted occupier", occ.name);
  };

  const handleEditContact = async (contact) => {
    if (isReadOnly(currentUser)) return;
    const dbContact = { name: contact.name, designation: contact.designation, email: contact.email, phone: contact.phone, is_primary: contact.isPrimary };
    await supabase.from('key_contacts').update(dbContact).eq('id', contact.id);
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, ...contact } : c));
    await addAudit(currentUser.name, "edited contact", contact.name);
  };

  const filteredOccs = useMemo(() => occs.filter(o => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !(o.city || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTier && o.tier !== filterTier) return false;
    if (filterDepth && o.depth !== filterDepth) return false;
    if (filterRisk && o.risk !== filterRisk) return false;
    return true;
  }), [occs, search, filterTier, filterDepth, filterRisk]);

  const filteredMeets = useMemo(() => [...meets].filter(m => {
    if (filterMeetOcc && m.occupierId !== filterMeetOcc) return false;
    if (filterMeetOutcome && m.outcome !== filterMeetOutcome) return false;
    if (filterMeetDept && m.department !== filterMeetDept) return false;
    if (filterMeetSearch) {
      const occ = occs.find(o => o.id === m.occupierId);
      if (!(occ?.name || "").toLowerCase().includes(filterMeetSearch.toLowerCase()) && !(m.notes || "").toLowerCase().includes(filterMeetSearch.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)),
  [meets, occs, filterMeetSearch, filterMeetOcc, filterMeetOutcome, filterMeetDept]);

  const selectedOcc = occs.find(o => o.id === selectedOccId);
  const gotoOcc = (id) => { setTab("occupiers"); setSelectedOccId(id); setShowOccForm(false); };

  const withTheme = (node) => (
    <div style={S.app} data-theme={theme}>
      <ThemeStyles />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box}`}</style>
      {node}
    </div>
  );

  if (loading) return withTheme(<div style={S.authPage}><Spinner label="Loading shared workspace..." /></div>);
  if (users.length === 0) return withTheme(<FirstRunSetup onDone={handleFirstRun} />);
  if (!currentUser) return withTheme(<LoginScreen users={users} onLogin={handleLogin} onSignUp={handleSignUp} />);

  const visibleTabs = [
    ["dashboard", "📊", "Dashboard"],
    ["occupiers", "🏢", "Occupiers"],
    ["meetings", "📝", "Meetings"],
    ["tasks", "✅", "TAT Tracker"],
    ["calendar", "📅", "Calendar"],
    ["analytics", "📈", "Analytics"],
  ];
  if (currentUser.isAdmin) visibleTabs.push(["admin", "🔐", "Admin"]);

  return (
    <div style={S.app} data-theme={theme}>
      <ThemeStyles />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box}`}</style>

      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LogoTopbar />
          <span style={S.topbarTitle}>Occupier Engagement Tracker</span>
          {lastSync && <span style={{ fontSize: 11, color: "var(--tab-color)", marginLeft: 8 }}>↻ {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, padding: 4, marginRight: 8 }} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <span style={{ fontSize: 13, color: "var(--tab-color)", marginRight: 8 }}>{occs.length} occupiers · {meets.length} meetings</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--btn-bg)", borderRadius: 12, padding: "6px 12px", border: "1px solid var(--border-light)" }}>
            <Avatar name={currentUser.name} size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>
                {currentUser.name}
                {currentUser.isAdmin && <span style={{ fontSize: 9, color: "#0d9488", marginLeft: 6 }}>● ADMIN</span>}
                {isReadOnly(currentUser) && <span style={{ fontSize: 9, color: "#fbbf24", marginLeft: 6 }}>● READ ONLY</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentUser.role}</div>
            </div>
            <button style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", marginLeft: 8, padding: 0, textDecoration: "underline" }} onClick={handleLogout}>sign out</button>
          </div>
        </div>
      </div>

      <div style={S.main}>
        {isReadOnly(currentUser) && (
          <div style={{ ...S.alertWarn, background: "#eff6ff", color: "#1e3a8a", border: ".5px solid #bfdbfe" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>👁</span>
            <div><strong>Read-only access.</strong> You can view all data but cannot add, edit, or delete records.</div>
          </div>
        )}
        <div style={S.tabs}>
          {visibleTabs.map(([id, icon, label]) => (
            <button key={id} style={{ ...S.tab, ...(tab === id ? S.tabActive : {}) }} onClick={() => { setTab(id); setSelectedOccId(null); }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <Dashboard occs={occs} meets={meets} currentUser={currentUser} onGotoOcc={gotoOcc} onLogMeeting={() => setShowMeetForm(true)} />}

        {tab === "occupiers" && !selectedOccId && (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#aaa" }}>🔍</span>
                <Input style={{ paddingLeft: 32 }} placeholder="Search by name or city..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select style={{ width: "auto" }} value={filterTier} onChange={e => setFilterTier(e.target.value)}><option value="">All tiers</option>{TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</Select>
              <Select style={{ width: "auto" }} value={filterDepth} onChange={e => setFilterDepth(e.target.value)}><option value="">All depths</option>{DEPTHS.map(d => <option key={d}>{d}</option>)}</Select>
              <Select style={{ width: "auto" }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}><option value="">All risk</option>{RISK.map(r => <option key={r}>{r}</option>)}</Select>
              {!isReadOnly(currentUser) && <Btn style={S.btnPrimary} onClick={() => { setEditOcc(null); setShowOccForm(true); }}>+ Add Occupier</Btn>}
            </div>
            <div style={{ ...S.card, padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "4px 12px 8px", fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".05em", gap: 10, borderBottom: ".5px solid var(--border-light)", marginBottom: 4 }}>
                <div style={{ width: 9 }} /><div style={{ flex: 1 }}>Name</div><div style={{ width: 110 }}>Tier</div><div style={{ width: 90 }}>Depth</div><div style={{ width: 90 }}>City</div><div style={{ width: 70 }}>Risk</div><div style={{ width: 80 }}>GCC</div><div style={{ width: 100 }}>Last meeting</div><div style={{ width: 80 }}>Added by</div><div style={{ width: 20 }} />
              </div>
              {filteredOccs.length === 0
                ? <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>No occupiers match your filters</div>
                : filteredOccs.map(o => {
                  const occMeets = meets.filter(m => m.occupierId === o.id).sort((a, b) => b.date.localeCompare(a.date));
                  const last = occMeets[0];
                  return (
                    <div key={o.id} style={S.occRow} onClick={() => setSelectedOccId(o.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--occ-hover)"; e.currentTarget.style.borderColor = "var(--border-light)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: HEALTH_COLOR[o.depth] || "#ccc", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{o.name}</div>
                      <div style={{ width: 110 }}><TierBadge tier={o.tier} /></div>
                      <div style={{ width: 90 }}><DepthBadge depth={o.depth} /></div>
                      <div style={{ width: 90, fontSize: 12, color: "var(--text-muted)" }}>{o.city || "—"}</div>
                      <div style={{ width: 70, fontSize: 12, fontWeight: 600, color: RISK_COLOR[o.risk] }}>{o.risk}</div>
                      <div style={{ width: 80, fontSize: 12, color: "var(--text-muted)" }}>{o.gccClassification || "—"}</div>
                      <div style={{ width: 100, fontSize: 12, color: "var(--text-muted)" }}>{last ? last.date : "None"}</div>
                      <div style={{ width: 80 }}>{o.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar name={o.createdBy} size={18} /><span style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 50 }}>{o.createdBy.split(" ")[0]}</span></div>}</div>
                      <div style={{ width: 20, color: "#ccc", fontSize: 14 }}>›</div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tab === "occupiers" && selectedOccId && selectedOcc && (
          <OccupierDetail
            occ={selectedOcc} meets={meets} contacts={contacts} actionItems={actionItems} currentUser={currentUser}
            onBack={() => setSelectedOccId(null)}
            onEdit={() => { setEditOcc(selectedOcc); setShowOccForm(true); }}
            onDeleteOcc={handleDeleteOcc}
            onAddMeeting={() => { setPreOccId(selectedOccId); setShowMeetForm(true); }}
            onDeleteMeeting={handleDeleteMeet}
            onAddContact={handleAddContact}
            onDeleteContact={handleDeleteContact}
            onEditContact={handleEditContact}
            onUpdateActionItem={handleUpdateActionItem}
          />
        )}

        {tab === "meetings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ ...S.sectionTitle, margin: 0 }}>All meetings ({filteredMeets.length}{filteredMeets.length !== meets.length ? ` of ${meets.length}` : ""})</div>
              {!isReadOnly(currentUser) && <Btn style={S.btnPrimary} onClick={() => { setEditMeet(null); setShowMeetForm(true); }}>+ Log Meeting</Btn>}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#aaa" }}>🔍</span>
                <Input style={{ paddingLeft: 32 }} placeholder="Search occupier or notes..." value={filterMeetSearch} onChange={e => setFilterMeetSearch(e.target.value)} />
              </div>
              <Select style={{ width: "auto" }} value={filterMeetOcc} onChange={e => setFilterMeetOcc(e.target.value)}><option value="">All occupiers</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
              <Select style={{ width: "auto" }} value={filterMeetOutcome} onChange={e => setFilterMeetOutcome(e.target.value)}><option value="">All outcomes</option>{OUTCOMES.map(o => <option key={o}>{o}</option>)}</Select>
              <Select style={{ width: "auto" }} value={filterMeetDept} onChange={e => setFilterMeetDept(e.target.value)}><option value="">All departments</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</Select>
              {(filterMeetSearch || filterMeetOcc || filterMeetOutcome || filterMeetDept) && <Btn style={S.btnSm} onClick={() => { setFilterMeetSearch(""); setFilterMeetOcc(""); setFilterMeetOutcome(""); setFilterMeetDept(""); }}>✕ Clear</Btn>}
            </div>
            {filteredMeets.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 13 }}>{meets.length === 0 ? "No meetings logged yet." : "No meetings match your filter."}</div>
              : filteredMeets.map(m => {
                const occ = occs.find(o => o.id === m.occupierId);
                const meetAIs = actionItems.filter(a => a.meetingId === m.id);
                return (
                  <div key={m.id} style={S.meetingItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, cursor: "pointer", color: "var(--text-strong)" }} onClick={() => occ && gotoOcc(occ.id)}>🏢 {occ?.name || "Unknown"}</span>
                          {occ && <TierBadge tier={occ.tier} />}
                          <OutcomeBadge outcome={m.outcome || "Neutral"} />
                          {m.department && <Badge label={m.department} bg="rgba(139,92,246,0.1)" color="#7c3aed" />}
                        </div>
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
                          <span>{m.date}</span><span>{m.type}</span>{m.attendees && <span>👥 {m.attendees}</span>}
                          {m.followUpDate && <span style={{ color: "#f59e0b" }}>📅 {m.followUpDate}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <CopySynopsisBtn meeting={m} occName={occ?.name || "Unknown"} actionItems={meetAIs} />
                        {!isReadOnly(currentUser) && <Btn style={S.btnSm} onClick={() => { setEditMeet(m); setShowMeetForm(true); }}>✏️ Edit</Btn>}
                        {!isReadOnly(currentUser) && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete this meeting?")) handleDeleteMeet(m.id); }}>🗑</Btn>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, background: "var(--input-bg)", padding: "12px", borderRadius: 8, borderLeft: "3px solid #0d9488", whiteSpace: "pre-wrap", marginBottom: meetAIs.length || m.actions ? 8 : 0 }}>{m.notes}</div>
                    {meetAIs.length > 0 && (
                      <div style={{ background: "rgba(217,119,6,0.08)", padding: 12, borderRadius: 8, borderLeft: "3px solid #d97706" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 8, textTransform: "uppercase" }}>Action Items</div>
                        {meetAIs.map(ai => (
                          <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
                            {!isReadOnly(currentUser)
                              ? <button onClick={() => { const nx: any = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" }; handleUpdateActionItem(ai.id, nx[ai.status]); }} style={{ background: (ACTION_STATUS_BG as any)[ai.status] || "#f3f4f6", color: (ACTION_STATUS_COLOR as any)[ai.status] || "#374151", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} title="Click to advance status">{ai.status} →</button>
                              : <ActionStatusBadge status={ai.status} />}
                            <span style={{ flex: 1 }}>{ai.description}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Owner: {ai.owner || "—"} · Due: {ai.dueDate || "—"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!meetAIs.length && m.actions && (
                      <div style={{ fontSize: 13, lineHeight: 1.6, background: "rgba(217,119,6,0.1)", color: "var(--text-strong)", padding: "12px", borderRadius: 8, borderLeft: "3px solid #d97706", whiteSpace: "pre-wrap" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4, textTransform: "uppercase" }}>Action items</div>{m.actions}
                      </div>
                    )}
                    {m.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><Avatar name={m.createdBy} size={16} />Logged by <strong style={{ color: "var(--text-muted)" }}>{m.createdBy}</strong>{m.createdAt ? ` · ${fmtDateTime(m.createdAt)}` : ""}</div>}
                  </div>
                );
              })}
          </div>
        )}

        {tab === "tasks" && (
          <TasksTab actionItems={actionItems} meets={meets} occs={occs} currentUser={currentUser} onUpdateStatus={handleUpdateActionItem} />
        )}

        {tab === "calendar" && (
          <CalendarTab events={events} meets={meets} occs={occs} currentUser={currentUser} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} />
        )}

        {tab === "analytics" && <AnalyticsTab occs={occs} meets={meets} currentUser={currentUser} />}

        {tab === "admin" && currentUser.isAdmin && (
          <AdminPanel users={users} audit={audit} currentUser={currentUser}
            onAddUser={handleAddUser} onResetPass={handleResetPass}
            onToggleActive={handleToggleActive} onToggleAdmin={handleToggleAdmin} />
        )}
      </div>

      {showOccForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) { setShowOccForm(false); setEditOcc(null); } }}>
          <div style={{ ...S.modal, maxWidth: 700 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-strong)" }}>{editOcc ? "Edit Occupier" : "Add Occupier"}</h2>
            <OccupierForm occ={editOcc} currentUser={currentUser} onSave={handleSaveOcc} onCancel={() => { setShowOccForm(false); setEditOcc(null); }} />
          </div>
        </div>
      )}

      {showMeetForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) { setShowMeetForm(false); setPreOccId(null); setEditMeet(null); } }}>
          <div style={{ ...S.modal, maxWidth: 700 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-strong)" }}>{editMeet ? "Edit Meeting" : "Log Meeting"}</h2>
            <MeetingForm occs={occs} preOccId={preOccId} currentUser={currentUser} onSave={handleSaveMeet} onCancel={() => { setShowMeetForm(false); setPreOccId(null); setEditMeet(null); }} editMeet={editMeet} />
          </div>
        </div>
      )}
    </div>
  );
}
