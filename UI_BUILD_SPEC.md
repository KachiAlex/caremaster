# CareMaster — Full UI/UX Build Specification

Use this document to generate the complete user interface for the CareMaster platform. It covers the brand, design system, every portal, every page, and every major user flow. Build it as a React + Tailwind CSS app (lucide-react icons, react-router v6). Where a flow needs real data later, build it with clean mock data that mirrors the shapes described.

---

## 1. Product Overview

**CareMaster** is a multi-tenant healthcare & eldercare platform for the Nigerian market (prices in ₦). It connects four audiences in one live system:

1. **Clients** — elderly patients and their families receiving care
2. **Caregivers** — nurses/aides who visit clients at home (independent, institution-employed, or partner-agency)
3. **Institutions** — hospitals, care agencies, and clinics that employ caregivers and run operations
4. **Super Admin** — the platform owner who licenses institutions

Core capabilities: home-visit scheduling with GPS clock-in/out (EVV), care-task tracking, vital-signs logging, medication management, secure messaging with voice/video calls, telemedicine video consultations, emergency alerts, billing/subscriptions, payroll/wage management, pharmacy dispensing, lab sample collection, referrals, analytics, and AI-assisted features (care-plan generation, health monitoring, medication checking, voice notes).

**Brand voice:** warm, trustworthy, calm, "care that actually happens" — not a cold medical tool. The marketing line: *"Care doesn't happen on a dashboard. It happens at 8:58 AM, at someone's front door."*

---

## 2. Design System

### 2.1 Color Palette (two coordinated themes)

**CareMaster brand theme (primary — use for landing, sidebars, and all "cm-" styled portals):**

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#12302C` | Dark green — sidebar background, hero bg, headings |
| `ink-soft` | `#1D423C` | Dark green variant — sidebar hover states |
| `ink-deep` | `#0E2622` | Darkest green — depth |
| `ink-line` | `rgba(245,239,224,0.14)` | Hairline borders on dark surfaces |
| `sand` | `#F2EAD8` | Primary light text on dark surfaces |
| `sand-deep` | `#E7D9B8` | Sand variant, cards on dark |
| `cream` | `#FBF7EF` | App background, light surfaces |
| `text` | `#1C2624` | Body text on light |
| `text-soft` | `#55645F` | Secondary text |
| `gold` | `#D9A441` | Primary CTA, eyebrow labels, accents |
| `gold-deep` | `#B9832E` | CTA hover, admin accents |
| `coral` | `#DD6E4F` | Caregiver accents, warnings, alerts |
| `coral-soft` | `#F4DFD4` | Coral tint backgrounds |
| `sage` | `#6B9080` | Family/success accents, doctor role badges |
| `sage-soft` | `#DDE7DF` | Sage tint backgrounds, "on site" status |

**Functional palette (Tailwind defaults used inside dashboards):**
- `primary` blues: `#3b82f6` family for links/buttons in some panels
- Status: green `#22c55e` success, amber `#f59e0b` warning, red `#ef4444` danger, slate grays for neutral
- Per-tab icon colors in admin sidebar (each nav item has a distinct pastel icon color, e.g. `#60A5FA`, `#34D399`, `#F472B6`, `#FBBF24`, `#A78BFA`)

### 2.2 Typography

- **Display font:** `Space Grotesk` — headlines, numbers, logo, sidebar titles (`cm-display`)
- **Body font:** `Inter` — all UI text (`cm-sans` / default)
- **Mono font:** `IBM Plex Mono` — timestamps, eyebrow labels, IDs, stat labels (`cm-mono`), uppercase with `tracking-[0.12em]`

Scale: hero `clamp(34px, 5vw, 58px)`; section `h2` ~`text-2xl`; card titles `text-lg font-semibold`; body `text-sm/base`; micro labels `text-xs uppercase`.

### 2.3 Signature visual elements

- **Eyebrow label:** mono uppercase gold text preceded by a small sage dot with a soft glow ring (`::before` 7px circle, box-shadow ring)
- **Buttons:**
  - `.btn-gold` — gold fill, ink text, soft gold shadow, hover lifts `translateY(-2px)` and darkens to gold-deep
  - `.btn-ghost-dark` — transparent, sand text, thin sand border (on dark)
  - `.btn-ghost-light` — transparent, ink text, thin ink border (on light)
