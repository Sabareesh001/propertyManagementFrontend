# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commits

Do not add a "Co-Authored-By: Claude" trailer to git commit messages.

## Commands

```bash
npm start          # dev server at http://localhost:4200 (ng serve)
npm run build      # production build → dist/
npm run watch      # incremental dev build (watch mode)
npm test           # run unit tests with Vitest via ng test
ng generate component <name>   # scaffold component
ng generate service <name>     # scaffold service
```

## Architecture

**Stack:** Angular 21, standalone components, Angular Router, RxJS, Vitest for unit tests. PrimeNG is the UI component library.

**PrimeNG Reference:** https://primeng.dev is the authoritative source for all component APIs, props, templates, and configuration. Always consult it before using or configuring any PrimeNG component.

**UI Rule:** Always use PrimeNG components for all UI elements (buttons, inputs, tables, dialogs, dropdowns, etc.). Never use plain HTML elements or other UI libraries when a PrimeNG equivalent exists.

**Color Rule:** Never hardcode colors (no hex values, rgb(), hsl(), or named colors in CSS/styles). Always use PrimeNG CSS design tokens (e.g., `var(--p-primary-color)`, `var(--p-text-color)`, `var(--p-surface-100)`, `var(--p-red-500)`). This ensures theme consistency and dark mode support.

**Background Rule:** Never set a background color on page-level components. The root already provides the page background — adding one in a child component creates double-layering and breaks theme switching.

**Font Size Rule:** Use explicit font-size values for custom text elements (labels, hints, headings, error messages, descriptions). Use PrimeNG's typographic scale as a guide: e.g. `0.75rem` (xs/hint), `0.875rem` (sm/label), `1rem` (base/body), `1.125rem` (md), `1.25rem` (lg/subheading), `1.5rem` (xl/section title), `2rem` (2xl/page heading). PrimeNG components still manage their own internal typography — only apply font-size to your own custom elements.

**Button Size Rule:** Always use PrimeNG's `size` prop on `p-button` and other interactive components. Choose the size that fits the component's visual hierarchy — `size="small"` for compact/inline actions, no `size` (default/medium) for standard form actions, `size="large"` for primary CTAs and prominent actions. Never leave button size implicit when it affects layout or hierarchy.

**Splitter Rule:** Always use PrimeNG `p-splitter` (with `p-splitter-panel` children) for any split-pane or resizable divided layout. Never use raw CSS flexbox splits, grid columns, or custom drag-resize logic when a resizable panel divider is needed.

**PrimeNG-First Rule:** Before implementing any UI pattern (accordions, carousels, timelines, steppers, virtual scrollers, overlays, drag-and-drop, etc.), check the PrimeNG component library at https://primeng.dev first. If a PrimeNG component already covers the use case, use it — do not hand-roll a custom solution.

**Mobile Responsiveness Rule:** Every UI change must be mobile-responsive. After implementing any layout or component change, review it at mobile breakpoints (≤480px, ≤768px). Checklist:
- Use `flex-wrap: wrap` on flex rows so items stack on narrow screens.
- Prefer `grid-template-columns: repeat(auto-fill, minmax(..., 1fr))` over fixed column counts.
- Add `@media (max-width: 600px)` (and `768px` where needed) blocks to reduce padding, switch multi-column layouts to single-column, and ensure buttons/inputs are full-width or appropriately sized for touch.
- Never use fixed pixel widths for containers — use `max-width` with `width: 100%`.
- Touch targets must be at least 44px tall.
- Test that text never overflows its container on small screens (use `overflow-wrap: break-word` or `min-width: 0` on flex children where needed).

**Entry point:** `src/main.ts` → bootstraps `App` (in `src/app/app.ts`) using `appConfig` (`src/app/app.config.ts`).

**Current state:** Freshly scaffolded — `app.routes.ts` has an empty routes array. All feature modules and services are yet to be built.

**Backend API:** The backend runs separately at `http://localhost:5000`. `frontend-design-reference.md` is the authoritative API contract — read it before building any feature. Key points:
- Auth: JWT Bearer token or `jwt_token` HttpOnly cookie set on login (`POST /api/user/login`)
- Three roles: Tenant (1), Owner (2), Admin (3); a user can `POST /api/user/become-owner`
- Core domain flows: User registration/verification → Property listing → Lease proposal → Lease contract → Charges & Payments
- All error responses follow a standard `{ statusCode, message, errors? }` shape

**Planned feature areas** (derived from the API reference):
- Auth pages: register, login, email verification
- Owner dashboard: property CRUD, lease template management, charge creation
- Tenant dashboard: property browsing, proposal submission, lease signing, payment recording
- Admin dashboard: user verification, property verification, lease activation
- Stripe Connect onboarding flow (`GET /api/stripe/connect/onboard`)
