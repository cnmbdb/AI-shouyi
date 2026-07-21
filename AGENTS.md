# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype-specific visual rule: in the hero, the "Galaxy Home" title must render centered horizontally and slightly below the navigation, in front of the sky but behind the central mountain, trees, and residence.

Prototype navigation rule: Home and Estates use one persistent shared header and footer. Switching between them must happen client-side by replacing only the middle page content, with no full-page reload or flash.

Prototype blog rule: Blog joins Home and Estates under the same persistent shared header and footer, switching client-side with no reload. Its desktop layout should faithfully match the supplied Aether Lane “Stories Above the Skyline” reference, and article/newsletter content is backed by the isolated MySQL `aether_*` tables through same-origin server APIs; database credentials must never enter the browser bundle.

Prototype product rule: this product serves users who rent compute devices, host them on the platform, and earn ongoing revenue. Account, dashboard, device, order, earnings, transaction, and site-configuration work should use this compute-asset model rather than a real-estate administration model.

Prototype authentication rule: username and password registration/login require no email or verification step. Successful registration or login returns to Home, where the shared header shows the user's avatar with a client-side dropdown containing Console and Log out.

Prototype console rule: the authenticated console uses TanStack Router, Query, and Table. It includes asset overview, compute devices, rental orders, hosting earnings, transactions, and persisted settings for top navigation, footer, Home, product browsing, and Blog Home.

Prototype console visual rule: authentication and console UI use official shadcn/ui neutral tokens and compact controls inspired by the Dujiao-Next admin container. Support only a rational black/white light and dark theme with an explicit theme toggle; avoid branded purple or decorative dashboard color. Local development exposes TanStack Router and Query Devtools, while production builds exclude them.

Prototype authentication visual rule: the authentication page uses the existing Galaxy Home hero artwork as a full-page background under a monochrome neutral overlay. Keep the intro and shadcn card legible in both light and dark themes.