- **Radius:** `14px` cards; `rounded-lg`/`rounded-xl` in dashboards; full-round icon buttons and avatar circles
- **Shadow:** soft `0 20px 50px -20px rgba(18,48,44,0.25)` on cards; subtle `0 2px 8px rgba(0,0,0,.1)` on mobile
- **"cm-" design language:** `cm-sidebar-header`, `cm-nav-item`, `cm-nav-active` (gold-tinted active state on dark sidebar), `cm-section-head`, `cm-display`, `cm-mono`
- **Timeline motif:** horizontal live-event timeline (time · color-dot · tag · description) used on the landing hero and echoed in activity feeds
- **Status pills:** small rounded-full badges with tinted bg + colored text (e.g. sage-soft bg + deep green text = "On site", coral-soft + coral = "Urgent", gold tint + gold-deep = "Pending")
- **Icons:** `lucide-react` exclusively; ~`h-5 w-5` in nav, `h-8 w-8` in feature cards

### 2.4 Layout shells

**Admin/portal shell (`DashboardLayout`)** — used by Institution Admin, Super Admin, Client Portal:
- **Dark ink sidebar** (fixed 260–264px desktop, slide-over drawer on mobile with scrim + body-scroll lock):
  - Header: `CM` logo chip + mono gold portal label (e.g. "ADMIN") + sand institution name (Space Grotesk)
  - Nav: `cm-nav-item` buttons — icon (per-item pastel `iconColor` when inactive, gold when active) + label; active item gets gold-tinted `cm-nav-active` background
  - Footer: optional slot + coral-tinted Logout item
- **Top bar:** sticky white, hamburger (mobile), back button + breadcrumbs, page title, actions slot (notification bell, emergency button), profile avatar dropdown (name, email, photo, profile link, sign out)
- **Content:** cream `#FBF7EF` background, `max-w-*` padded container
- Back navigation supported via keyboard Backspace (when not in input) and a UI back button; breadcrumbs show tab trail

**Caregiver shell (`CaregiverLayout`)** — lighter variant:
- White sidebar, green accents (`bg-green-100` logo chip, `text-green-600`), "Care Master Caregiver" wordmark
- Nav items: active = `bg-green-100 text-green-900`, icon `text-green-500`
- Top bar: "Caregiver Portal" label, notification bell, avatar
- Sign-out at sidebar footer

**Mobile rules:** 44px minimum touch targets; bottom-sheet style modals slide up on mobile; `100dvh` heights; safe-area padding utilities; `xs:475px` breakpoint; sidebar drawers; cards stack; tables scroll horizontally or collapse to cards.

### 2.5 Common components

- **Stat cards:** white/cream card, icon chip (tinted bg + colored icon), large Space Grotesk number, mono label, optional delta/trend line
- **Notification bell:** top-bar icon with unread badge; dropdown lists notifications (type icon, title, body, relative time, priority color for `high`/`urgent`); click navigates via deep link
- **Modals:** centered card (desktop) / bottom sheet (mobile), dark scrim, `rounded-2xl`, header with title + X, footer action buttons; body-scroll locked while open
- **Empty states:** centered icon (gray-400), `text-lg` title, helper text, CTA button
- **Tables/lists:** row = card-on-mobile / table-row-on-desktop; avatar circle (photo or colored initial), name + sub-line, status pill, action buttons/icons on the right
- **Forms:** labeled inputs `rounded-lg border-gray-300 focus:ring-2 focus:ring-*`, selects with native arrow, date/time pickers, textarea; validation via react-hook-form style inline errors; submit = full-width or right-aligned colored button
- **Toasts:** react-toastify, top-right, success/error/info
- **Tabs:** in-page tab bars (underline or pill style) and sub-tabs (e.g. Clients → Active / Archived / Care Requests)
- **Call UI:** full-screen dark overlay — see §7.6
- **Emergency button:** persistent red pulsing button (mobile bottom-right FAB) opening the emergency flow

---

## 3. Roles & Portals

| Role | Portal | Entry route | Accent |
|---|---|---|---|
| Super Admin | Platform owner console | `/super-admin/*` (hidden entry: type "superadmin" or 5 clicks on landing logo) | ink/gold |
| Institution Admin | Agency/hospital admin | `/institution-admin/dashboard` | ink sidebar, per-tab icon colors |
| Institution Caregiver (doctor/nurse) | Clinical staff dashboard | `/institution-caregiver/dashboard` | ink sidebar, clinical tabs |
| Institution Pharmacist | Pharmacy desk | `/institution-pharmacy/dashboard` | — |
| Institution Lab Technician | Lab visits | `/institution-lab-technician/dashboard` | dark slate theme |
| Partner Admin / Partner Caregiver | Partner agency portals | `/partner-*` mirrors institution | same patterns |
| Service Provider | Field provider | `/service-provider/*` | caregiver-style |
| Client / Patient / Elderly (+ family) | Client portal | `/dashboard` … `/client/*` | ink sidebar, "Client Portal" |
| Independent Caregiver | Caregiver portal | `/caregiver/*` | white sidebar, green |

