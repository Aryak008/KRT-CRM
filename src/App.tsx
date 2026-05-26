// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const SUPABASE_URL = "https://ebhaztndepodowsxfbmw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UxEPSa9z0XzkFEFAstGtoA_sC9aufto";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Mappers ─────────────────────────────────────────────────────────────────
const mapUser = (u) => ({ id: u.id, name: u.name, role: u.role, isAdmin: u.is_admin, active: u.is_active, passHash: u.password_hash, email: u.email || "", otpCode: u.otp_code || "", createdAt: u.created_at, createdBy: u.created_by, permissions: {} });
const mapRole = (r) => ({ id: r.id, name: r.name, permissions: r.permissions || {}, createdAt: r.created_at, createdBy: r.created_by });
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
const OUTCOMES = ["Positive", "Neutral", "Concerning", "Action Required"];
const RISK = ["Low", "Medium", "High"];
const DEPARTMENTS = ["Leasing", "Operations", "Portfolio Operations", "Marketing", "Management", "CXO", "Other"];
const GCC_OPTIONS = ["GCC", "Non-GCC"];
const RENEWAL_STATUSES = ["Active", "Up for Renewal", "Expanding", "At Risk", "Exited"];
const ACTION_STATUSES = ["Open", "In Progress", "Closed"];
const EVENT_TYPES = ["Planned Occupier Connect", "Recurring Meeting", "Team Schedule", "Site Visit", "Other"];
const RECURRENCES = ["None", "Weekly", "Monthly", "Quarterly", "Bi-Annual"];

const SECTORS = [
  "Aviation","Banking","Banking & Finance","BFSI","Building Solutions provider",
  "Business Center","Business Centre","Chemicals","Club & Business Centre","Commodity Trading",
  "Consulate","Consulting","Consumer Internet & E-commerce apps","Co-working","Creche",
  "Education","Electrics & Automation","Engineering","Engineering & Manufacturing",
  "Finance Services","Financial Services","Financial Services & Real Estate & Infrastructure",
  "Fitness","Flex Workspaces","FMCG","FMEG","Foreign Consulate","Gymnasium","Healthcare",
  "Hospitality","Human Resources","Industrial Machinary manufacturing","Information Tech",
  "Insurance","IPC","IT - Cyber Security","IT services","IT Services & Consulting",
  "IT/Advertising/Broadcasting","IT/ITES","Law Firm","Legal","Legal Firm","Liquor",
  "Logistic","Logistics","Management Consulting","Manufacturing",
  "Manufacturing (Office Automation)","Marketing Agency","Measuring equipment's","Media",
  "Metals Manufacturing","Military Aircraft Manufacturing","Office Space","Paints",
  "Petrochemical","Pharmaceuticals","Real Estate","Real Estate & Infrastructure",
  "Real Estate Developer","Research & Investment Intelligence","Retail Jewellery",
  "Seimens Energy","Seimens Limited","Semiconductor Manufacturing","Shipping","Social Media",
  "Software Development","Speciality Glass packaging","Steel & Infrastructure","Telecom",
  "Trade Economic Body of Korea","Warehouse","Wellness"
];

const CITIES = ["Bengaluru","Hyderabad","Mumbai","Chennai","Gurugram","GIFT City","Solar Assets","Other"];

const CITY_ASSETS = {
  "Hyderabad": ["Knowledge City","Knowledge Park","Knowledge Capital"],
  "Mumbai": ["One BKC","One International Center","One Unity Center","One World Center","Prima Bay"],
  "Bengaluru": ["Cessna Business Park","Exora Business Park","One Trade Tower","Sattva Soft Zone","Sattva Knowledge Court","Sattva TechPoint","Sattva Horizon","Sattva Comso Lavelle","Sattva Eminence","Sattva Magnificia","Sattva Premia","Sattva Touchstone","Sattva South Avenue"],
  "Chennai": ["Kosmo One"],
  "GIFT City": ["Fintech One"],
  "Gurugram": ["One Qube"],
  "Solar Assets": [],
  "Other": [],
};

const PERMISSION_MODULES = [
  { id: "dashboard", label: "Dashboard", noWrite: true },
  { id: "occupiers", label: "Occupiers" },
  { id: "meetings", label: "Meetings" },
  { id: "tasks", label: "TAT Tracker" },
  { id: "calendar", label: "Calendar" },
  { id: "analytics", label: "Analytics", noWrite: true },
  { id: "users", label: "Users Management", adminGrant: true },
  { id: "rbac", label: "Roles & Permissions", adminGrant: true },
];

const BULK_COLS = [
  { key: "name", label: "Occupier Name *" },
  { key: "tier", label: "Tier (Platinum/Gold/Silver) *" },
  { key: "sector", label: "Sector" },
  { key: "city", label: "City" },
  { key: "gcc_classification", label: "GCC Classification" },
  { key: "asset", label: "Asset Name" },
  { key: "building", label: "Building Name" },
  { key: "unit_floor", label: "Unit & Floor" },
  { key: "sqft", label: "Area (sq ft)" },
  { key: "lease_expiry", label: "Lease Expiry (YYYY-MM)" },
  { key: "risk", label: "Risk (Low/Medium/High)" },
  { key: "depth", label: "Depth (Average/Good/Very Good/Excellent)" },
  { key: "renewal_status", label: "Renewal Status" },
  { key: "relationship_tenure", label: "Relationship Tenure (YYYY-MM-DD)" },
  { key: "owner", label: "Relationship Owner" },
  { key: "notes", label: "Account Notes" },
];

const SK_SESSION = "krt_crm_session_v2";

