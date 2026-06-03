# Frontend Audit — ServeGo

Date: 2026-06-03

## Summary
This report is the result of a static audit of the frontend code in `frontend/src`. It lists routes, navigation items, link targets, UI-state coverage, responsive coverage, role-based flow checks, and recommended/high-priority fixes. This audit was produced from source inspection — runtime checks (manual QA in a browser) are recommended to validate behavior.

## Inventory (high level)
- Main router: `src/App.jsx` (public routes + customer/provider/admin role routes + scaffold routes).
- Role layouts: `src/layouts/{PublicLayout,CustomerLayout,ProviderLayout,AdminLayout}.jsx`.
- Navigation data: `src/data/navigation.js` (public, guest, customer, provider, admin menus and sidebars).
- Scaffold UI/UX components: `src/scaffold/common/*`, `src/scaffold/ux/*` include `Loader`, `EmptyState`, `ErrorState`, `Toasts`, `ConfirmationDialog`, `NotFound404`.
- Pages: many user-facing pages exist under `src/pages` and many platform pages under `src/pages/PlatformPages.jsx` (provider/customer/admin pages are exported here).

## Route vs Link Check
- Routes declared in `src/App.jsx` and the platform page exports cover the link targets found in the codebase. I did not find references to route paths that have absolutely no corresponding route component. Examples of commonly used links present in files:
  - `/`, `/services`, `/services/:id`, `/book-service`, `/become-partner`, `/about`, `/contact`, `/support`, `/faq`, `/privacy-policy`, `/terms`, `/blog`, `/create-account`, `/login`, `/forgot-password`, `/reset-password`, `/provider-login`, `/admin-login`, and the role-protected paths (e.g., `/dashboard`, `/my-bookings`, `/provider-dashboard`, `/available-jobs`, `/admin-dashboard`, etc.).
  - Anchored links such as `/become-partner#apply` are used (anchors exist in `BecomePartner.jsx`).

Status: No missing routes were detected in the static pass.

## Broken links and anchors (static scan)
- No obvious links pointing to files or routes that do not exist in the codebase were found.
- Anchor links such as `#apply` rely on an element id present in `BecomePartner.jsx` — verify at runtime because anchor scroll behavior may be affected by fixed navbar height.

## Navigation & Role Flow
- `src/data/navigation.js` provides consistent menu and sidebar items for public, customer, provider, admin roles and maps to routes exported from `PlatformPages.jsx` and pages under `src/pages`.
- Role protection is implemented via `src/routes/RequireAuth.jsx` and `src/contexts/AuthContext.jsx` — the `RequireAuth` component redirects unauthenticated users to `/login` and redirects users outside the allowed role to a role-specific dashboard.

Potential flow items to verify at runtime:
- Provider signup flow: `provider-signup` currently redirects to `/become-partner` (intended). If you expect a separate provider signup page, add it and update navigation.
- Local-only flows: provider applications (Become Partner) and mock data saved to `localStorage` rely on the developer/admin to inspect localStorage or scaffold admin pages.

## UI state coverage
- Common UI state components exist in `src/scaffold/common` (`Loader`, `EmptyState`, `ErrorState`, `NotFound404`) and scaffold routes expose examples under `/scaffold/*`.
- However many production pages (for example many exports in `PlatformPages.jsx`, `BecomePartner.jsx`, and several pages under `src/pages`) render static content without explicit `Loader`/`EmptyState` logic. This is fine for static mock content but will need adding where pages fetch async data:
  - Candidate pages to add states: `Dashboard.jsx`, `MyBookings.jsx`, `BookingHistory.jsx`, `Notifications.jsx`, `ProviderDashboard` pages, `AvailableJobs`, `AssignedJobs`, `CompletedJobs`, `Earnings`.

## Responsive coverage
- Several components and CSS files include media queries (`@media`) and responsive rules: `Navbar.css`, `Hero.css`, `PopularServices.css`, `PartnerCTA.css`, plus global responsive rules in `src/styles/index.css` and `src/index.css`.
- Many pages use inline styles for layout (e.g., `BecomePartner.jsx`, `PlatformPages.jsx` cards, some dashboard pages). Inline styles often do not include breakpoint-based adjustments and may need CSS classes + media queries to ensure consistent small-screen behavior.

Pages with sizeable inline layouts to validate on small screens:
- `src/pages/BecomePartner.jsx` (hero with two-column layout and forms)
- `src/pages/PlatformPages.jsx` (many grid/card layouts defined inline)
- `src/pages/Dashboard.jsx` (header + quick actions built inline)
- `src/pages/MyBookings.jsx` (already has a small media query but test on narrow widths)

## Visual / Interaction issues flagged (from prior conversations and static scan)
- Button active/focus states were previously inconsistent due to a malformed CSS block (this was fixed previously but then files were reverted — verify `src/styles/index.css` content in your workspace and reapply if you want consistent button active/focus/hover states).
- Desired tighter header-to-panel spacing across dashboards: currently layouts have `.dashboard-shell` and specific classes; add and apply a `compact-dashboard`/`ultra-compact` class to each layout to reduce spacing without breaking global styles.
- Fixed-position navbar and anchor scrolling: anchor links (e.g. `#apply`) need scroll offset correction if the navbar is fixed; consider `ScrollToTop` or JS that offsets scroll by navbar height when programmatically scrolling.

## Priority fixes (recommended sequence)
1. Button interaction consistency (hover/active/focus) — small CSS change in `src/styles/index.css` (high impact, low risk).
2. Compact dashboard spacing — add `.compact-dashboard` class (or tighten existing one) and apply to `CustomerLayout.jsx`, `ProviderLayout.jsx`, `AdminLayout.jsx` (moderate risk, reversible).
3. Add `Loader`/`EmptyState` to data-driven pages (Dashboard/MyBookings/Provider pages) where async calls will be placed (medium effort).
4. Convert major inline grid layouts (e.g., `BecomePartner.jsx`, `PlatformPages.jsx`) to use CSS classes with responsive breakpoints, or add mobile-specific inline overrides (larger effort).
5. Verify anchor scroll offset and adjust `ScrollToTop` to account for fixed navbar if needed (small JS change).

## Automated checks performed
- Collected link targets via grep of `to="/` and `href="/` across `frontend/src`.
- Examined router declarations in `src/App.jsx` and the `PlatformPages.jsx` exports.
- Located scaffold UI components under `src/scaffold/common` and `src/scaffold/ux`.
- Found many inline styled pages which increase audit work for responsive fixes.

## Suggested immediate implement actions (I can apply these on your confirmation)
- Reapply the stable button CSS and add `:active` and `:focus-visible` rules.
- Add a `compact-dashboard` class (or tighten the existing one) and apply to all role layouts to reduce the header-to-panel space.
- Add a small helper to adjust anchor scroll for fixed navbar.
- Replace the heaviest inline layouts with CSS classes and responsive rules (I can convert `BecomePartner.jsx` first as an example).

## Next steps I will take if you confirm (A: run fixes now)
1. Create `frontend/AUDIT.md` (done) and include this report.
2. Implement high-priority fixes in `src/styles/index.css` and apply `compact-dashboard` to role layouts.
3. Rebuild and run a smoke check.
4. Produce a short changelog of edits and open items.

If you prefer B (dev server interactive preview), I'll start `npm run dev` and you can test elements while I watch and iterate.

---

End of audit (static). For runtime validation I recommend opening the app in a browser (dev server) and walking through the role flows and the anchor link behaviors. If you want me to proceed with the high-priority fixes now, confirm and I'll apply them and run the build.