Auth: `UnifiedLogin` at `/`, `/auth`, `/login` (single sign-in for client/caregiver/institution users; role detected server-side and routed), `/signup`, `/reset-password`, `/institution/login`, `/partner/login`-style partner entry via `/institution`, `/choose-institution`, `/choose-partner`, plus license gate `/license-required`. Onboarding routes: `/onboard`, `/caregiver/onboarding`, `/institution-caregiver/onboarding`, `/institution-caregiver/pending-approval`, `/partner-caregiver/onboarding`, `/partner-caregiver/pending-approval`.

Post-login routing is role-based: client→`/dashboard`; caregiver→`/caregiver` or onboarding if incomplete; institution staff→their dashboard; admin→`/institution-admin/dashboard`; super-admin→`/super-admin/dashboard`.

---

## 4. Public/Marketing Pages

### 4.1 Landing `/` (when logged out, plus dedicated `/services`, `/pricing`, `/institution` partners)

Editorial, premium feel — cream sections alternating with dark ink sections, scroll-reveal animations.

1. **Top nav:** logo mark (caremaster-logo.jpg) + "Care Master" wordmark; links: Features, Reviews, Pricing; CTAs: "Partner Login" (ghost-light), "Schedule a Demo" (gold); mobile hamburger menu
2. **Hero (dark ink):** eyebrow "MULTI-TENANT CARE PLATFORM"; H1 "Care doesn't happen on a dashboard. It happens at *8:58 AM*, at someone's front door." (8:58 AM in gold); lead paragraph; CTAs gold + ghost-dark; proof line "★★★★★ 4.9/5 from 500+ agencies"
3. **Live timeline visual** ("WILSON RESIDENCE · TUE 09:00" mono header): 5 events with colored dots — coral `Caregiver` "Maria clocks in… GPS verified", gold `Admin` "visit appears live", coral `Caregiver` "care notes logged by voice", sage `Family` "James gets a visit update", gold `Admin` "auto-logged for payroll"
4. **Trust strip:** "Trusted by care agencies across three continents" + 4 logo names
5. **Stats ledger:** 500+ agencies · 10,000+ caregivers · 50,000+ clients · 99.8% uptime
6. **Portals section** — tabbed "Three ways in. One source of truth.":
   - *Caregiver tab:* GPS clock in/out (EVV), route-optimized schedule, voice-to-text notes, offline sync — visual cards: "Wilson Residence — On site", "Next: Boyd Residence 9 min", "Care note saved"
   - *Admin tab:* live visit map, automated payroll & billing, EVV compliance reports, missed-visit alerts — cards: "14 caregivers active", "Payroll ready — On track", "0 missed visits"
   - *Family tab:* real-time visit notifications, care plan & photo updates, secure messaging, invoices — cards: "Maria arrived — Just now", "Today's care note", "March invoice ₦… ready"
7. **Testimonials:** 3 quote cards (avatar initials on colored circles)
8. **CTA section:** "Ready to run a calmer care agency?" + Schedule Demo
9. **Modals:** "Schedule a Demo" and "Talk to Sales" — form (name, email, phone, organization, message) + GDPR consent checkbox; success state
10. **Cookie consent banner** (GDPR) bottom-fixed, Accept/Decline
11. Footer

### 4.2 Services page
Header "Comprehensive Healthcare Services" — 6 icon cards: Home Visits (blue), Vitals Monitoring (green), Emergency Support (red), Telemedicine (purple), Family Integration (orange), Medication Management (blue).

### 4.3 Pricing page
"Affordable Care Plans — flexible subscription options designed for Nigerian families." Three tier cards (₦/month):
- **Basic ₦15,000/mo** — 2 home visits/mo, basic health monitoring, emergency support
- **Premium ₦25,000/mo** (popular, blue border + badge) — 4 visits/mo, video consultations, family notifications
- **Family ₦40,000/mo** — unlimited visits, 24/7 emergency, specialist consultations
Check-iconed feature lists, CTA button per card.

### 4.4 Institution pages
- `/institution` (TenantPartners): directory of partner institutions — searchable card grid (logo, name, type, location) → links to each institution's landing/login
- `InstitutionLanding` (`/institution?institution=<id>`): institution-branded landing — hero with org name, services offered, "Login" CTA scoped to that tenant
- `ChooseInstitution` / `ChoosePartner`: post-signup pick-your-organization screens — search + list of institutions/partners, select to continue
- `PartnerLanding`/`PartnerLogin`: partner-agency equivalents

### 4.5 Auth pages
- **UnifiedLogin:** centered card on soft bg — CareMaster logo, "Welcome back", email + password fields, show/hide password, "Forgot password?", sign-in button, role-agnostic (server routes by role), links to signup and institution/partner login, session-conflict handling (single-session enforcement prompt)
- **Signup:** multi-field registration (name, email, phone, password, role choice client vs caregiver vs organization)
- **ResetPassword:** email → reset link → new password form
- **AdminLogin/SuperAdminLogin/InstitutionLogin/PartnerLogin:** role-scoped variants with matching brand
- **LicenseRequired:** blocked screen — "Your institution's license is inactive/expired — contact your administrator", support link