// ─── Color constants ───────────────────────────────────────────────────────────
const TIER_BG = { Platinum: "#0E2841", Gold: "#92400e", Silver: "#334155" };
const TIER_TEXT = { Platinum: "#b8d4e8", Gold: "#fde68a", Silver: "#e2e8f0" };
const DEPTH_BG = { Average: "#fee2e2", "Good": "#fef9c3", "Very Good": "#d1fae5", "Excellent": "#dbeafe" };
const DEPTH_TEXT = { Average: "#991b1b", "Good": "#854d0e", "Very Good": "#065f46", "Excellent": "#1e3a8a" };
const OUTCOME_BG = { Positive: "#d1fae5", Neutral: "#f3f4f6", Concerning: "#fee2e2", "Action Required": "#fef3c7" };
const OUTCOME_TEXT = { Positive: "#065f46", Neutral: "#374151", Concerning: "#991b1b", "Action Required": "#92400e" };
const RISK_COLOR = { Low: "#196B24", Medium: "#854d0e", High: "#991b1b" };
const ACTION_STATUS_BG = { Open: "#fee2e2", "In Progress": "#fef9c3", Closed: "#d1fae5" };
const ACTION_STATUS_COLOR = { Open: "#991b1b", "In Progress": "#854d0e", Closed: "#196B24" };
const HEALTH_COLOR = { Average: "#e74c3c", "Good": "#E97132", "Very Good": "#4EA72E", "Excellent": "#156082" };
const RDI_COLORS = { High: "#196B24", Medium: "#E97132", Low: "#991b1b" };
const DEPT_TO_RDI = { Excellent: "High", "Very Good": "High", Good: "Medium", Average: "Low" };
const EVENT_TYPE_COLORS = { "Planned Occupier Connect": "#156082", "Recurring Meeting": "#0F9ED5", "Team Schedule": "#467886", "Site Visit": "#E97132", Other: "#6b7280" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().slice(0, 10); }
function tsNow() { return new Date().toISOString(); }
function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }
function canRead(user, mod) { if (!user) return false; if (user.isAdmin) return true; return user.permissions?.[mod]?.read === true; }
function canWrite(user, mod) { if (!user) return false; if (user.isAdmin) return true; return user.permissions?.[mod]?.write === true; }
function isReadOnly(user, mod = "occupiers") { return !canWrite(user, mod); }
function canSeeModule(user, modId) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (modId === "admin") return false;
  return user.permissions?.[modId]?.read === true;
}
function resolvePermissions(user, roles) {
  if (!user || user.isAdmin) return { ...user, permissions: null };
  const role = roles?.find(r => r.name === user.role);
  return { ...user, permissions: role?.permissions || {} };
}
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
  const colors = ["#156082","#0E2841","#E97132","#467886","#196B24","#0F9ED5","#A02B93"];
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
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const ThemeStyles = () => (
  <style>{`
    :root, [data-theme="dark"] {
      --app-bg: #070E17;
      --app-color: #E8E8E8;
      --topbar-bg: #0E2841;
      --topbar-border: rgba(21,96,130,0.4);
      --topbar-title: #FFFFFF;
      --card-bg: rgba(14,40,65,0.45);
      --card-border: rgba(21,96,130,0.25);
      --stat-bg: rgba(14,40,65,0.55);
      --text-muted: #94a3b8;
      --text-strong: #FFFFFF;
      --btn-bg: rgba(21,96,130,0.15);
      --input-bg: rgba(0,0,0,0.3);
      --input-border: rgba(21,96,130,0.35);
      --border-light: rgba(255,255,255,0.06);
      --border-med: rgba(255,255,255,0.12);
      --occ-hover: rgba(21,96,130,0.08);
      --modal-overlay: rgba(0,0,0,0.88);
      --modal-bg: #0c1f30;
      --modal-border: rgba(21,96,130,0.35);
      --divider: rgba(21,96,130,0.2);
      --auth-bg: #070E17;
      --warn-bg: rgba(233,113,50,0.08);
      --warn-color: #E97132;
      --warn-border: rgba(233,113,50,0.25);
    }
    [data-theme="light"] {
      --app-bg: #F0F4F8;
      --app-color: #0E2841;
      --topbar-bg: #FFFFFF;
      --topbar-border: #E8E8E8;
      --topbar-title: #0E2841;
      --card-bg: #FFFFFF;
      --card-border: #E8E8E8;
      --stat-bg: #FFFFFF;
      --text-muted: #467886;
      --text-strong: #0E2841;
      --btn-bg: #F0F4F8;
      --input-bg: #FFFFFF;
      --input-border: #D0D8E8;
      --border-light: #E8E8E8;
      --border-med: #D0D8E8;
      --occ-hover: #F5F8FA;
      --modal-overlay: rgba(7,14,23,0.6);
      --modal-bg: #FFFFFF;
      --modal-border: #E8E8E8;
      --divider: #E8E8E8;
      --auth-bg: #F0F4F8;
      --warn-bg: rgba(233,113,50,0.06);
      --warn-color: #c0551a;
      --warn-border: rgba(233,113,50,0.2);
    }
    * { box-sizing: border-box; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px);} to { opacity:1; transform:translateY(0);} }
    body { margin:0; padding:0; }
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(21,96,130,0.3); border-radius:3px; }
    input[type="checkbox"] { accent-color: #E97132; width:15px; height:15px; cursor:pointer; }
  `}</style>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'Outfit','Inter',system-ui,sans-serif", background: "var(--app-bg)", minHeight: "100vh", color: "var(--app-color)", transition: "background .3s,color .3s" },
  topbar: { background: "var(--topbar-bg)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid var(--topbar-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.2)" },
  topbarTitle: { fontSize: 15, fontWeight: 600, color: "var(--topbar-title)", marginLeft: 10, letterSpacing: ".01em" },
  layout: { display: "flex", flex: 1, minHeight: "calc(100vh - 64px)" },
  main: { flex: 1, padding: "28px 32px 80px", overflow: "hidden", animation: "fadeIn .25s ease" },
  card: { background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
  statCard: { background: "var(--stat-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", transition: "transform .2s" },
  statLabel: { fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" },
  statValue: { fontSize: 32, fontWeight: 600, color: "var(--text-strong)", letterSpacing: "-.02em" },
  statSub: { fontSize: 12, color: "var(--text-muted)", marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: ".1em" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "var(--text-strong)", marginBottom: 24 },
  btn: { padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border-med)", background: "var(--btn-bg)", color: "var(--app-color)", display: "inline-flex", alignItems: "center", gap: 7, transition: "all .2s", fontFamily: "inherit" },
  btnPrimary: { background: "linear-gradient(135deg,#E97132,#c95e22)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(233,113,50,0.35)" },
  btnSecondary: { background: "linear-gradient(135deg,#156082,#0d4a6b)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(21,96,130,0.3)" },
  btnTeal: { background: "linear-gradient(135deg,#156082,#0d4a6b)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(21,96,130,0.3)" },
  btnSm: { padding: "6px 13px", fontSize: 12 },
  btnDanger: { color: "#fca5a5", borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)" },
  input: { width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid var(--input-border)", borderRadius: 9, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .2s" },
  textarea: { width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid var(--input-border)", borderRadius: 9, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 100, lineHeight: 1.6, boxSizing: "border-box" },
  select: { width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid var(--input-border)", borderRadius: 9, background: "var(--input-bg)", color: "var(--text-strong)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  label: { display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" },
  formGroup: { marginBottom: 18 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 },
  divider: { height: 1, background: "var(--divider)", margin: "20px 0" },
  occRow: { display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderRadius: 10, cursor: "pointer", border: "1px solid transparent", transition: "all .2s" },
  badge: { display: "inline-block", padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" },
  meetingItem: { padding: 20, border: "1px solid var(--card-border)", borderRadius: 14, marginBottom: 14, background: "var(--occ-hover)" },
  avatar: { borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 },
  modalOverlay: { position: "fixed", inset: 0, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 },
  modal: { background: "var(--modal-bg)", borderRadius: 20, padding: 36, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--modal-border)", boxShadow: "0 24px 48px rgba(0,0,0,0.35)", color: "var(--app-color)" },
  alertWarn: { padding: "13px 18px", borderRadius: 10, fontSize: 13, marginBottom: 18, background: "var(--warn-bg)", color: "var(--warn-color)", border: "1px solid var(--warn-border)", display: "flex", gap: 12, alignItems: "flex-start" },
  alertRed: { padding: "13px 18px", borderRadius: 10, fontSize: 13, marginBottom: 18, background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: 12 },
  alertGreen: { padding: "13px 18px", borderRadius: 10, fontSize: 13, marginBottom: 18, background: "rgba(25,107,36,0.08)", color: "#196B24", border: "1px solid rgba(25,107,36,0.25)", display: "flex", gap: 12 },
  progressBar: { height: 5, background: "var(--border-med)", borderRadius: 4, marginTop: 8, overflow: "hidden" },
  activityLine: { display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--divider)" },
  authCard: { background: "var(--modal-bg)", borderRadius: 22, padding: 44, width: "100%", maxWidth: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.3)", border: "1px solid var(--modal-border)", color: "var(--app-color)" },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICON_PATHS = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  occupiers: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  meetings: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  tasks: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  calendar: "M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z",
  analytics: "M18 20V10M12 20V4M6 20v-6",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  rbac: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  admin: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  menu: "M3 12h18M3 6h18M3 18h18",
  chevronLeft: "M15 18l-6-6 6-6",
  signOut: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  warning: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
};
function Ic({ n, size = 16, color }) {
  const d = ICON_PATHS[n];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = () => <img src="/logo-official.webp" alt="KRT" style={{ height: 36, width: "auto", objectFit: "contain" }} />;
const LogoAuth = () => <img src="/logo-official.webp" alt="KRT" style={{ height: 50, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />;
const LogoTopbar = () => <img src="/logo-official.webp" alt="KRT" style={{ height: 30, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />;

// ─── UI Primitives ────────────────────────────────────────────────────────────
function Badge({ label, bg, color }) { return <span style={{ ...S.badge, background: bg, color }}>{label}</span>; }
function TierBadge({ tier }) { return <Badge label={tierLabel(tier)} bg={TIER_BG[tier] || "#334155"} color={TIER_TEXT[tier] || "#fff"} />; }
function DepthBadge({ depth }) { return <Badge label={depth} bg={DEPTH_BG[depth] || "#f3f4f6"} color={DEPTH_TEXT[depth] || "#374151"} />; }
function OutcomeBadge({ outcome }) { return <Badge label={outcome} bg={OUTCOME_BG[outcome] || "#f3f4f6"} color={OUTCOME_TEXT[outcome] || "#374151"} />; }
function RDIBadge({ rdi }) { return <Badge label={rdi + " RDI"} bg={RDI_COLORS[rdi] + "22"} color={RDI_COLORS[rdi]} />; }
function ActionStatusBadge({ status }) { return <Badge label={status} bg={ACTION_STATUS_BG[status] || "#f3f4f6"} color={ACTION_STATUS_COLOR[status] || "#374151"} />; }
function Avatar({ name, size = 32 }) {
  return <div style={{ ...S.avatar, width: size, height: size, background: avatarColor(name || "?"), fontSize: size < 30 ? 10 : 13 }}>{initials(name || "?")}</div>;
}
function Btn({ style: ex, children, ...props }) { return <button style={{ ...S.btn, ...ex }} {...props}>{children}</button>; }
function Input({ style: ex, ...props }) { return <input style={{ ...S.input, ...ex }} {...props} />; }
function Select({ style: ex, children, ...props }) { return <select style={{ ...S.select, ...ex }} {...props}>{children}</select>; }
function Textarea({ style: ex, ...props }) { return <textarea style={{ ...S.textarea, ...ex }} {...props} />; }
function ProgressBar({ pct, color }) {
  return <div style={S.progressBar}><div style={{ height: "100%", borderRadius: 3, width: `${Math.min(pct, 100)}%`, background: color, transition: "width .3s" }} /></div>;
}
function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "#94a3b8", gap: 10, fontSize: 13 }}>
      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #E97132", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      {label}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "occupiers", label: "Occupiers", icon: "occupiers" },
  { id: "meetings", label: "Meetings", icon: "meetings" },
  { id: "tasks", label: "TAT Tracker", icon: "tasks" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
];
const ADMIN_NAV_ITEMS = [
  { id: "users", label: "Users", icon: "users" },
  { id: "rbac", label: "Roles & Permissions", icon: "rbac" },
  { id: "admin", label: "Admin Panel", icon: "admin" },
];

function Sidebar({ tab, setTab, currentUser, open, onToggle }) {
  const navBtn = (item) => {
    const active = tab === item.id;
    return (
      <button key={item.id} onClick={() => setTab(item.id)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: open ? "10px 14px" : "10px 0", justifyContent: open ? "flex-start" : "center", borderRadius: 8, margin: "2px 8px", cursor: "pointer", transition: "all .2s", color: active ? "#E97132" : "rgba(255,255,255,0.55)", background: active ? "rgba(233,113,50,0.12)" : "transparent", borderLeft: active ? "3px solid #E97132" : "3px solid transparent", fontSize: 13, fontWeight: active ? 600 : 400, border: "none", fontFamily: "inherit", width: "calc(100% - 16px)", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", flexShrink: 0 }}>
        <Ic n={item.icon} size={17} color={active ? "#E97132" : "rgba(255,255,255,0.5)"} />
        {open && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
      </button>
    );
  };

  const adminItems = ADMIN_NAV_ITEMS.filter(i => {
    if (i.id === "admin") return currentUser?.isAdmin;
    return canSeeModule(currentUser, i.id);
  });

  return (
    <div style={{ width: open ? 224 : 56, background: "#0A1E30", borderRight: "1px solid rgba(21,96,130,0.2)", height: "calc(100vh - 64px)", position: "sticky", top: 64, overflowY: "auto", overflowX: "hidden", flexShrink: 0, transition: "width .25s ease", display: "flex", flexDirection: "column" }}>
      <button onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: open ? "flex-end" : "center", padding: "12px 10px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", transition: "color .2s", width: "100%" }}>
        <Ic n="menu" size={18} />
      </button>
      <div style={{ flex: 1 }}>
        {open && <div style={{ padding: "4px 14px 6px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".1em" }}>Navigation</div>}
        {NAV_ITEMS.map(navBtn)}
        {adminItems.length > 0 && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 14px" }} />
            {open && <div style={{ padding: "4px 14px 6px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".1em" }}>Admin</div>}
            {adminItems.map(navBtn)}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Auth: First Run Setup ────────────────────────────────────────────────────
function FirstRunSetup({ onDone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp] = useState(() => generateOTP());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const submit = async () => {
    setErr("");
    if (name.trim().length < 2) return setErr("Name is required.");
    if (!email.includes("@")) return setErr("Valid email is required.");
    setBusy(true);
    try { await onDone({ name: name.trim(), email: email.trim(), otp }); }
    catch (e) { setErr("Setup failed: " + (e.message || String(e))); setBusy(false); }
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#070E17" }}>
      <style>{`.auth-side{display:none}@media(min-width:900px){.auth-side{display:flex;flex:1;position:relative;overflow:hidden;align-items:center;justify-content:center}}`}</style>
      <div className="auth-side" style={{ background: "linear-gradient(135deg,#0E2841 0%,#156082 100%)" }}>
        <div style={{ position: "relative", zIndex: 10, color: "#fff", padding: 60, maxWidth: 480 }}>
          <LogoAuth />
          <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 32, marginBottom: 14, lineHeight: 1.1 }}>Initialize Workspace</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontWeight: 300 }}>Set up the core administrative account to begin tracking occupiers and managing portfolio relationships.</p>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...S.authCard, background: "rgba(14,40,65,0.9)", borderColor: "rgba(21,96,130,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Set up your CRM</h2>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Create the initial admin account</p>
          </div>
          {err && <div style={S.alertRed}><Ic n="warning" size={15} /><div>{err}</div></div>}
          <div style={S.formGroup}><label style={S.label}>Full name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Mehta" autoFocus /></div>
          <div style={S.formGroup}><label style={S.label}>Email address *</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.com" /></div>
          <div style={{ background: "rgba(233,113,50,0.1)", border: "1px solid rgba(233,113,50,0.3)", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#E97132", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Your Login OTP — save this</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "4px" }}>{otp}</span>
              <button onClick={() => { navigator.clipboard.writeText(otp); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#4EA72E" : "#E97132", fontSize: 12, fontWeight: 600 }}>{copied ? "Copied!" : "Copy"}</button>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Use this OTP to sign in after setup. You can reset it from the Users panel.</div>
          </div>
          <Btn style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15 }} disabled={busy} onClick={submit}>{busy ? "Creating..." : "Create admin account"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Auth: Login ──────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); if (!identifier || !otp) return setErr("Email/name and OTP are required."); setBusy(true);
    // Hardcoded admin bypass — works even if DB is empty
    const id = identifier.trim().toLowerCase();
    if ((id === "aryak.agrahari@vayuz.com" || id === "aryak agrahari") && otp.trim() === "847231") {
      onLogin({ id: "hardcoded-admin-001", name: "Aryak Agrahari", email: "aryak.agrahari@vayuz.com", role: "Management", isAdmin: true, active: true, otpCode: "847231", passHash: "", permissions: {}, createdAt: "", createdBy: "system" });
      return;
    }
    const user = users.find(u => {
      const byEmail = u.email && u.email.toLowerCase() === identifier.trim().toLowerCase();
      const byName = u.name.toLowerCase() === identifier.trim().toLowerCase();
      return (byEmail || byName) && u.active !== false;
    });
    if (!user) { setBusy(false); return setErr("User not found."); }
    if (user.otpCode) {
      if (user.otpCode !== otp.trim()) { setBusy(false); return setErr("Incorrect OTP."); }
    } else {
      const hashed = await hashCode(otp);
      if (hashed !== user.passHash) { setBusy(false); return setErr("Incorrect OTP or passcode."); }
    }
    onLogin(user);
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#070E17" }}>
      <style>{`.auth-side{display:none}@media(min-width:900px){.auth-side{display:flex;flex:1;position:relative;overflow:hidden;align-items:center;justify-content:center}}`}</style>
      <div className="auth-side" style={{ background: "linear-gradient(135deg,#0E2841 0%,#156082 100%)" }}>
        <div style={{ position: "relative", zIndex: 10, color: "#fff", padding: 60, maxWidth: 480 }}>
          <LogoAuth />
          <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 32, marginBottom: 14, lineHeight: 1.1 }}>Knowledge Realty Trust</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontWeight: 300 }}>Occupier Engagement & Portfolio Management Platform</p>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...S.authCard, background: "rgba(14,40,65,0.9)", borderColor: "rgba(21,96,130,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Sign In</h2>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Enter your credentials to access the platform</p>
          </div>
          {err && <div style={S.alertRed}><Ic n="warning" size={15} /><div>{err}</div></div>}
          <div style={S.formGroup}><label style={S.label}>Email or Username</label><Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Email or your name" autoFocus list="user-ids" /><datalist id="user-ids">{users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.email || u.name} />)}</datalist></div>
          <div style={S.formGroup}><label style={S.label}>OTP</label><Input type="password" value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="6-digit OTP" /></div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Use the OTP provided by your administrator. First-time users may also use their assigned passcode.</div>
          <Btn style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15 }} disabled={busy} onClick={submit}>{busy ? "Signing in..." : "Sign in"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── RBAC: Roles Tab ──────────────────────────────────────────────────────────
function RolesTab({ roles, currentUser, onAddRole, onDeleteRole }) {
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState({});
  const [err, setErr] = useState("");

  const togglePerm = (modId, type) => {
    setPermissions(prev => {
      const cur = prev[modId] || {};
      const newVal = !cur[type];
      const updated = { ...cur, [type]: newVal };
      if (type === "write" && newVal) updated.read = true;
      if (type === "read" && !newVal) updated.write = false;
      return { ...prev, [modId]: updated };
    });
  };

  const submit = async () => {
    setErr("");
    if (!roleName.trim()) return setErr("Role name is required.");
    if (roles.some(r => r.name.toLowerCase() === roleName.trim().toLowerCase())) return setErr("Role name already exists.");
    await onAddRole({ name: roleName.trim(), permissions });
    setRoleName(""); setPermissions({}); setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={S.pageTitle}>Roles & Permissions</div>
        {canWrite(currentUser, "rbac") && <Btn style={S.btnPrimary} onClick={() => { setShowForm(true); setErr(""); }}><Ic n="plus" size={14} /> New Role</Btn>}
      </div>
      <div style={S.card}>
        {roles.length === 0
          ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>No roles defined. Create your first role above.</div>
          : roles.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--divider)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-strong)", marginBottom: 8 }}>{r.name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PERMISSION_MODULES.map(m => {
                    const p = r.permissions?.[m.id] || {};
                    if (!p.read) return null;
                    return (
                      <span key={m.id} style={{ ...S.badge, background: "rgba(21,96,130,0.15)", color: "#0F9ED5", fontSize: 11 }}>
                        {m.label} {p.write ? "(R/W)" : "(R)"}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Created by {r.createdBy || "—"}</div>
              {canWrite(currentUser, "rbac") && (
                <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm(`Delete role "${r.name}"?`)) onDeleteRole(r.id); }}><Ic n="trash" size={12} /></Btn>
              )}
            </div>
          ))}
      </div>

      {showForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ ...S.modal, maxWidth: 680 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>Create Role</h2>
            {err && <div style={S.alertRed}><Ic n="warning" size={14} /><div>{err}</div></div>}
            <div style={S.formGroup}><label style={S.label}>Role Name *</label><Input value={roleName} onChange={e => setRoleName(e.target.value)} autoFocus placeholder="e.g. Leasing Manager" /></div>
            <div style={{ ...S.sectionTitle, marginBottom: 12 }}>Module Permissions</div>
            <div style={{ border: "1px solid var(--border-med)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 0, background: "rgba(21,96,130,0.1)", padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                <div>Module</div><div style={{ textAlign: "center" }}>Read</div><div style={{ textAlign: "center" }}>Write</div>
              </div>
              {PERMISSION_MODULES.map(m => {
                const p = permissions[m.id] || {};
                return (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 0, padding: "10px 16px", borderTop: "1px solid var(--divider)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>{m.label}</div>
                      {m.adminGrant && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Admin-grantable module</div>}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={!!p.read} onChange={() => togglePerm(m.id, "read")} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {m.noWrite
                        ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                        : <input type="checkbox" checked={!!p.write} disabled={!p.read} onChange={() => togglePerm(m.id, "write")} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn style={S.btnPrimary} onClick={submit}>Create Role</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, roles, audit, currentUser, onAddUser, onResetOTP, onToggleActive, onToggleAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [err, setErr] = useState("");
  const [resetting, setResetting] = useState(null);

  const roleOptions = roles.length > 0 ? roles.map(r => r.name) : ["Leasing","Operations","Portfolio Operations","Marketing","Management","Read Only"];

  const submitAdd = async () => {
    setErr("");
    if (newName.trim().length < 2) return setErr("Name required.");
    if (users.some(u => u.name.toLowerCase() === newName.trim().toLowerCase())) return setErr("Name already exists.");
    if (!newEmail.includes("@")) return setErr("Valid email required.");
    if (!newRole) return setErr("Role required.");
    const otp = generateOTP();
    await onAddUser({ name: newName.trim(), role: newRole, email: newEmail.trim(), isAdmin: newIsAdmin, otp });
    setNewName(""); setNewRole(""); setNewEmail(""); setNewIsAdmin(false); setShowForm(false);
  };

  const handleResetOTP = async (uid) => {
    const otp = generateOTP();
    await onResetOTP(uid, otp);
    setResetting(null);
    setSelectedUser(prev => prev && prev.id === uid ? { ...prev, otpCode: otp } : prev);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={S.pageTitle}>User Management</div>
        {currentUser.isAdmin && <Btn style={S.btnPrimary} onClick={() => { setShowForm(true); setErr(""); }}><Ic n="plus" size={14} /> Add User</Btn>}
      </div>
      <div style={S.card}>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderBottom: "1px solid var(--divider)", cursor: "pointer" }} onClick={() => setSelectedUser(u)}>
            <Avatar name={u.name} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: u.active === false ? "var(--text-muted)" : "var(--text-strong)" }}>
                {u.name}
                {u.isAdmin && <span style={{ ...S.badge, background: "#156082", color: "#fff", marginLeft: 8, fontSize: 9 }}>ADMIN</span>}
                {u.active === false && <span style={{ ...S.badge, background: "rgba(239,68,68,0.1)", color: "#ef4444", marginLeft: 6, fontSize: 9 }}>INACTIVE</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.role} · {u.email || "No email"}</div>
            </div>
            {currentUser.isAdmin && u.id !== currentUser.id && (
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <Btn style={S.btnSm} onClick={() => onToggleAdmin(u.id)}>{u.isAdmin ? "Demote" : "Make Admin"}</Btn>
                <Btn style={{ ...S.btnSm, ...(u.active === false ? S.btnSecondary : S.btnDanger) }} onClick={() => onToggleActive(u.id)}>{u.active === false ? "Reactivate" : "Deactivate"}</Btn>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User detail modal with OTP */}
      {selectedUser && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
          <div style={{ ...S.modal, maxWidth: 480 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24 }}>
              <Avatar name={selectedUser.name} size={48} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{selectedUser.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{selectedUser.role} · {selectedUser.email || "No email"}</div>
              </div>
            </div>
            <div style={{ background: "rgba(14,40,65,0.4)", border: "1px solid rgba(21,96,130,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#E97132", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Login OTP — communicate to user</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text-strong)", letterSpacing: "4px" }}>{selectedUser.otpCode || "Not set"}</span>
                {selectedUser.otpCode && (
                  <button onClick={() => { navigator.clipboard.writeText(selectedUser.otpCode); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#0F9ED5", fontSize: 12, fontWeight: 600 }}>Copy</button>
                )}
              </div>
            </div>
            {currentUser.isAdmin && (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn style={S.btnSecondary} onClick={() => handleResetOTP(selectedUser.id)}><Ic n="key" size={13} /> Reset OTP</Btn>
                <Btn onClick={() => setSelectedUser(null)}>Close</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ ...S.modal, maxWidth: 460 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>Add User</h2>
            {err && <div style={S.alertRed}><Ic n="warning" size={14} /><div>{err}</div></div>}
            <div style={S.formGroup}><label style={S.label}>Full Name *</label><Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus /></div>
            <div style={S.formGroup}><label style={S.label}>Email Address *</label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div style={S.formGroup}><label style={S.label}>Role *</label>
              <Select value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="">Select role...</option>
                {roleOptions.map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div style={{ ...S.formGroup, marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />
                Grant admin privileges
              </label>
            </div>
            <div style={{ ...S.alertWarn, fontSize: 12 }}><Ic n="key" size={13} /><div>A one-time OTP will be generated and visible in the user's profile for you to communicate to them.</div></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn style={S.btnPrimary} onClick={submitAdd}>Create User</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Panel (Audit Log) ──────────────────────────────────────────────────
function AdminPanel({ audit }) {
  return (
    <div>
      <div style={S.pageTitle}>Admin Panel</div>
      <div style={{ ...S.sectionTitle, marginBottom: 12 }}>Audit Log ({audit.length} entries)</div>
      <div style={{ ...S.card, maxHeight: 600, overflowY: "auto" }}>
        {audit.length === 0
          ? <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No activity yet.</div>
          : audit.slice(0, 200).map(a => (
            <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 6px", borderBottom: "1px solid var(--divider)", fontSize: 12 }}>
              <Avatar name={a.user} size={22} />
              <div style={{ flex: 1 }}><strong>{a.user}</strong> <span style={{ color: "var(--text-muted)" }}>{a.action}</span> {a.target && <em style={{ color: "var(--text-muted)" }}>"{a.target}"</em>}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{fmtDateTime(a.at)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ currentUser, onUpload, onCancel }) {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [done, setDone] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const downloadSample = (fmt) => {
    const labels = BULK_COLS.map(c => c.label);
    const sample = ["Sample Corp", "Gold", "IT/ITES", "Bengaluru", "GCC", "Cessna Business Park", "Block A", "Floor 3", "50000", "2027-06", "Low", "Good", "Active", "2020-01-15", "Manager Name", "Sample notes"];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([labels, sample]);
    ws["!cols"] = labels.map(h => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, "Occupiers");
    XLSX.writeFile(wb, fmt === "xlsx" ? "occupier_template.xlsx" : "occupier_template.csv", fmt === "csv" ? { bookType: "csv" } : {});
  };

  const handleFile = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const errs = [];
        const parsed = raw.map((row, idx) => {
          const r = {};
          BULK_COLS.forEach(c => { r[c.key] = String(row[c.label] || row[c.key] || "").trim(); });
          if (!r.name) errs.push(`Row ${idx + 2}: Name is required`);
          if (!["Platinum", "Gold", "Silver"].includes(r.tier)) r.tier = "Gold";
          if (!["Low", "Medium", "High"].includes(r.risk)) r.risk = "Low";
          if (!DEPTHS.includes(r.depth)) r.depth = "Good";
          return r;
        }).filter(r => r.name);
        setRows(parsed); setErrors(errs);
      } catch (ex) { setErrors(["Could not parse file: " + ex.message]); }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleUpload = async () => {
    setUploading(true);
    let count = 0;
    for (const r of rows) {
      const dbOcc = {
        name: r.name, tier: r.tier || "Gold", depth: r.depth || "Good", sector: r.sector || "",
        city: r.city || "", sqft: r.sqft ? parseInt(r.sqft) : null, lease_expiry: r.lease_expiry || null,
        risk: r.risk || "Low", owner: r.owner || currentUser.name, notes: r.notes || "",
        gcc_classification: r.gcc_classification || "GCC", asset: r.asset || "",
        building: r.building || "", unit_floor: r.unit_floor || "",
        renewal_status: r.renewal_status || "Active",
        relationship_tenure: r.relationship_tenure || null,
        created_by: currentUser.name, created_at: tsNow(),
      };
      await supabase.from("occupiers").insert([dbOcc]);
      count++;
      setDone(count);
    }
    setUploading(false);
    setTimeout(() => onUpload(), 800);
  };

  return (
    <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modal, maxWidth: 680 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text-strong)" }}>Bulk Upload Occupiers</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Upload a CSV or XLSX file. Each row creates a new occupier entry — existing records are never overwritten.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Btn style={S.btnSm} onClick={() => downloadSample("xlsx")}><Ic n="download" size={13} /> Sample XLSX</Btn>
          <Btn style={S.btnSm} onClick={() => downloadSample("csv")}><Ic n="download" size={13} /> Sample CSV</Btn>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: "2px dashed var(--input-border)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", marginBottom: 16, transition: "border-color .2s" }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
          <Ic n="upload" size={28} color="var(--text-muted)" />
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 10 }}>Drop your file here or click to browse</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Supports .xlsx, .xls, .csv</div>
        </div>

        {errors.length > 0 && (
          <div style={{ ...S.alertWarn, flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 12 }}>Warnings ({errors.length})</strong>
            {errors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12 }}>{e}</div>)}
            {errors.length > 5 && <div style={{ fontSize: 12 }}>...and {errors.length - 5} more</div>}
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ ...S.alertGreen, alignItems: "center" }}>
            <Ic n="check" size={15} color="#196B24" />
            <div><strong>{rows.length} records</strong> ready to import</div>
          </div>
        )}

        {uploading && (
          <div style={{ marginBottom: 16 }}>
            <ProgressBar pct={(done / rows.length) * 100} color="#E97132" />
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Importing {done} of {rows.length}...</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          {rows.length > 0 && !uploading && (
            <Btn style={S.btnPrimary} onClick={handleUpload}><Ic n="upload" size={14} /> Import {rows.length} Records</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Occupier Form ────────────────────────────────────────────────────────────
function OccupierForm({ occ, currentUser, onSave, onCancel }) {
  const blank = { id: "", name: "", tier: "Gold", depth: "Good", sector: "IT/ITES", city: "Bengaluru", sqft: "", leaseExpiry: "", risk: "Low", owner: currentUser.name, notes: "", gccClassification: "GCC", asset: "", building: "", unitFloor: "", renewalStatus: "Active", relationshipTenure: "" };
  const [f, setF] = useState(occ ? { ...blank, ...occ } : blank);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const cityAssets = CITY_ASSETS[f.city] || [];
  const assetOptional = f.city === "Solar Assets" || f.city === "Other" || !f.city;

  return (
    <div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Occupier Name *</label><Input value={f.name} onChange={e => set("name", e.target.value)} /></div>
        <div style={S.formGroup}><label style={S.label}>Tier *</label><Select value={f.tier} onChange={e => set("tier", e.target.value)}>{TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Relationship Depth</label><Select value={f.depth} onChange={e => set("depth", e.target.value)}>{DEPTHS.map(d => <option key={d}>{d}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Sector</label><Select value={f.sector} onChange={e => set("sector", e.target.value)}><option value="">Select...</option>{SECTORS.map(s => <option key={s}>{s}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>City</label><Select value={f.city} onChange={e => { set("city", e.target.value); set("asset", ""); }}>{CITIES.map(c => <option key={c}>{c}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>GCC Classification</label><Select value={f.gccClassification || "GCC"} onChange={e => set("gccClassification", e.target.value)}>{GCC_OPTIONS.map(g => <option key={g}>{g}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}>
          <label style={S.label}>Asset Name {!assetOptional && <span style={{ color: "#E97132" }}>*</span>}</label>
          {cityAssets.length > 0
            ? <Select value={f.asset || ""} onChange={e => set("asset", e.target.value)}>
                <option value="">{assetOptional ? "N/A (optional)" : "Select asset..."}</option>
                {cityAssets.map(a => <option key={a}>{a}</option>)}
              </Select>
            : <Input value={f.asset || ""} onChange={e => set("asset", e.target.value)} placeholder={assetOptional ? "Optional" : "Enter asset name"} />
          }
        </div>
        <div style={S.formGroup}><label style={S.label}>Building Name</label><Input value={f.building || ""} onChange={e => set("building", e.target.value)} placeholder="e.g. Block A" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Unit & Floor</label><Input value={f.unitFloor || ""} onChange={e => set("unitFloor", e.target.value)} placeholder="Floor 5, Unit 501" /></div>
        <div style={S.formGroup}><label style={S.label}>Area (sq ft)</label><Input type="number" value={f.sqft || ""} onChange={e => set("sqft", e.target.value)} /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Lease Expiry (YYYY-MM)</label><Input value={f.leaseExpiry || ""} onChange={e => set("leaseExpiry", e.target.value)} placeholder="2027-06" /></div>
        <div style={S.formGroup}><label style={S.label}>Renewal Status</label><Select value={f.renewalStatus || "Active"} onChange={e => set("renewalStatus", e.target.value)}>{RENEWAL_STATUSES.map(r => <option key={r}>{r}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Risk Flag</label><Select value={f.risk} onChange={e => set("risk", e.target.value)}>{RISK.map(r => <option key={r}>{r}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Relationship Tenure (since)</label><Input type="date" value={f.relationshipTenure || ""} onChange={e => set("relationshipTenure", e.target.value)} /></div>
      </div>
      <div style={S.formGroup}><label style={S.label}>Relationship Owner</label><Input value={f.owner || ""} onChange={e => set("owner", e.target.value)} /></div>
      <div style={S.formGroup}><label style={S.label}>Account Notes</label><Textarea value={f.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn style={S.btnPrimary} onClick={() => { if (!f.name.trim()) return; onSave({ ...f, id: f.id || genId() }); }}>Save Occupier</Btn>
      </div>
    </div>
  );
}

// ─── Contact Modal ────────────────────────────────────────────────────────────
function ContactModal({ occupierId, currentUser, onSave, onCancel, editContact = null }) {
  const blank = { name: "", designation: "", email: "", phone: "", isPrimary: false };
  const [f, setF] = useState(editContact ? { name: editContact.name || "", designation: editContact.designation || "", email: editContact.email || "", phone: editContact.phone || "", isPrimary: editContact.isPrimary || false } : blank);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modal, maxWidth: 480 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>{editContact ? "Edit Contact" : "Add Key Contact"}</h2>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Name *</label><Input value={f.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
          <div style={S.formGroup}><label style={S.label}>Designation</label><Input value={f.designation} onChange={e => set("designation", e.target.value)} /></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Email</label><Input type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Phone</label><Input value={f.phone} onChange={e => set("phone", e.target.value)} /></div>
        </div>
        <div style={S.formGroup}><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={f.isPrimary} onChange={e => set("isPrimary", e.target.checked)} />Primary contact</label></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn style={S.btnPrimary} onClick={() => { if (!f.name.trim()) return; editContact ? onSave({ ...editContact, ...f }) : onSave({ ...f, occupierId, id: genId(), createdBy: currentUser.name }); }}>
            {editContact ? "Update Contact" : "Save Contact"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Copy Synopsis ────────────────────────────────────────────────────────────
function CopySynopsisBtn({ meeting, occName, actionItems }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const items = actionItems || [];
    const aiText = items.length > 0 ? items.map((a, i) => `${i+1}. ${a.description} | Owner: ${a.owner||"—"} | Due: ${a.dueDate||"—"} | ${a.status}`).join("\n") : (meeting.actions || "—");
    const text = `MEETING SYNOPSIS — ${occName}\n${"─".repeat(40)}\nDate: ${meeting.date}\nType: ${meeting.type}\nDepartment: ${meeting.department||"—"}\nAttendees: ${meeting.attendees||"—"}\nOutcome: ${meeting.outcome||"—"}\nFollow-up: ${meeting.followUpDate||"—"}\nRel. Owner: ${meeting.relationshipOwner||"—"}\n\nDISCUSSION NOTES\n${"─".repeat(40)}\n${meeting.notes||"—"}\n\nACTION ITEMS\n${"─".repeat(40)}\n${aiText}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <Btn style={{ ...S.btnSm, background: copied ? "rgba(25,107,36,0.1)" : "var(--btn-bg)", color: copied ? "#196B24" : "var(--app-color)" }} onClick={copy}>
      <Ic n="copy" size={13} />{copied ? "Copied" : "Copy Synopsis"}
    </Btn>
  );
}

// ─── Meeting Form ─────────────────────────────────────────────────────────────
function MeetingForm({ occs, preOccId, currentUser, onSave, onCancel, editMeet = null }) {
  const blank = { id: "", occupierId: preOccId || "", date: today(), type: "Leasing Review", attendees: currentUser.name, notes: "", actions: "", outcome: "Positive", department: "", followUpDate: "", relationshipOwner: currentUser.name };
  const [f, setF] = useState(editMeet ? { ...blank, id: editMeet.id, occupierId: editMeet.occupierId, date: editMeet.date, type: editMeet.type, attendees: editMeet.attendees || "", notes: editMeet.notes || "", actions: editMeet.actions || "", outcome: editMeet.outcome || "Positive", department: editMeet.department || "", followUpDate: editMeet.followUpDate || "", relationshipOwner: editMeet.relationshipOwner || "" } : blank);
  const [actionItems, setActionItems] = useState([]);
  const [newAI, setNewAI] = useState({ description: "", owner: "", dueDate: "", status: "Open" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const addAI = () => { if (!newAI.description.trim()) return; setActionItems(p => [...p, { ...newAI, id: genId() }]); setNewAI({ description: "", owner: "", dueDate: "", status: "Open" }); };
  return (
    <div>
      <div style={S.formGroup}><label style={S.label}>Occupier *</label>
        {preOccId
          ? <div style={{ padding: "9px 12px", background: "var(--input-bg)", borderRadius: 9, fontSize: 13, fontWeight: 600, border: "1px solid var(--input-border)" }}>{occs.find(o => o.id === preOccId)?.name || "—"}</div>
          : <Select value={f.occupierId} onChange={e => set("occupierId", e.target.value)}><option value="">Select occupier...</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name} ({tierLabel(o.tier)})</option>)}</Select>}
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Date *</label><Input type="date" value={f.date} onChange={e => set("date", e.target.value)} /></div>
        <div style={S.formGroup}><label style={S.label}>Meeting Type</label><Select value={f.type} onChange={e => set("type", e.target.value)}>{MTYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Department</label><Select value={f.department} onChange={e => set("department", e.target.value)}><option value="">Select...</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</Select></div>
        <div style={S.formGroup}><label style={S.label}>Relationship Owner</label><Input value={f.relationshipOwner} onChange={e => set("relationshipOwner", e.target.value)} /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Follow-up Date</label><Input type="date" value={f.followUpDate} onChange={e => set("followUpDate", e.target.value)} /></div>
        <div style={S.formGroup}><label style={S.label}>Outcome</label><Select value={f.outcome} onChange={e => set("outcome", e.target.value)}>{OUTCOMES.map(o => <option key={o}>{o}</option>)}</Select></div>
      </div>
      <div style={S.formGroup}><label style={S.label}>Attendees</label><Input value={f.attendees} onChange={e => set("attendees", e.target.value)} /></div>
      <div style={S.formGroup}><label style={S.label}>Meeting Notes *</label><Textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 120 }} /></div>
      {!editMeet && (
        <div style={S.formGroup}>
          <label style={S.label}>Action Items</label>
          {actionItems.map(ai => (
            <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--occ-hover)", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <div style={{ flex: 1 }}>{ai.description} <span style={{ color: "var(--text-muted)" }}>| {ai.owner||"—"} | {ai.dueDate||"—"}</span></div>
              <ActionStatusBadge status={ai.status} />
              <button onClick={() => setActionItems(p => p.filter(a => a.id !== ai.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: 0 }}>&times;</button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 8, alignItems: "flex-end" }}>
            <Input value={newAI.description} onChange={e => setNewAI(p => ({ ...p, description: e.target.value }))} placeholder="Action..." style={{ padding: "9px 12px", fontSize: 13 }} />
            <Input value={newAI.owner} onChange={e => setNewAI(p => ({ ...p, owner: e.target.value }))} placeholder="Owner" style={{ padding: "9px 12px", fontSize: 13 }} />
            <Input type="date" value={newAI.dueDate} onChange={e => setNewAI(p => ({ ...p, dueDate: e.target.value }))} style={{ padding: "9px 12px", fontSize: 13 }} />
            <Select value={newAI.status} onChange={e => setNewAI(p => ({ ...p, status: e.target.value }))} style={{ padding: "9px 12px", fontSize: 13, width: "auto" }}>{ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
            <Btn style={{ ...S.btnSecondary, ...S.btnSm }} onClick={addAI}>+ Add</Btn>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn style={S.btnPrimary} onClick={() => { const occId = preOccId || f.occupierId; if (!occId || !f.notes.trim()) return; onSave({ ...f, id: f.id || genId(), occupierId: occId, newActionItems: editMeet ? [] : actionItems }); }}>
          {editMeet ? "Update Meeting" : "Log Meeting"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Occupier Detail ──────────────────────────────────────────────────────────
function OccupierDetail({ occ, meets, contacts, actionItems, currentUser, onBack, onEdit, onDeleteOcc, onAddMeeting, onDeleteMeeting, onAddContact, onDeleteContact, onEditContact, onUpdateActionItem }) {
  const occMeets = [...meets.filter(m => m.occupierId === occ.id)].sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
  const occContacts = contacts.filter(c => c.occupierId === occ.id);
  const months = leaseMonths(occ.leaseExpiry);
  const [showContact, setShowContact] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const nx = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" };
  return (
    <div>
      <button style={{ ...S.btn, background: "none", border: "none", padding: "0 0 16px", color: "var(--text-muted)", fontSize: 13 }} onClick={onBack}>← Back to all occupiers</button>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>{occ.name}</span>
              <TierBadge tier={occ.tier} />
              <DepthBadge depth={occ.depth} />
              <Badge label={`${occ.risk} risk`} bg={occ.risk === "High" ? "rgba(239,68,68,0.1)" : occ.risk === "Medium" ? "rgba(233,113,50,0.1)" : "rgba(25,107,36,0.1)"} color={RISK_COLOR[occ.risk]} />
              {occ.renewalStatus && <Badge label={occ.renewalStatus} bg="rgba(21,96,130,0.1)" color="#156082" />}
              {occ.gccClassification && <Badge label={occ.gccClassification} bg="rgba(15,158,213,0.1)" color="#0F9ED5" />}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
              {occ.city && <span>{occ.city}</span>}
              {occ.sector && <span>{occ.sector}</span>}
              {occ.sqft && <span>{fmtNum(occ.sqft)} sq ft</span>}
              {occ.asset && <span>{occ.asset}</span>}
              {occ.building && <span>{occ.building}</span>}
              {occ.unitFloor && <span>{occ.unitFloor}</span>}
              <span>Owner: {occ.owner || "Unassigned"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn style={S.btnSm} onClick={onEdit} disabled={isReadOnly(currentUser)}><Ic n="edit" size={13} /> Edit</Btn>
            {!isReadOnly(currentUser) && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm(`Delete ${occ.name}?`)) onDeleteOcc(occ.id); }}><Ic n="trash" size={13} /></Btn>}
          </div>
        </div>
        <div style={S.grid3}>
          <div style={S.statCard}><div style={S.statLabel}>Lease Expiry</div><div style={{ ...S.statValue, fontSize: 17 }}>{occ.leaseExpiry || "—"}</div>{months !== null && <div style={{ ...S.statSub, color: months < 12 ? "#991b1b" : months < 24 ? "#E97132" : "#196B24" }}>{months > 0 ? `${months} months away` : "Expired"}</div>}</div>
          <div style={S.statCard}><div style={S.statLabel}>Leased Area</div><div style={{ ...S.statValue, fontSize: 17 }}>{occ.sqft ? fmtNum(occ.sqft) : "—"}</div>{occ.sqft && <div style={S.statSub}>sq ft</div>}</div>
          <div style={S.statCard}><div style={S.statLabel}>Meetings Logged</div><div style={S.statValue}>{occMeets.length}</div><div style={S.statSub}>{occMeets[0] ? `Last: ${occMeets[0].date}` : "None yet"}</div></div>
        </div>
        {occ.notes && <div style={{ padding: "10px 14px", background: "var(--input-bg)", borderRadius: 8, fontSize: 13, lineHeight: 1.7, borderLeft: "3px solid #E97132", whiteSpace: "pre-wrap", marginTop: 12 }}>{occ.notes}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...S.sectionTitle, margin: 0 }}>Key Contacts ({occContacts.length})</div>
        {!isReadOnly(currentUser) && <Btn style={{ ...S.btnPrimary, ...S.btnSm }} onClick={() => setShowContact(true)}><Ic n="plus" size={13} /> Add Contact</Btn>}
      </div>
      {occContacts.length === 0
        ? <div style={{ ...S.card, textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>No contacts added yet.</div>
        : <div style={S.card}>{occContacts.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
              <Avatar name={c.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name} {c.isPrimary && <span style={{ ...S.badge, background: "#156082", color: "#fff", fontSize: 9 }}>PRIMARY</span>}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.designation || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, marginTop: 2 }}>
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              {!isReadOnly(currentUser) && <div style={{ display: "flex", gap: 6 }}>
                <Btn style={S.btnSm} onClick={() => setEditContact(c)}><Ic n="edit" size={12} /></Btn>
                <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm(`Delete ${c.name}?`)) onDeleteContact(c.id); }}><Ic n="trash" size={12} /></Btn>
              </div>}
            </div>
          ))}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px" }}>
        <div style={{ ...S.sectionTitle, margin: 0 }}>Meeting Log ({occMeets.length})</div>
        {!isReadOnly(currentUser) && <Btn style={S.btnPrimary} onClick={onAddMeeting}><Ic n="plus" size={14} /> Log Meeting</Btn>}
      </div>
      {occMeets.length === 0
        ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>No meetings logged yet.</div>
        : occMeets.map(m => {
          const meetAIs = actionItems.filter(a => a.meetingId === m.id);
          return (
            <div key={m.id} style={S.meetingItem}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{m.date}</strong>
                  <Badge label={m.type} bg="var(--card-border)" color="var(--text-muted)" />
                  <OutcomeBadge outcome={m.outcome || "Neutral"} />
                  {m.department && <Badge label={m.department} bg="rgba(15,158,213,0.1)" color="#0F9ED5" />}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <CopySynopsisBtn meeting={m} occName={occ.name} actionItems={meetAIs} />
                  {!isReadOnly(currentUser) && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete meeting?")) onDeleteMeeting(m.id); }}><Ic n="trash" size={12} /></Btn>}
                </div>
              </div>
              {m.attendees && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Attendees: {m.attendees}</div>}
              {m.followUpDate && <div style={{ fontSize: 12, color: "#E97132", marginBottom: 4 }}>Follow-up: {m.followUpDate}</div>}
              <div style={{ fontSize: 13, lineHeight: 1.6, background: "var(--input-bg)", padding: 12, borderRadius: 8, borderLeft: "3px solid #156082", whiteSpace: "pre-wrap", marginBottom: 8 }}>{m.notes}</div>
              {meetAIs.length > 0 && (
                <div style={{ background: "rgba(233,113,50,0.06)", padding: 12, borderRadius: 8, borderLeft: "3px solid #E97132" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#E97132", marginBottom: 8, textTransform: "uppercase" }}>Action Items</div>
                  {meetAIs.map(ai => (
                    <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
                      {!isReadOnly(currentUser)
                        ? <button onClick={() => onUpdateActionItem(ai.id, nx[ai.status])} style={{ background: ACTION_STATUS_BG[ai.status] || "#f3f4f6", color: ACTION_STATUS_COLOR[ai.status] || "#374151", border: "none", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{ai.status} →</button>
                        : <ActionStatusBadge status={ai.status} />}
                      <span style={{ flex: 1 }}>{ai.description}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{ai.owner || "—"} · {ai.dueDate || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              {m.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><Avatar name={m.createdBy} size={16} />Logged by {m.createdBy}{m.createdAt ? ` · ${fmtDateTime(m.createdAt)}` : ""}</div>}
            </div>
          );
        })}
      {(showContact || editContact) && <ContactModal occupierId={occ.id} currentUser={currentUser} editContact={editContact} onSave={(c) => { editContact ? (onEditContact(c), setEditContact(null)) : (onAddContact(c), setShowContact(false)); }} onCancel={() => { setShowContact(false); setEditContact(null); }} />}
    </div>
  );
}

// ─── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({ occs, currentUser, defaultDate, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", occupierId: "", eventDate: defaultDate || today(), eventType: "Planned Occupier Connect", recurrence: "None", reminderDays: 3, notes: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...S.modal, maxWidth: 540 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: "var(--text-strong)" }}>Add Engagement Event</h2>
        <div style={S.formGroup}><label style={S.label}>Title *</label><Input value={f.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Date *</label><Input type="date" value={f.eventDate} onChange={e => set("eventDate", e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Event Type</label><Select value={f.eventType} onChange={e => set("eventType", e.target.value)}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
        </div>
        <div style={S.grid2}>
          <div style={S.formGroup}><label style={S.label}>Occupier (optional)</label><Select value={f.occupierId} onChange={e => set("occupierId", e.target.value)}><option value="">All / Portfolio-wide</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div>
          <div style={S.formGroup}><label style={S.label}>Recurrence</label><Select value={f.recurrence} onChange={e => set("recurrence", e.target.value)}>{RECURRENCES.map(r => <option key={r}>{r}</option>)}</Select></div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Reminder (days before)</label><Input type="number" value={f.reminderDays} onChange={e => set("reminderDays", parseInt(e.target.value)||0)} min={0} max={30} style={{ width: 120 }} /></div>
        <div style={S.formGroup}><label style={S.label}>Notes</label><Textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 70 }} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn style={S.btnPrimary} onClick={() => { if (!f.title.trim() || !f.eventDate) return; onSave({ ...f, id: genId(), createdBy: currentUser.name }); }}>Add Event</Btn>
        </div>
      </div>
    </div>
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
  const rdiScore = (rdiCounts.High * 3 + rdiCounts.Medium * 2 + rdiCounts.Low) / (totalRDI * 3);
  const portfolioHealth = rdiScore >= 0.67 ? "Strong" : rdiScore >= 0.33 ? "Moderate" : "Needs Attention";
  const portfolioHealthColor = rdiScore >= 0.67 ? "#196B24" : rdiScore >= 0.33 ? "#E97132" : "#991b1b";
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
  const barW = 60; const barGap = 28; const chartH = 100;

  return (
    <div>
      {expiring18.length > 0 && <div style={S.alertWarn}><Ic n="warning" size={15} /><div><strong>{expiring18.length} lease{expiring18.length > 1 ? "s" : ""} expiring within 18 months:</strong> {expiring18.map(o => `${o.name} (${o.leaseExpiry})`).join(", ")}</div></div>}
      {atRisk.length > 0 && <div style={S.alertRed}><Ic n="warning" size={15} /><div><strong>{atRisk.length} high-risk account{atRisk.length > 1 ? "s" : ""}:</strong> {atRisk.map(o => o.name).join(", ")}</div></div>}

      <div style={{ ...S.grid4, marginBottom: 20 }}>
        <div style={S.statCard}><div style={S.statLabel}>Total Occupiers</div><div style={S.statValue}>{total}</div><div style={S.statSub}>{occs.filter(o => o.tier === "Platinum").length} Platinum</div></div>
        <div style={S.statCard}><div style={S.statLabel}>Meetings Logged</div><div style={S.statValue}>{meets.length}</div><div style={S.statSub}>Across all accounts</div></div>
        <div style={S.statCard}><div style={S.statLabel}>At-Risk Accounts</div><div style={{ ...S.statValue, color: atRisk.length > 0 ? "#991b1b" : "#196B24" }}>{atRisk.length}</div><div style={S.statSub}>High risk flag</div></div>
        <div style={S.statCard}><div style={S.statLabel}>Avg Relationship Depth</div><div style={{ ...S.statValue, fontSize: 16, paddingTop: 4 }}>{avgLabel}</div><div style={S.statSub}>{avgD.toFixed(1)} / 4.0</div></div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Relationship Depth Index (RDI) Health</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: portfolioHealthColor }}>Portfolio: {portfolioHealth}</span>
        </div>
        <div style={S.grid3}>
          {["High","Medium","Low"].map(rdi => (
            <div key={rdi} style={{ ...S.statCard, borderLeft: `4px solid ${RDI_COLORS[rdi]}`, padding: 18 }}>
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
            ? <div style={{ color: "#196B24", fontSize: 13, textAlign: "center", padding: 20 }}>All occupiers are on track</div>
            : overdueOccs.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
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
                <div style={{ height: 6, background: "var(--border-med)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxDeptCount) * 100}%`, background: "linear-gradient(135deg,#156082,#0F9ED5)", borderRadius: 4 }} />
                </div>
              </div>
            ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            <div style={{ ...S.sectionTitle, fontSize: 10, marginBottom: 6 }}>By relationship depth</div>
            {depthCounts.map(({ d, n }) => (
              <div key={d} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span>{d}</span><strong>{n}</strong></div>
                <ProgressBar pct={n / Math.max(total, 1) * 100} color={HEALTH_COLOR[d]} />
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={S.sectionTitle}>Recent Activity</div>
              {!isReadOnly(currentUser) && <Btn style={{ ...S.btnPrimary, ...S.btnSm }} onClick={onLogMeeting}><Ic n="plus" size={13} /> Log Meeting</Btn>}
            </div>
            {recent.length === 0
              ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>No meetings logged yet</div>
              : recent.map(m => {
                const occ = occs.find(o => o.id === m.occupierId);
                return (
                  <div key={m.id} style={S.activityLine}>
                    {m.createdBy && <Avatar name={m.createdBy} size={26} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => occ && onGotoOcc(occ.id)}>{occ?.name || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.type}{m.createdBy ? ` · by ${m.createdBy}` : ""}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(m.notes||"").replace(/\n/g," ")}</div>
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
  const prevMonth = () => { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); };
  const nextMonth = () => { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); };
  const pad = n => String(n).padStart(2, "0");
  const dateStr = d => `${year}-${pad(month + 1)}-${pad(d)}`;
  const todayStr = today();
  const eventsByDate = {};
  events.forEach(e => { const d = e.eventDate?.slice(0, 10); if (d) { if (!eventsByDate[d]) eventsByDate[d] = []; eventsByDate[d].push({ ...e, _kind: "event" }); } });
  meets.forEach(m => { if (m.followUpDate) { const d = m.followUpDate.slice(0, 10); if (!eventsByDate[d]) eventsByDate[d] = []; const occ = occs.find(o => o.id === m.occupierId); eventsByDate[d].push({ id: m.id + "_fu", title: `Follow-up: ${occ?.name || "Meeting"}`, eventType: "Recurring Meeting", _kind: "followup" }); } });
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const upcomingLimit = new Date(); upcomingLimit.setDate(upcomingLimit.getDate() + 30);
  const upcomingEvents = [...events].filter(e => { const d = new Date(e.eventDate); return d >= new Date(todayStr) && d <= upcomingLimit; }).sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={S.pageTitle}>Engagement Calendar</div>
        {!isReadOnly(currentUser, "calendar") && <Btn style={S.btnPrimary} onClick={() => { setDefaultDate(today()); setShowEventModal(true); }}><Ic n="plus" size={14} /> Add Event</Btn>}
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Btn style={S.btnSm} onClick={prevMonth}>‹</Btn>
            <strong style={{ fontSize: 15 }}>{monthName}</strong>
            <Btn style={S.btnSm} onClick={nextMonth}>›</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={"e"+i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1; const ds = dateStr(day);
              const dayEvents = eventsByDate[ds] || [];
              const isToday = ds === todayStr; const isSel = ds === selectedDay;
              return (
                <div key={day} onClick={() => setSelectedDay(ds === selectedDay ? null : ds)} style={{ padding: "6px 2px", borderRadius: 8, cursor: "pointer", background: isSel ? "#E97132" : isToday ? "rgba(233,113,50,0.12)" : "transparent", border: isToday ? "1px solid rgba(233,113,50,0.4)" : "1px solid transparent", transition: "all .15s" }}>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isSel ? "#fff" : "var(--text-strong)" }}>{day}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", marginTop: 2 }}>
                    {dayEvents.slice(0, 3).map((ev, idx) => <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280" }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          {selectedDay && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ ...S.sectionTitle, margin: "0 0 12px" }}>{selectedDay} — {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</div>
              {selectedDayEvents.length === 0
                ? <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 16, textAlign: "center" }}>No events on this day.</div>
                : selectedDayEvents.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ev.eventType}</div>
                    </div>
                    {!isReadOnly(currentUser, "calendar") && ev._kind === "event" && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete event?")) onDeleteEvent(ev.id); }}><Ic n="trash" size={12} /></Btn>}
                  </div>
                ))}
              {!isReadOnly(currentUser, "calendar") && <Btn style={{ ...S.btnPrimary, ...S.btnSm, marginTop: 12 }} onClick={() => { setDefaultDate(selectedDay); setShowEventModal(true); }}><Ic n="plus" size={13} /> Add event on this day</Btn>}
            </div>
          )}
          <div style={S.card}>
            <div style={S.sectionTitle}>Upcoming Events (next 30 days)</div>
            {upcomingEvents.length === 0
              ? <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>No upcoming events</div>
              : upcomingEvents.map(ev => {
                const occ = ev.occupierId ? occs.find(o => o.id === ev.occupierId) : null;
                return (
                  <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: EVENT_TYPE_COLORS[ev.eventType] || "#6b7280", flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ev.eventDate} · {ev.eventType}{occ ? ` · ${occ.name}` : ""}</div>
                    </div>
                    {ev.recurrence && ev.recurrence !== "None" && <Badge label={ev.recurrence} bg="rgba(21,96,130,0.1)" color="#0F9ED5" />}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {showEventModal && <EventModal occs={occs} currentUser={currentUser} defaultDate={defaultDate} onSave={ev => { onAddEvent(ev); setShowEventModal(false); }} onCancel={() => setShowEventModal(false)} />}
    </div>
  );
}

// ─── TAT Tracker Tab ──────────────────────────────────────────────────────────
function TasksTab({ actionItems, meets, occs, currentUser, onUpdateStatus }) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOcc, setFilterOcc] = useState("");
  const nextStatus = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" };
  const statusColors = { Open: "#ef4444", "In Progress": "#E97132", Closed: "#196B24" };
  const counts = { Open: 0, "In Progress": 0, Closed: 0 };
  actionItems.forEach(ai => { if (counts[ai.status] !== undefined) counts[ai.status]++; });
  const enriched = actionItems.map(ai => {
    const meet = meets.find(m => m.id === ai.meetingId);
    const occ = meet ? occs.find(o => o.id === meet.occupierId) : null;
    return { ...ai, meetDate: meet?.date, occName: occ?.name || "Unknown", occId: occ?.id };
  }).filter(ai => {
    if (filterStatus && ai.status !== filterStatus) return false;
    if (filterOcc && ai.occId !== filterOcc) return false;
    return true;
  }).sort((a, b) => {
    const ord = { Open: 0, "In Progress": 1, Closed: 2 };
    if (ord[a.status] !== ord[b.status]) return ord[a.status] - ord[b.status];
    if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const exportCSV = () => {
    const rows = [["Occupier","Meeting Date","Action Item","Owner","Due Date","Status"], ...enriched.map(ai => [ai.occName, ai.meetDate||"—", ai.description, ai.owner||"—", ai.dueDate||"—", ai.status])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "action-items.csv" }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={S.pageTitle}>TAT Tracker — Action Items</div>
        <Btn style={S.btnSm} onClick={exportCSV}><Ic n="download" size={13} /> Export CSV</Btn>
      </div>
      <div style={{ ...S.grid3, marginBottom: 20 }}>
        {["Open","In Progress","Closed"].map(s => (
          <div key={s} style={{ ...S.statCard, borderLeft: `4px solid ${statusColors[s]}`, cursor: "pointer", outline: filterStatus === s ? `2px solid ${statusColors[s]}` : "none" }} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}>
            <div style={{ ...S.statLabel, color: statusColors[s] }}>{s}</div>
            <div style={{ ...S.statValue, color: statusColors[s] }}>{counts[s]}</div>
            <div style={S.statSub}>Click to filter</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Select style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">All statuses</option>{ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
        <Select style={{ width: "auto" }} value={filterOcc} onChange={e => setFilterOcc(e.target.value)}><option value="">All occupiers</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
        {(filterStatus || filterOcc) && <Btn style={S.btnSm} onClick={() => { setFilterStatus(""); setFilterOcc(""); }}><Ic n="x" size={12} /> Clear</Btn>}
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{enriched.length} item{enriched.length !== 1 ? "s" : ""}</span>
      </div>
      {enriched.length === 0
        ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>{actionItems.length === 0 ? "No action items yet." : "No items match your filter."}</div>
        : <div style={S.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-med)" }}>
                    {["Status","Occupier","Meeting Date","Action Item","Owner","Due Date"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(ai => {
                    const overdue = ai.dueDate && ai.status !== "Closed" && new Date(ai.dueDate) < new Date(today());
                    return (
                      <tr key={ai.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          {!isReadOnly(currentUser, "tasks")
                            ? <button onClick={() => onUpdateStatus(ai.id, nextStatus[ai.status])} style={{ background: ACTION_STATUS_BG[ai.status]||"#f3f4f6", color: ACTION_STATUS_COLOR[ai.status]||"#374151", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{ai.status} →</button>
                            : <ActionStatusBadge status={ai.status} />}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{ai.occName}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{ai.meetDate||"—"}</td>
                        <td style={{ padding: "10px 12px" }}>{ai.description}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{ai.owner||"—"}</td>
                        <td style={{ padding: "10px 12px", color: overdue ? "#ef4444" : "var(--text-muted)", fontWeight: overdue ? 700 : 400, whiteSpace: "nowrap" }}>{ai.dueDate||"—"}{overdue ? " !" : ""}</td>
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
function AnalyticsTab({ occs, meets }) {
  const teamMap = {};
  meets.forEach(m => { const u = m.createdBy || "Unknown"; if (!teamMap[u]) teamMap[u] = { user: u, count: 0, lastDate: null, occIds: new Set() }; teamMap[u].count++; if (!teamMap[u].lastDate || m.date > teamMap[u].lastDate) teamMap[u].lastDate = m.date; teamMap[u].occIds.add(m.occupierId); });
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
    const y = d.getFullYear(); const mo = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleString("en-IN", { month: "short" });
    const count = meets.filter(m => m.date?.startsWith(`${y}-${mo}`)).length;
    trendData.push({ label, count });
  }
  const maxTrend = Math.max(...trendData.map(x => x.count), 1);
  const tBarW = 48; const tBarGap = 18; const tChartH = 100;
  const exportTeam = () => {
    const rows = [["Team Member","Total Meetings","Last Meeting","Occupiers Covered"], ...teamRows.map(r => [r.user, r.count, r.lastDate||"—", r.occIds.size])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    Object.assign(document.createElement("a"),{href:url,download:"team-engagement.csv"}).click();
    URL.revokeObjectURL(url);
  };
  const exportCoverage = () => {
    const rows = [["Occupier","Tier","Last Meeting","Days Since","Cadence","Status"], ...coverageRows.map(r => [r.name, r.tier, r.lastDate||"Never", r.daysSince??"-", r.cadence, r.status])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    Object.assign(document.createElement("a"),{href:url,download:"coverage.csv"}).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div style={S.pageTitle}>Analytics & Reports</div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.sectionTitle}>RDI Health Distribution</div>
          {["High","Medium","Low"].map(rdi => (
            <div key={rdi} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: RDI_COLORS[rdi] }}>{rdi} RDI</span>
                <span>{rdiCounts[rdi]} ({Math.round(rdiCounts[rdi] / totalOccs * 100)}%)</span>
              </div>
              <div style={{ height: 10, background: "var(--border-med)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${rdiCounts[rdi] / totalOccs * 100}%`, background: RDI_COLORS[rdi], borderRadius: 6, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>Meeting Activity — Last 6 Months</div>
          <svg width="100%" viewBox={`0 0 ${trendData.length*(tBarW+tBarGap)+20} ${tChartH+50}`} style={{ overflow:"visible" }}>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#156082" /><stop offset="100%" stopColor="#0F9ED5" /></linearGradient></defs>
            {trendData.map(({ label, count }, i) => {
              const x = 10 + i*(tBarW+tBarGap); const h = Math.max(4,(count/maxTrend)*tChartH);
              return (<g key={label}><rect x={x} y={tChartH-h} width={tBarW} height={h} rx={5} fill="url(#tg)" opacity={0.9} /><text x={x+tBarW/2} y={tChartH-h-6} textAnchor="middle" fill="var(--text-strong)" fontSize={12} fontWeight={700}>{count}</text><text x={x+tBarW/2} y={tChartH+18} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{label}</text></g>);
            })}
          </svg>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Team Engagement</div>
          <Btn style={S.btnSm} onClick={exportTeam}><Ic n="download" size={13} /> Export</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border-med)" }}>{["Team Member","Meetings","Last Meeting","Occupiers"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>)}</tr></thead>
            <tbody>{teamRows.length === 0 ? <tr><td colSpan={4} style={{ textAlign:"center",padding:24,color:"var(--text-muted)" }}>No data</td></tr> : teamRows.map(row => (<tr key={row.user} style={{ borderBottom: "1px solid var(--divider)" }}><td style={{ padding:"10px 12px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><Avatar name={row.user} size={24} />{row.user}</div></td><td style={{ padding:"10px 12px",fontWeight:700 }}>{row.count}</td><td style={{ padding:"10px 12px",color:"var(--text-muted)" }}>{row.lastDate||"—"}</td><td style={{ padding:"10px 12px",fontWeight:600 }}>{row.occIds.size}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={S.sectionTitle}>Occupier Coverage</div>
          <Btn style={S.btnSm} onClick={exportCoverage}><Ic n="download" size={13} /> Export</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border-med)" }}>{["Occupier","Tier","Last Meeting","Days Since","Cadence","Status"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>)}</tr></thead>
            <tbody>
              {coverageRows.map(row => {
                const sc = row.status === "On Track" ? "#196B24" : row.status === "Overdue" ? "#ef4444" : "#E97132";
                return (<tr key={row.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                  <td style={{ padding:"10px 12px",fontWeight:600 }}>{row.name}</td>
                  <td style={{ padding:"10px 12px" }}><TierBadge tier={row.tier} /></td>
                  <td style={{ padding:"10px 12px",color:"var(--text-muted)" }}>{row.lastDate||"Never"}</td>
                  <td style={{ padding:"10px 12px",fontWeight:600,color:row.daysSince&&row.daysSince>row.cadence?"#ef4444":"var(--text-strong)" }}>{row.daysSince!=null?`${row.daysSince}d`:"—"}</td>
                  <td style={{ padding:"10px 12px",color:"var(--text-muted)" }}>{row.cadence}d</td>
                  <td style={{ padding:"10px 12px" }}><Badge label={row.status} bg={sc+"22"} color={sc} /></td>
                </tr>);
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
  const [sidebarOpen, setSidebarOpen] = useState(() => { try { return localStorage.getItem("krt_sidebar") !== "0"; } catch { return true; } });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [preOccId, setPreOccId] = useState(null);
  const [editMeet, setEditMeet] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterDepth, setFilterDepth] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterMeetSearch, setFilterMeetSearch] = useState("");
  const [filterMeetOcc, setFilterMeetOcc] = useState("");
  const [filterMeetOutcome, setFilterMeetOutcome] = useState("");
  const [filterMeetDept, setFilterMeetDept] = useState("");
  const [selectedOccIds, setSelectedOccIds] = useState(new Set());

  const toggleSidebar = () => setSidebarOpen(p => { const v = !p; try { localStorage.setItem("krt_sidebar", v ? "1" : "0"); } catch {} return v; });

  // Hardcoded fallback admin — always available even if DB has no users yet
  const HARDCODED_ADMIN = {
    id: "hardcoded-admin-001",
    name: "Aryak Agrahari",
    email: "aryak.agrahari@vayuz.com",
    role: "Management",
    isAdmin: true,
    active: true,
    otpCode: "847231",
    passHash: "",
    permissions: {},
    createdAt: "",
    createdBy: "system",
  };

  const loadAll = useCallback(async () => {
    try {
      // Fire all queries independently so one missing table doesn't block the rest
      const [uR, oR, mR, aR, cR, aiR, evR, rR] = await Promise.all([
        supabase.from("users").select("*").then(r => r).catch(() => ({ data: null })),
        supabase.from("occupiers").select("*").then(r => r).catch(() => ({ data: null })),
        supabase.from("meetings").select("*").then(r => r).catch(() => ({ data: null })),
        supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500).then(r => r).catch(() => ({ data: null })),
        supabase.from("key_contacts").select("*").then(r => r).catch(() => ({ data: null })),
        supabase.from("action_items").select("*").then(r => r).catch(() => ({ data: null })),
        supabase.from("engagement_events").select("*").order("event_date", { ascending: true }).then(r => r).catch(() => ({ data: null })),
        supabase.from("roles").select("*").then(r => r).catch(() => ({ data: null })),
      ]);
      const dbUsers = (uR.data || []).map(mapUser);
      // Always inject hardcoded admin unless a DB user with same email/name exists
      const hasAdmin = dbUsers.some(u => u.email === HARDCODED_ADMIN.email || u.name === HARDCODED_ADMIN.name);
      setUsers(hasAdmin ? dbUsers : [HARDCODED_ADMIN, ...dbUsers]);
      if (oR.data) setOccs(oR.data.map(mapOcc));
      if (mR.data) setMeets(mR.data.map(mapMeet));
      if (aR.data) setAudit(aR.data.map(mapAudit));
      if (cR.data) setContacts(cR.data.map(mapContact));
      if (aiR.data) setActionItems(aiR.data.map(mapActionItem));
      if (evR.data) setEvents(evR.data.map(mapEvent));
      if (rR.data) setRoles(rR.data.map(mapRole));
      setLastSync(new Date());
    } catch (e) {
      console.error(e);
      // Even on total failure, ensure hardcoded admin is available
      setUsers([HARDCODED_ADMIN]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (users.length === 0) return;
    try {
      const s = localStorage.getItem(SK_SESSION);
      if (s) { const sd = JSON.parse(s); const u = users.find(x => x.id === sd.id && x.active !== false); if (u) setCurrentUser(resolvePermissions(u, roles)); }
    } catch {}
  }, [users.length, roles.length]);
  useEffect(() => { const iv = setInterval(loadAll, 30000); return () => clearInterval(iv); }, [loadAll]);

  const addAudit = async (user, action, target = "") => {
    const entry = { user_name: user, action, target, at: tsNow() };
    await supabase.from("audit_log").insert([entry]);
    setAudit(p => [{ id: genId(), user, action, target, at: entry.at }, ...p].slice(0, 500));
  };

  const handleFirstRun = async ({ name, email, otp }) => {
    const dbUser = { name, role: "Management", is_admin: true, is_active: true, password_hash: "", email, otp_code: otp, created_by: name };
    const { data, error } = await supabase.from("users").insert([dbUser]).select();
    if (error) throw error;
    const admin = mapUser(data[0]);
    await addAudit(admin.name, "set up CRM as admin");
    setUsers([admin]);
    const u = resolvePermissions(admin, []);
    setCurrentUser(u);
    try { localStorage.setItem(SK_SESSION, JSON.stringify({ id: admin.id })); } catch {}
  };

  const handleLogin = async (user) => {
    const u = resolvePermissions(user, roles);
    setCurrentUser(u);
    await addAudit(user.name, "signed in");
    try { localStorage.setItem(SK_SESSION, JSON.stringify({ id: user.id })); } catch {}
  };

  const handleLogout = async () => {
    if (currentUser) await addAudit(currentUser.name, "signed out");
    setCurrentUser(null);
    try { localStorage.removeItem(SK_SESSION); } catch {}
  };

  const handleAddUser = async ({ name, role, email, isAdmin, otp }) => {
    const dbUser = { name, role, is_admin: isAdmin, is_active: true, password_hash: "", email, otp_code: otp, created_by: currentUser.name };
    const { data, error } = await supabase.from("users").insert([dbUser]).select();
    if (error) throw error;
    const u = mapUser(data[0]);
    setUsers(p => [...p, u]);
    await addAudit(currentUser.name, `added user${isAdmin ? " (admin)" : ""}`, name);
  };

  const handleResetOTP = async (uid, newOtp) => {
    await supabase.from("users").update({ otp_code: newOtp }).eq("id", uid);
    const target = users.find(u => u.id === uid);
    setUsers(p => p.map(u => u.id === uid ? { ...u, otpCode: newOtp } : u));
    await addAudit(currentUser.name, "reset OTP for", target?.name || "user");
  };

  const handleToggleActive = async (uid) => {
    const target = users.find(u => u.id === uid);
    const newActive = target.active === false ? true : false;
    await supabase.from("users").update({ is_active: newActive }).eq("id", uid);
    setUsers(p => p.map(u => u.id === uid ? { ...u, active: newActive } : u));
    await addAudit(currentUser.name, newActive ? "reactivated" : "deactivated", target?.name);
  };

  const handleToggleAdmin = async (uid) => {
    const target = users.find(u => u.id === uid); if (!target) return;
    const adminCount = users.filter(u => u.isAdmin && u.active !== false).length;
    if (target.isAdmin && adminCount <= 1) { alert("Cannot demote — at least one admin must remain."); return; }
    const newIsAdmin = !target.isAdmin;
    await supabase.from("users").update({ is_admin: newIsAdmin }).eq("id", uid);
    setUsers(p => p.map(u => u.id === uid ? { ...u, isAdmin: newIsAdmin } : u));
    await addAudit(currentUser.name, newIsAdmin ? "promoted to admin" : "demoted from admin", target.name);
  };

  const handleAddRole = async ({ name, permissions }) => {
    const dbRole = { name, permissions, created_by: currentUser.name, created_at: tsNow() };
    const { data, error } = await supabase.from("roles").insert([dbRole]).select();
    if (error) throw error;
    setRoles(p => [...p, mapRole(data[0])]);
    await addAudit(currentUser.name, "created role", name);
  };

  const handleDeleteRole = async (id) => {
    const role = roles.find(r => r.id === id);
    await supabase.from("roles").delete().eq("id", id);
    setRoles(p => p.filter(r => r.id !== id));
    await addAudit(currentUser.name, "deleted role", role?.name || "");
  };

  const handleSaveOcc = async (occ) => {
    if (isReadOnly(currentUser)) return;
    const existing = occs.findIndex(o => o.id === occ.id);
    const now = tsNow();
    const dbOcc = { name: occ.name, tier: occ.tier, depth: occ.depth, sector: occ.sector, city: occ.city, sqft: occ.sqft ? parseInt(occ.sqft) : null, lease_expiry: occ.leaseExpiry, risk: occ.risk, owner: occ.owner, notes: occ.notes, gcc_classification: occ.gccClassification, asset: occ.asset, building: occ.building, unit_floor: occ.unitFloor, renewal_status: occ.renewalStatus, relationship_tenure: occ.relationshipTenure || null };
    if (existing >= 0) {
      dbOcc.updated_by = currentUser.name; dbOcc.updated_at = now;
      const { data } = await supabase.from("occupiers").update(dbOcc).eq("id", occ.id).select();
      setOccs(p => p.map(o => o.id === occ.id ? mapOcc(data[0]) : o));
      await addAudit(currentUser.name, "edited occupier", occ.name);
    } else {
      dbOcc.created_by = currentUser.name; dbOcc.created_at = now;
      const { data } = await supabase.from("occupiers").insert([dbOcc]).select();
      const created = mapOcc(data[0]);
      setOccs(p => [...p, created]); setSelectedOccId(created.id);
      await addAudit(currentUser.name, "added occupier", occ.name);
      setTab("occupiers");
    }
    setShowOccForm(false); setEditOcc(null);
  };

  const handleBulkUploaded = async () => {
    setShowBulkUpload(false);
    await loadAll();
    await addAudit(currentUser.name, "bulk uploaded occupiers");
  };

  const handleDeleteSelectedOccs = async () => {
    if (!currentUser.isAdmin) return;
    const ids = Array.from(selectedOccIds);
    if (!window.confirm(`Delete ${ids.length} selected occupier${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    for (const id of ids) {
      const occ = occs.find(o => o.id === id); if (!occ) continue;
      await supabase.from("occupiers").delete().eq("id", id);
      await addAudit(currentUser.name, "deleted occupier", occ.name);
    }
    setOccs(p => p.filter(o => !ids.includes(o.id)));
    setMeets(p => p.filter(m => !ids.includes(m.occupierId)));
    setContacts(p => p.filter(c => !ids.includes(c.occupierId)));
    setSelectedOccIds(new Set());
  };

  const handleSaveMeet = async (m) => {
    if (isReadOnly(currentUser, "meetings")) return;
    const occName = occs.find(o => o.id === m.occupierId)?.name || "Unknown";
    const isEdit = meets.some(x => x.id === m.id);
    const dbMeet = { occupier_id: m.occupierId, meeting_date: m.date, meeting_type: m.type, attendees: m.attendees, notes: m.notes, actions: m.actions, outcome: m.outcome, department: m.department, follow_up_date: m.followUpDate || null, relationship_owner: m.relationshipOwner };
    if (isEdit) {
      await supabase.from("meetings").update(dbMeet).eq("id", m.id);
      setMeets(p => p.map(x => x.id === m.id ? { ...x, ...m } : x));
      await addAudit(currentUser.name, "edited meeting for", occName);
    } else {
      dbMeet.created_by = currentUser.name; dbMeet.created_at = tsNow();
      const { data } = await supabase.from("meetings").insert([dbMeet]).select();
      const created = mapMeet(data[0]);
      setMeets(p => [...p, created]);
      if (m.newActionItems?.length > 0) {
        const aiRows = m.newActionItems.map(ai => ({ meeting_id: created.id, description: ai.description, owner: ai.owner, due_date: ai.dueDate || null, status: ai.status, created_at: tsNow(), updated_at: tsNow() }));
        const { data: aiData } = await supabase.from("action_items").insert(aiRows).select();
        if (aiData) setActionItems(p => [...p, ...aiData.map(mapActionItem)]);
      }
      await addAudit(currentUser.name, "logged meeting for", occName);
    }
    setShowMeetForm(false); setPreOccId(null); setEditMeet(null);
  };

  const handleDeleteMeet = async (id) => {
    if (isReadOnly(currentUser, "meetings")) return;
    const m = meets.find(x => x.id === id);
    const occName = occs.find(o => o.id === m?.occupierId)?.name || "Unknown";
    await supabase.from("meetings").delete().eq("id", id);
    await supabase.from("action_items").delete().eq("meeting_id", id);
    setMeets(p => p.filter(x => x.id !== id));
    setActionItems(p => p.filter(a => a.meetingId !== id));
    await addAudit(currentUser.name, "deleted meeting from", occName);
  };

  const handleAddContact = async (contact) => {
    if (isReadOnly(currentUser)) return;
    const occ = occs.find(o => o.id === contact.occupierId);
    const dbContact = { occupier_id: contact.occupierId, name: contact.name, designation: contact.designation, email: contact.email, phone: contact.phone, is_primary: contact.isPrimary, created_by: currentUser.name, created_at: tsNow() };
    const { data } = await supabase.from("key_contacts").insert([dbContact]).select();
    if (data) { setContacts(p => [...p, mapContact(data[0])]); await addAudit(currentUser.name, "added contact", contact.name + " @ " + (occ?.name || "")); }
  };

  const handleDeleteContact = async (id) => {
    if (isReadOnly(currentUser)) return;
    const c = contacts.find(x => x.id === id);
    await supabase.from("key_contacts").delete().eq("id", id);
    setContacts(p => p.filter(x => x.id !== id));
    await addAudit(currentUser.name, "deleted contact", c?.name || "");
  };

  const handleEditContact = async (contact) => {
    if (isReadOnly(currentUser)) return;
    await supabase.from("key_contacts").update({ name: contact.name, designation: contact.designation, email: contact.email, phone: contact.phone, is_primary: contact.isPrimary }).eq("id", contact.id);
    setContacts(p => p.map(c => c.id === contact.id ? { ...c, ...contact } : c));
    await addAudit(currentUser.name, "edited contact", contact.name);
  };

  const handleAddEvent = async (ev) => {
    if (isReadOnly(currentUser, "calendar")) return;
    const dbEv = { title: ev.title, occupier_id: ev.occupierId || null, event_date: ev.eventDate, event_type: ev.eventType, recurrence: ev.recurrence, reminder_days: ev.reminderDays, notes: ev.notes, created_by: currentUser.name, created_at: tsNow() };
    const { data } = await supabase.from("engagement_events").insert([dbEv]).select();
    if (data) { setEvents(p => [...p, mapEvent(data[0])].sort((a, b) => a.eventDate.localeCompare(b.eventDate))); await addAudit(currentUser.name, "added event", ev.title); }
  };

  const handleDeleteEvent = async (id) => {
    if (isReadOnly(currentUser, "calendar")) return;
    const ev = events.find(x => x.id === id);
    await supabase.from("engagement_events").delete().eq("id", id);
    setEvents(p => p.filter(x => x.id !== id));
    await addAudit(currentUser.name, "deleted event", ev?.title || "");
  };

  const handleDeleteOcc = async (id) => {
    if (isReadOnly(currentUser)) return;
    const occ = occs.find(o => o.id === id); if (!occ) return;
    const occMeetIds = meets.filter(m => m.occupierId === id).map(m => m.id);
    await supabase.from("occupiers").delete().eq("id", id);
    setOccs(p => p.filter(o => o.id !== id)); setMeets(p => p.filter(m => m.occupierId !== id)); setContacts(p => p.filter(c => c.occupierId !== id)); setActionItems(p => p.filter(a => !occMeetIds.includes(a.meetingId)));
    setSelectedOccId(null); setTab("occupiers");
    await addAudit(currentUser.name, "deleted occupier", occ.name);
  };

  const handleUpdateActionItem = async (id, newStatus) => {
    if (isReadOnly(currentUser, "tasks")) return;
    await supabase.from("action_items").update({ status: newStatus, updated_at: tsNow() }).eq("id", id);
    setActionItems(p => p.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  const filteredOccs = useMemo(() => occs.filter(o => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !(o.city||"").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTier && o.tier !== filterTier) return false;
    if (filterDepth && o.depth !== filterDepth) return false;
    if (filterRisk && o.risk !== filterRisk) return false;
    return true;
  }), [occs, search, filterTier, filterDepth, filterRisk]);

  const filteredMeets = useMemo(() => [...meets].filter(m => {
    if (filterMeetOcc && m.occupierId !== filterMeetOcc) return false;
    if (filterMeetOutcome && m.outcome !== filterMeetOutcome) return false;
    if (filterMeetDept && m.department !== filterMeetDept) return false;
    if (filterMeetSearch) { const occ = occs.find(o => o.id === m.occupierId); if (!(occ?.name||"").toLowerCase().includes(filterMeetSearch.toLowerCase()) && !(m.notes||"").toLowerCase().includes(filterMeetSearch.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)), [meets, occs, filterMeetSearch, filterMeetOcc, filterMeetOutcome, filterMeetDept]);

  const selectedOcc = occs.find(o => o.id === selectedOccId);
  const gotoOcc = (id) => { setTab("occupiers"); setSelectedOccId(id); setShowOccForm(false); };

  const wrap = node => (
    <div style={S.app} data-theme={theme}>
      <ThemeStyles />
      {node}
    </div>
  );

  if (loading) return wrap(<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><Spinner label="Loading workspace..." /></div>);
  if (users.length === 0) return wrap(<FirstRunSetup onDone={handleFirstRun} />);
  if (!currentUser) return wrap(<LoginScreen users={users} onLogin={handleLogin} />);

  const nx = { Open: "In Progress", "In Progress": "Closed", Closed: "Open" };

  return (
    <div style={S.app} data-theme={theme}>
      <ThemeStyles />
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoTopbar />
          <span style={S.topbarTitle}>Knowledge Realty Trust — Tracker</span>
          {lastSync && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>↻ {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{occs.length} occupiers · {meets.length} meetings</span>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, color: "rgba(255,255,255,0.6)", display: "flex" }} title="Toggle theme">
            <Ic n={theme === "dark" ? "sun" : "moon"} size={18} color="rgba(255,255,255,0.6)" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Avatar name={currentUser.name} size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                {currentUser.name}
                {currentUser.isAdmin && <span style={{ fontSize: 9, color: "#E97132", marginLeft: 6 }}>● ADMIN</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{currentUser.role}</div>
            </div>
            <button style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", marginLeft: 4, padding: 0 }} onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={S.layout}>
        <Sidebar tab={tab} setTab={(t) => { setTab(t); setSelectedOccId(null); }} currentUser={currentUser} open={sidebarOpen} onToggle={toggleSidebar} />
        <div style={{ flex: 1, overflowX: "hidden" }}>
          <div style={S.main}>

            {/* Read-only banner */}
            {!currentUser.isAdmin && isReadOnly(currentUser) && (
              <div style={{ ...S.alertWarn, marginBottom: 20 }}>
                <Ic n="eye" size={15} /><div><strong>Read-only access.</strong> You can view all data but cannot add, edit, or delete records.</div>
              </div>
            )}

            {/* Dashboard */}
            {tab === "dashboard" && <Dashboard occs={occs} meets={meets} currentUser={currentUser} onGotoOcc={gotoOcc} onLogMeeting={() => setShowMeetForm(true)} />}

            {/* Occupiers list */}
            {tab === "occupiers" && !selectedOccId && (
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                    <Ic n="dashboard" size={14} color="#94a3b8" />
                    <Input style={{ paddingLeft: 32 }} placeholder="Search by name or city..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select style={{ width: "auto" }} value={filterTier} onChange={e => setFilterTier(e.target.value)}><option value="">All tiers</option>{TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</Select>
                  <Select style={{ width: "auto" }} value={filterDepth} onChange={e => setFilterDepth(e.target.value)}><option value="">All depths</option>{DEPTHS.map(d => <option key={d}>{d}</option>)}</Select>
                  <Select style={{ width: "auto" }} value={filterRisk} onChange={e => setFilterRisk(e.target.value)}><option value="">All risk</option>{RISK.map(r => <option key={r}>{r}</option>)}</Select>
                  {canWrite(currentUser, "occupiers") && (
                    <>
                      <Btn style={S.btnSecondary} onClick={() => setShowBulkUpload(true)}><Ic n="upload" size={14} /> Bulk Upload</Btn>
                      <Btn style={S.btnPrimary} onClick={() => { setEditOcc(null); setShowOccForm(true); }}><Ic n="plus" size={14} /> Add Occupier</Btn>
                    </>
                  )}
                  {selectedOccIds.size > 0 && currentUser.isAdmin && (
                    <Btn style={S.btnDanger} onClick={handleDeleteSelectedOccs}><Ic n="trash" size={14} /> Delete ({selectedOccIds.size})</Btn>
                  )}
                </div>
                <div style={{ ...S.card, padding: "6px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "4px 10px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", gap: 10, borderBottom: "1px solid var(--divider)" }}>
                    {currentUser.isAdmin && <div style={{ width: 22 }}><input type="checkbox" checked={filteredOccs.length > 0 && filteredOccs.every(o => selectedOccIds.has(o.id))} onChange={e => { if (e.target.checked) setSelectedOccIds(new Set(filteredOccs.map(o => o.id))); else setSelectedOccIds(new Set()); }} /></div>}
                    <div style={{ width: 9 }} /><div style={{ flex: 1 }}>Name</div><div style={{ width: 110 }}>Tier</div><div style={{ width: 90 }}>Depth</div><div style={{ width: 90 }}>City</div><div style={{ width: 70 }}>Risk</div><div style={{ width: 80 }}>GCC</div><div style={{ width: 100 }}>Last Meeting</div><div style={{ width: 80 }}>Added by</div><div style={{ width: 20 }} />
                  </div>
                  {filteredOccs.length === 0
                    ? <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>No occupiers match your filters</div>
                    : filteredOccs.map(o => {
                      const occMeets = meets.filter(m => m.occupierId === o.id).sort((a, b) => b.date.localeCompare(a.date));
                      const last = occMeets[0];
                      const isSel = selectedOccIds.has(o.id);
                      return (
                        <div key={o.id} style={{ ...S.occRow, background: isSel ? "rgba(233,113,50,0.06)" : "transparent" }}
                          onMouseEnter={e => { e.currentTarget.style.background = isSel ? "rgba(233,113,50,0.08)" : "var(--occ-hover)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isSel ? "rgba(233,113,50,0.06)" : "transparent"; }}>
                          {currentUser.isAdmin && (
                            <div style={{ width: 22 }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSel} onChange={e => { const ns = new Set(selectedOccIds); e.target.checked ? ns.add(o.id) : ns.delete(o.id); setSelectedOccIds(ns); }} />
                            </div>
                          )}
                          <div style={{ width: 9, height: 9, borderRadius: "50%", background: HEALTH_COLOR[o.depth] || "#ccc", flexShrink: 0 }} onClick={() => setSelectedOccId(o.id)} />
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => setSelectedOccId(o.id)}>{o.name}</div>
                          <div style={{ width: 110 }} onClick={() => setSelectedOccId(o.id)}><TierBadge tier={o.tier} /></div>
                          <div style={{ width: 90 }} onClick={() => setSelectedOccId(o.id)}><DepthBadge depth={o.depth} /></div>
                          <div style={{ width: 90, fontSize: 12, color: "var(--text-muted)" }} onClick={() => setSelectedOccId(o.id)}>{o.city || "—"}</div>
                          <div style={{ width: 70, fontSize: 12, fontWeight: 600, color: RISK_COLOR[o.risk] }} onClick={() => setSelectedOccId(o.id)}>{o.risk}</div>
                          <div style={{ width: 80, fontSize: 12, color: "var(--text-muted)" }} onClick={() => setSelectedOccId(o.id)}>{o.gccClassification || "—"}</div>
                          <div style={{ width: 100, fontSize: 12, color: "var(--text-muted)" }} onClick={() => setSelectedOccId(o.id)}>{last ? last.date : "None"}</div>
                          <div style={{ width: 80 }} onClick={() => setSelectedOccId(o.id)}>{o.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar name={o.createdBy} size={18} /><span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 50 }}>{o.createdBy.split(" ")[0]}</span></div>}</div>
                          <div style={{ width: 20, color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }} onClick={() => setSelectedOccId(o.id)}>›</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Occupier detail */}
            {tab === "occupiers" && selectedOccId && selectedOcc && (
              <OccupierDetail occ={selectedOcc} meets={meets} contacts={contacts} actionItems={actionItems} currentUser={currentUser}
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

            {/* Meetings tab */}
            {tab === "meetings" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ ...S.sectionTitle, margin: 0 }}>All Meetings ({filteredMeets.length}{filteredMeets.length !== meets.length ? ` of ${meets.length}` : ""})</div>
                  {canWrite(currentUser, "meetings") && <Btn style={S.btnPrimary} onClick={() => { setEditMeet(null); setShowMeetForm(true); }}><Ic n="plus" size={14} /> Log Meeting</Btn>}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <Input style={{ flex: 1, minWidth: 160 }} placeholder="Search occupier or notes..." value={filterMeetSearch} onChange={e => setFilterMeetSearch(e.target.value)} />
                  <Select style={{ width: "auto" }} value={filterMeetOcc} onChange={e => setFilterMeetOcc(e.target.value)}><option value="">All occupiers</option>{occs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
                  <Select style={{ width: "auto" }} value={filterMeetOutcome} onChange={e => setFilterMeetOutcome(e.target.value)}><option value="">All outcomes</option>{OUTCOMES.map(o => <option key={o}>{o}</option>)}</Select>
                  <Select style={{ width: "auto" }} value={filterMeetDept} onChange={e => setFilterMeetDept(e.target.value)}><option value="">All departments</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</Select>
                  {(filterMeetSearch || filterMeetOcc || filterMeetOutcome || filterMeetDept) && <Btn style={S.btnSm} onClick={() => { setFilterMeetSearch(""); setFilterMeetOcc(""); setFilterMeetOutcome(""); setFilterMeetDept(""); }}><Ic n="x" size={12} /> Clear</Btn>}
                </div>
                {filteredMeets.length === 0
                  ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>{meets.length === 0 ? "No meetings logged yet." : "No meetings match your filter."}</div>
                  : filteredMeets.map(m => {
                    const occ = occs.find(o => o.id === m.occupierId);
                    const meetAIs = actionItems.filter(a => a.meetingId === m.id);
                    return (
                      <div key={m.id} style={S.meetingItem}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, cursor: "pointer", color: "var(--text-strong)" }} onClick={() => occ && gotoOcc(occ.id)}>{occ?.name || "Unknown"}</span>
                              {occ && <TierBadge tier={occ.tier} />}
                              <OutcomeBadge outcome={m.outcome || "Neutral"} />
                              {m.department && <Badge label={m.department} bg="rgba(15,158,213,0.1)" color="#0F9ED5" />}
                            </div>
                            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
                              <span>{m.date}</span><span>{m.type}</span>
                              {m.attendees && <span>{m.attendees}</span>}
                              {m.followUpDate && <span style={{ color: "#E97132" }}>Follow-up: {m.followUpDate}</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <CopySynopsisBtn meeting={m} occName={occ?.name || "Unknown"} actionItems={meetAIs} />
                            {canWrite(currentUser, "meetings") && <Btn style={S.btnSm} onClick={() => { setEditMeet(m); setShowMeetForm(true); }}><Ic n="edit" size={13} /> Edit</Btn>}
                            {canWrite(currentUser, "meetings") && <Btn style={{ ...S.btnDanger, ...S.btnSm }} onClick={() => { if (window.confirm("Delete meeting?")) handleDeleteMeet(m.id); }}><Ic n="trash" size={13} /></Btn>}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, background: "var(--input-bg)", padding: 12, borderRadius: 8, borderLeft: "3px solid #156082", whiteSpace: "pre-wrap" }}>{m.notes}</div>
                        {meetAIs.length > 0 && (
                          <div style={{ background: "rgba(233,113,50,0.06)", padding: 12, borderRadius: 8, borderLeft: "3px solid #E97132", marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#E97132", marginBottom: 8, textTransform: "uppercase" }}>Action Items</div>
                            {meetAIs.map(ai => (
                              <div key={ai.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
                                {canWrite(currentUser, "tasks")
                                  ? <button onClick={() => handleUpdateActionItem(ai.id, nx[ai.status])} style={{ background: ACTION_STATUS_BG[ai.status]||"#f3f4f6", color: ACTION_STATUS_COLOR[ai.status]||"#374151", border: "none", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{ai.status} →</button>
                                  : <ActionStatusBadge status={ai.status} />}
                                <span style={{ flex: 1 }}>{ai.description}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{ai.owner||"—"} · {ai.dueDate||"—"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {m.createdBy && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}><Avatar name={m.createdBy} size={16} />Logged by {m.createdBy}{m.createdAt ? ` · ${fmtDateTime(m.createdAt)}` : ""}</div>}
                      </div>
                    );
                  })}
              </div>
            )}

            {tab === "tasks" && <TasksTab actionItems={actionItems} meets={meets} occs={occs} currentUser={currentUser} onUpdateStatus={handleUpdateActionItem} />}
            {tab === "calendar" && <CalendarTab events={events} meets={meets} occs={occs} currentUser={currentUser} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} />}
            {tab === "analytics" && <AnalyticsTab occs={occs} meets={meets} />}
            {tab === "rbac" && canSeeModule(currentUser, "rbac") && <RolesTab roles={roles} currentUser={currentUser} onAddRole={handleAddRole} onDeleteRole={handleDeleteRole} />}
            {tab === "users" && canSeeModule(currentUser, "users") && <UsersTab users={users} roles={roles} audit={audit} currentUser={currentUser} onAddUser={handleAddUser} onResetOTP={handleResetOTP} onToggleActive={handleToggleActive} onToggleAdmin={handleToggleAdmin} />}
            {tab === "admin" && currentUser.isAdmin && <AdminPanel audit={audit} />}
          </div>
        </div>
      </div>

      {/* Occupier form modal */}
      {showOccForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) { setShowOccForm(false); setEditOcc(null); } }}>
          <div style={{ ...S.modal, maxWidth: 720 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--text-strong)" }}>{editOcc ? "Edit Occupier" : "Add Occupier"}</h2>
            <OccupierForm occ={editOcc} currentUser={currentUser} onSave={handleSaveOcc} onCancel={() => { setShowOccForm(false); setEditOcc(null); }} />
          </div>
        </div>
      )}

      {/* Meeting form modal */}
      {showMeetForm && (
        <div style={S.modalOverlay} onClick={e => { if (e.target === e.currentTarget) { setShowMeetForm(false); setPreOccId(null); setEditMeet(null); } }}>
          <div style={{ ...S.modal, maxWidth: 720 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--text-strong)" }}>{editMeet ? "Edit Meeting" : "Log Meeting"}</h2>
            <MeetingForm occs={occs} preOccId={preOccId} currentUser={currentUser} onSave={handleSaveMeet} onCancel={() => { setShowMeetForm(false); setPreOccId(null); setEditMeet(null); }} editMeet={editMeet} />
          </div>
        </div>
      )}

      {/* Bulk upload modal */}
      {showBulkUpload && <BulkUploadModal currentUser={currentUser} onUpload={handleBulkUploaded} onCancel={() => setShowBulkUpload(false)} />}
    </div>
  );
}
