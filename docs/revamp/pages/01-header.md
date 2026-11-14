# Header & navigation (all signed-in pages)

**Contract:** every page in `ROUTES` reachable (admin-only hidden for
teachers); account name + Logout; unknown paths still redirect to `/`
(`useRoutes`).

**Decision (after trying group menus + a phone tab bar, rejected):** one
header on every screen size: menu button · logo (links Home) · account
avatar (name, role, Log out). The menu button opens a left drawer (shadcn Drawer on `vaul`, added for
swipe-to-close) with
Home and every page grouped (Daily, Papers, Question bank, Institute),
icons, current page highlighted; picking a page closes it. Nothing pinned to
the side, so heavy pages keep the full width. Safe-area padding,
`viewport-fit=cover`, no tap flash.

**Not now:** hardware back closing sheets, page transitions, Ctrl K
palette, sticky header (pages still have their own sticky title bars),
large collapsing titles (needs per-page title bars removed first).