### 4.6 Onboarding pages
- **Client `/onboard`:** multi-step — personal details → care needs/medical history → emergency contacts → preferences → review & submit; progress bar, back/next, celebratory finish → dashboard
- **CaregiverOnboarding / InstitutionCaregiverOnboarding / PartnerCaregiverOnboarding:** steps — personal info → qualifications/licenses/certifications (uploads) → experience & specialties → availability & service areas → ID verification → review; submit → `PendingApproval` screen ("Your application is under review — typically 1–2 business days", status checks, contact support)
- **CaregiverDashboardSwitcher:** for users holding multiple roles — cards to pick which portal to open

---

## 5. Client Portal (`/dashboard` + `/client/*`)

Sidebar tabs (DashboardLayout, label "CLIENT", institution "Client Portal"): **My Dashboard, My Care Team, Care Appointments, Health Monitoring, Video Consultations, Medications, Medical Documents, Messages, Help & Support** (→ subscription page). Notification bell in top bar; emergency FAB available.

### 5.1 Dashboard `/dashboard`
- Welcome header "Welcome back, {name}" + date; optional profile-completion prompt
- Quick Actions row: Book Appointment, Request Video Consultation, Message Care Team, Emergency
- Upcoming Care Visits — cards: date/time block, caregiver name/avatar, visit type, status pill (Scheduled/In progress/Completed), address
- Care Tasks & Activities — recent logged items (vital recorded, medication given, note added) with time + caregiver
- Health snapshot strip: latest BP, heart rate, temperature, glucose with trend arrows
- Notifications/alerts inline (missed visit warning, new message count)

### 5.2 My Care Team `/client-caregivers`
- Grid/list of assigned caregivers: photo, name, role (Nurse/Doctor), specialty, rating stars, contact buttons (call, video, message), "next visit" line
- Institution contact card (agency name, phone, email)

### 5.3 Care Appointments `/appointments`
- Upcoming list + past/history section; status pills
- "Book Appointment" → modal/page: pick service type (Home Visit, Nursing Care, Check-up), preferred date, time slot grid, caregiver (optional), notes → confirm → success toast; appears in upcoming as Scheduled
- Reschedule/cancel actions on upcoming items

### 5.4 Health Monitoring `/vital-signs`
- "Record New Reading" panel: vital type select (Blood Pressure, Heart Rate, Temperature, Blood Sugar, Weight, SpO₂) + value inputs (systolic/diastolic pair for BP) + notes → save
- History list grouped by type with unit labels + who recorded (self vs caregiver)
- Health Trends (last 7 days): line/bar chart cards per vital (recharts)
- "Share with Your Care Team" panel — toggle/share recent readings
- Out-of-range highlight (amber/red border + warning icon)

### 5.5 Video Consultations `/telemedicine`
- Header + "Request Video Consultation" button
- **My Video Consultations:** cards per request — doctor name (or "Awaiting doctor assignment"), reason, urgency pill, status pills: `Requested` (amber, "Waiting for an admin to schedule a doctor"), `Scheduled` (blue, shows date/time + doctor), `In-progress`, `Completed`, `Cancelled`
- Scheduled cards → **Join Call** button at appointment time → opens full-screen ConsultationCall (§7.6)
- Request modal: reason for consultation (textarea), preferred date, preferred time, urgency select (Normal/Urgent), additional notes → submit → "Request submitted — an admin will schedule your consultation"
- **Recent Consultations:** completed call history — date, doctor, duration, call status, actions: Download Invoice & Prescription, View Notes/documents

### 5.6 Medications `/medications`
- "Add New Medication" form: name, dosage, frequency (daily/weekly/custom times), times-of-day chips, prescribing doctor, start/end date, instructions, photo upload optional
- Medication cards: name, dosage, schedule chips (e.g. 8:00 AM · 8:00 PM), status (Active/Paused/Completed), next-due countdown, mark-as-taken, refill reminder, edit/delete
- Adherence summary strip ("taken 6/7 days this week")
- "Need Help with Medications?" support card

### 5.7 Medical Documents `/medical-documents`
- Document manager: upload (PDF/images), list/grid with thumbnails, categories (Lab Results, Prescriptions, Reports, Scans, Other), preview modal, download/share, delete; file size/type badges; empty state "No documents yet"

### 5.8 Messages `/messages`
- Two-pane chat (list + thread), mobile = single-pane with back
- Conversation list: avatar, name, last message preview, unread count badge, time
- Thread: bubbles (mine right/primary tint, theirs left/gray), day separators, timestamps, read ticks
- Composer: text input, attachment (image/doc), send button; voice + video call icons in thread header launching CallInterface (§7.5)
- "New conversation" modal: searchable user list → create thread

### 5.9 Help & Support `/subscription`
- Current Subscription card: plan name, price ₦/mo, renewal date, status, usage this month (visits used/remaining), benefits list, upgrade/downgrade, cancel
- Available Plans grid (from Pricing tiers) with Choose buttons → payment flow
- Payment Methods: saved cards list, add-card modal (Paystack-style)
- Billing History table: date, description, amount ₦, status pill, invoice download
- Help articles/FAQ accordion + contact support (call/message)

### 5.10 Client Account `/client/account` (+ `/:clientId/account`)
- Profile header (photo, name, DOB/age, contact, address), edit profile modal
- Emergency contacts list (add/edit), medical info summary (conditions, allergies), linked family members, notification preferences toggles, security (change password, 2FA, biometric toggle on mobile)

### 5.11 Other client routes
- `/profile` — same profile editing
- `/security`, `/security-dashboard` — password, 2FA, sessions, login activity
- `/consultation` — doctor consult workspace (also used by providers)
- `/webrtc-test` — internal test page (exclude from nav)

---

## 6. Caregiver Portal (`/caregiver/*`)

White sidebar, green accents, nav: **Dashboard, Today's Schedule, Tasks, Messages, Navigation, Photo Updates, Performance, Emergency, Settings.** Notification bell top-right.

### 6.1 Dashboard `/caregiver`
- Greeting + today's date; status chips (On duty, N visits today)
- Today's visit cards: time, client name/photo, address, distance/drive time, status (Upcoming / En route / On site / Done)
- Clock-in state machine: **Clock In (GPS)** → **On site** state with elapsed timer → task checklist → **Clock Out**; GPS verification indicator
- Quick actions: Log vitals, Voice note, Take photo, Message office
- Alerts: upcoming visit countdown, unstarted visit warnings

### 6.2 Today's Schedule `/caregiver/schedule`
- Day timeline ordered by route optimization; each visit: time window, client, address, tasks preview, Navigate button (maps), Start Visit
- Week/month calendar toggle; past visits read-only

### 6.3 Tasks `/caregiver/tasks`
- Per-visit checklist (admin-assigned care tasks): checkbox rows (e.g. "Administer meds", "Check BP", "Wound dressing"), required-photo flags, notes per task, completion auto-timestamps; progress bar per visit

### 6.4 Messages `/caregiver/messages`
Same chat UI as §5.8 (`EnhancedMessagingInterface`) plus office/admin contacts.

### 6.5 Navigation `/caregiver/navigation`
- Route-optimized day plan: ordered stops with leg times, map placeholder panel, per-leg Navigate/Start-driving, total drive-time summary

### 6.6 Photo Updates `/caregiver/photos`
- Per-client photo log: upload during visit (wound progress, meals, activities), thumbnails grid, captions, timestamp, visible-to-family flag
- (Same component backs `/service-provider/care-logs` and `/photos`)

### 6.7 Performance `/caregiver/performance`
- Personal stats: visits completed (week/month), on-time %, avg visit duration, client ratings stars, tasks completed; recharts trends; supervisor feedback notes

### 6.8 Emergency `/caregiver/emergency`
- Big red SOS trigger — confirm modal → sends emergency alert (type select: Medical/Fall/Other + notes + auto GPS)
- Active emergency card with live status; emergency contact list; incident history

### 6.9 Settings `/caregiver/settings`
- Profile, qualifications re-upload, availability/service areas, notification prefs, device settings (camera/mic test), security, sign out

---

## 7. Institution Admin (`/institution-admin/dashboard`)

Dark-ink `DashboardLayout`. Tabs (each with a distinct pastel icon color):

**Dashboard · Clients · Caregivers · Pharmacists · Scheduling · Wage Management · Billing Plans · User Management · Admin Roles · Messages · Referrals · Enhanced Inventory · Analytics · Security · Settings · Help & Support**

Sub-tabs: Clients → **Active / Archived / Care Requests** (deep link `?tab=clients&subTab=care-requests`).

### 7.1 Dashboard tab
- KPI stat cards: Active Clients, Caregivers On Duty, Today's Visits, Pending Care Requests, Open Emergencies, Revenue MTD (₦)
- Live visit feed (timeline of clock-ins/outs), missed-visit alerts list, pending-request queue preview, quick actions (Schedule Visit, Assign Caregiver, Message Team, Broadcast)

### 7.2 Clients tab (Active / Archived / Care Requests)
- **Active:** client table/cards — photo, name, age/DOB, conditions tags, assigned caregiver, plan tier, last visit, status pill; row → ClientDetailsModal (profile, care plan, visits, docs, vitals, meds, contacts); Add Client (CreatePatientModal); Bulk Import (CSV modal); archive action
- **Archived:** same list, restore action
- **Care Requests (`ClientCareRequests`):** pending client-initiated requests — both care-visit requests and **video consultation requests**: requester, reason, urgency pill, preferred date/time, requested at; action = **Schedule** modal: pick doctor/caregiver from available staff (availability hints), appointment date, time slot, duration, type (video/visit) → assign → status becomes Scheduled, client + staff notified

### 7.3 Caregivers tab
- Staff directory: photo, name, role badge (Doctor sage / Nurse coral / Pharmacist gold / Admin coral), specialty, assigned-client count, today's visit count, availability status; Add Caregiver (AddCaregiverModal — creates account + onboarding invite); CaregiverDetailsModal (schedule, clients, performance, wage); approve/suspend actions; pending-approval queue for new caregiver applications

### 7.4 Pharmacists tab — pharmacist staff list/management (same pattern)

### 7.5 Scheduling tab
- Calendar (month/week/day) of all visits; filters by caregiver/client/status; drag/assign; `AssignmentCalendar` — create visit: client + caregiver + date + time + tasks + recurrence; conflict warnings; unassigned-visit lane

### 7.6 Wage Management
- `CaregiverWageManagement`: staff wage table (rate type hourly/visit/monthly, rate ₦), CaregiverWageEditModal, period payroll summary (hours from clock-ins × rate), mark-paid, export

### 7.7 Billing Plans
- `BillingPlanConfiguration`: plan builder (name, ₦ price, visits/mo, features checklist), assign plan to client, `BillingManagementDashboard` — invoices table (client, amount, due, status Paid/Overdue/Pending), create invoice, record payment, aging summary

### 7.8 User Management & Admin Roles
- `UserManagement`-style staff+client accounts table with role, status, last-login; invite user, reset password, deactivate; `AdminRoleAssignment` — grant admin/clinical roles with permission scope; `CleanupOrphanedUsers` maintenance tool

### 7.9 Messages — same chat UI with staff/client/group threads + call buttons

### 7.10 Referrals — inbound/outbound referral tracker: patient, from/to facility, reason, clinical notes, priority, status (Sent/Received/Responded), specialist response, attachments

### 7.11 Enhanced Inventory — `EnhancedInventoryManagement`: pharmacy/equipment stock table (item, category, qty, unit, reorder level, expiry), low-stock alerts, add/adjust stock, dispense log

### 7.12 Analytics — `AdvancedAnalyticsDashboard`/`AdvancedReporting`: date-range KPIs — visits completed, hours, revenue, missed-visit rate, caregiver leaderboard, client growth; recharts (line/bar/pie); export PDF/Excel (xlsx, jspdf)

### 7.13 Security — security posture panel: login activity feed, active sessions (revoke), 2FA enforcement, IP/device audit, data-access audit

### 7.14 Settings (`/institution-admin/settings` too)
- Institution profile (name, logo, contacts, address, license info + expiry), branding, departments, service areas, notification defaults, billing settings, integrations, admin preferences

### 7.15 Help & Support — docs links, contact platform support

*(Partner Admin dashboard mirrors this with partner branding; `/partner-admin/*`, plus `PartnerUserManagement`, `PartnerSettings`.)*

---

## 8. Institution Caregiver (`/institution-caregiver/dashboard`)

Same ink DashboardLayout. Tabs: **Dashboard · Schedule · Messages · Care Activity · Tasks · Clients · Prescriptions · Consultations · Diagnostics · Settings · Help & Support**

- Dashboard: greeting, today's assigned visits/clients, open tasks, alerts
- Schedule: assigned visit calendar + navigate
- Clients: assigned-client list → per-client workspace (vitals, meds, notes, care plan, `AdlLogger` — Activities-of-Daily-Living checklist: bathing, feeding, mobility, toileting, continence…)
- Care Activity: logged activities feed w/ voice-note support (`react-speech-kit`)
- Tasks: admin-assigned checklist completion
- Prescriptions: `EnhancedEPrescription` — create prescription for client (drug search, dose, frequency, duration, instructions, interaction warnings via `AIMedicationChecker`), send to pharmacy, history per client
- Consultations: `ConsultationsTabContent` + `ConsultationModal` — consultation notes (subjective/objective/assessment/plan), telemedicine join for scheduled video consults (same ConsultationCall)
- Diagnostics: `DiagnosticsTab` — order lab tests, review results
- Messages/Settings/Help as standard

**Pharmacist (`/institution-pharmacy/dashboard`):** prescription queue (new/in-progress/dispensed), dispense modal (verify items, mark dispensed + counselling notes), inventory cross-link, patient lookup.
**Lab Technician (`/institution-lab-technician/dashboard`, dark slate theme):** tabs **Scheduled Home Visits / Sample Collections / Visit History** — visit cards (patient, address, tests ordered, time), Collect Sample modal (sample type, collected-at, notes), status transitions Scheduled → Collected → Delivered.

*(Partner variants: `PartnerCaregiverDashboard`, `PartnerPharmacyDashboard`, `PartnerLabTechnicianDashboard` mirror these.)*

---

## 9. Service Provider (`/service-provider/*`)

Caregiver-style portal: **Dashboard · Schedule · Routes (RouteOptimization) · Messages · Tasks · Care Logs · Photos · Activities · Medical Records · Prescriptions · Consultations · Telemedicine · Diagnostics · Emergency · Settings** — hybrid of caregiver field-work + clinical access for licensed providers (doctors doing house calls).

- `RouteOptimization`: daily route planner — stops ordered by optimization (nearest-neighbor), leg distances/times, map panel, reorder, export route

---

## 10. Super Admin (`/super-admin/*`)

Ink sidebar, gold accents. Tabs/routes: **Dashboard · Tenants (in-dash) · Licensing · User Management · Management · Audit Logs · Settings** — lazy-loaded tab content inside `SuperAdminDashboard`.

- **Dashboard:** platform KPIs — total institutions (active/trial/suspended), total users by role, MRR ₦, signups trend, recent activity feed; Quick Actions (Add Tenant, Review Licenses, Manage Users, Audit Logs, Settings)
- **Tenants:** institution table — name, plan, seats used/limit, license status pill (Active/Trial/Expired/Suspended), created date; actions: view detail, onboard new institution (Onboarding wizard: org details → admin account → plan/seats → license key generation), suspend/activate
- **Licensing (`SuperAdminLicensing`):** license list per institution — key, plan tier, seats, starts/expires, status; generate/renew/revoke; expiry countdown badges
- **User Management (`SuperAdminUserManagement`):** all-users table across tenants — search/filter by role + institution, impersonate-safe view, deactivate, password reset
- **Management (`SuperAdminManagement`):** create/edit super-admin accounts + platform staff roles
- **Audit Logs (`SuperAdminAuditLogs`):** filterable event log — actor, action, entity, tenant, timestamp, IP; export
- **Settings (`SuperAdminSettings`):** platform settings — default plans/pricing, email templates, security policy, feature flags

---

## 11. Shared Feature Modules

### 11.1 Notification system
Bell in every top bar with unread count → dropdown: icon by type (video = consultation, calendar = appointment, alert = emergency, message, pill = medication), title, body, relative time, priority tint (high = coral border). Click → deep link (e.g. care-request notification → `?tab=clients&subTab=care-requests`). Mark-read on click, "Mark all read".

### 11.2 Chat (`Messages`/`EnhancedMessagingInterface`)
As §5.8 — plus group conversations (multi-participant names), attachment previews, online/last-seen where available.

### 11.3 Voice/video calls (`CallInterface`)
- In-thread call buttons → ringing screen (callee name/avatar, Call/Reject)
- Active call UI: full-screen overlay — remote video large, local PiP bottom-right, controls row (mute mic, toggle camera, speaker, switch camera, share screen, end=red round button), call timer, participant name header, minimize to floating window
- States: connecting → ringing → connected (timer) → ended; poor-network indicator

### 11.4 Video consultations (`ConsultationCall`)
- Entry from Telemedicine page (scheduled consults) for client and doctor — deterministic room per appointment
- Phases: *Connecting* → *Waiting for {Doctor/Client} to join…* (spinner, ~2 min timeout, "Cancel Waiting" button) → *Connected* → *Ended*
- Connected view: remote video full-bleed, local PiP mirrored, header (peer name, duration `MM:SS`, **network-quality dot** green/yellow/red + RTT ms), controls (Mic, Video, End Call)
- On end: returns to Telemedicine with completed state

### 11.5 Emergency (`EmergencyAlertSystem`, `EmergencyButton`)
- FAB (red, pulsing) on client/caregiver screens → confirm sheet: emergency type (Medical, Fall, Safety, Other), notes, auto-GPS attach → send
- Alert card persists with live status (Sent → Acknowledged → Responders dispatched); admin/caregiver dashboards receive the alert with client + location + call-back actions; incident log with resolution notes

### 11.6 AI features
- `AICarePlanGenerator` — generate care plan from client profile (conditions, meds, ADLs) → editable structured plan (goals, tasks, schedule) → save
- `AICaregiverMatcher` — match client ↔ caregivers by skills/location/availability, ranked list with fit score
- `AIHealthMonitor` — vitals anomaly insights card (flags out-of-range trends, suggestions)
- `AIMedicationChecker` — interaction warnings inside prescription form
- `AIVoiceAssistant` — voice note capture → transcribed care notes

### 11.7 Documents & media
`DocumentManager` (upload/preview/categorize/download), `CaregiverPhotos`/photo log, profile photo upload with crop circle preview; `jsPdf`/`html2canvas`/`canvg` for PDF exports; `xlsx` for spreadsheet export; `qrcode.react`/`react-qr-code` for QR (institution links, IDs)

### 11.8 Reporting/analytics components
`AdvancedSearch`, `AdvancedReporting`, `AttendanceTracking`, `AssignmentCalendar`, `ComplianceManagement`, `DischargeManagement`, `EnhancedTriageManagement`, `EnhancedLISManagement`, `ClinicalTextBlock`, `ClientActivityTimeline`, `ClientActivityLog`, `ConsultationsLogModal`, `CallLogsPanel`, `BulkImportModal` — consistent card+table+modal patterns; reuse them as: search bar + filter chips, table with sortable headers, detail drawer/modal, export buttons.

### 11.9 SystemStatus page (`/system-status`)
Public-ish status board: service rows (API, Database, Messaging, Video) with green/amber/red dots + uptime %, incident history.

---

## 12. Core User Flows (build these end-to-end)

1. **Client video consult:** Client → Telemedicine → "Request Video Consultation" (reason, urgency, preferred time) → card shows `Requested` → admin sees it under Clients → Care Requests (notification bell alerts admins) → admin picks doctor + slot → client card becomes `Scheduled` → at time, both click **Join Call** → ConsultationCall phases → ends → shows in Recent Consultations (invoice/prescription download)

2. **Care visit lifecycle:** Admin schedules visit (Scheduling or Care Requests) → caregiver sees it in Today's Schedule → Navigate → **GPS Clock In** → task checklist + vitals + photos + voice notes → **Clock Out** → auto-logs to billing/payroll → family client portal shows the update; missed check-in → admin missed-visit alert

3. **Client request → assignment:** Client Books Appointment / request → appears as Care Request → admin assigns caregiver/doctor → notifications both ways → visit/consult proceeds

4. **Messaging & calls:** Any portal → Messages → pick contact → chat; call icons → ringing → WebRTC call UI → end → optional call log

5. **Emergency:** Client/caregiver → SOS FAB → confirm type + GPS → admin + assigned staff alerted with location → acknowledge/respond → resolve → incident logged

6. **Medication & vitals:** Client/caregiver records vitals or marks meds → history + 7-day trend charts → out-of-range flags → caregiver/admin sees in client record

7. **Onboarding:** Signup → role onboarding (client intake / caregiver credentials) → caregiver → PendingApproval → admin approves in Caregivers tab → active

8. **Subscription & billing:** Client → Help & Support → pick plan → payment method → active subscription (usage metered: visits/mo) → invoices in Billing History; admin side sees billing dashboard + wage management

9. **Referral:** Admin/doctor → Referrals → new referral (to facility, reason, notes, attachments) → status Sent → Received → Responded w/ specialist response

10. **Pharmacy:** Doctor prescribes (e-prescription) → pharmacist queue → verify & dispense → counselling note → client notified; inventory decremented w/ low-stock alerts

11. **Lab:** Ordered test → lab-tech Scheduled Visits → Collect Sample (home visit) → status Collected/Delivered → results back into Diagnostics tab

12. **Super admin licensing:** Super admin onboards institution → generates license (plan, seats, dates) → institution users can sign in; expiry → LicenseRequired gate → renew restores access

---

## 13. Implementation Notes

- **Routing:** react-router v6, lazy-loaded pages, role guards (redirect to `/login` when unauthorized; onboarding-incomplete → onboarding route); `/admin/*` → redirects to `/institution-admin/dashboard`
- **State:** React Query for data, UserContext for session/profile, SSE/polling for live collections (notifications, messages, signaling)
- **Deep links:** `?tab=X&subTab=Y` query params must work (notifications rely on them)
- **Dates:** `date-fns` formatting — human times ("Today 9:00 AM"), timestamps in mono where branded
- **Currency:** `₦` Naira everywhere for money
- **Mobile:** every page works ≤768px — drawers, bottom sheets, stacked cards, FABs; it's a Capacitor hybrid app (iOS/Android) so avoid hover-dependent UX; biometric login hooks exist
- **Accessibility:** focus-visible gold outlines, aria labels on icon buttons, color + icon (never color alone) for status
- **Do NOT build:** `/webrtc-test`, backup/legacy pages (LandingOld), dead routes

**Priority order for a staged build:** (1) Design system + DashboardLayout + auth, (2) Client portal, (3) Caregiver portal, (4) Institution Admin, (5) Institution Caregiver/Pharmacy/Lab, (6) Super Admin, (7) calls/telemedicine/emergency overlays, (8) landing/pricing/services.
