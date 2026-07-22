# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype-specific visual rule: in the hero, the "Galaxy Home" title must render centered horizontally and slightly below the navigation, in front of the sky but behind the central mountain, trees, and residence.

Prototype navigation rule: Home and Estates use one persistent shared header and footer. Switching between them must happen client-side by replacing only the middle page content, with no full-page reload or flash.

Prototype blog rule: Blog joins Home and Estates under the same persistent shared header and footer, switching client-side with no reload. Its desktop layout should faithfully match the supplied Aether Lane “Stories Above the Skyline” reference, and article/newsletter content is backed by Supabase with public-read and insert-only RLS policies; only the publishable key may enter the browser bundle.

Prototype product rule: this product serves users who rent compute devices, host them on the platform, and earn ongoing revenue. Account, dashboard, device, order, earnings, transaction, and site-configuration work should use this compute-asset model rather than a real-estate administration model.

Prototype authentication rule: Supabase Auth powers registration, verified email activation, username-or-email/password login, sessions, logout, forgot-password email, and password recovery. Registration collects username, email, and password. Successful login returns to Home, where the shared header shows the user's avatar with a client-side dropdown containing Console and Log out.

Prototype console rule: the authenticated console uses TanStack Router, Query, and Table. It includes asset overview, compute devices, rental orders, hosting earnings, transactions, and persisted settings for top navigation, footer, Home, product browsing, and Blog Home.

Prototype site-settings rule: top navigation, footer, Home, product browsing, and Blog Home settings use the same compact section-based CMS pattern. Every visible public-page section must have corresponding admin controls for display state and its relevant copy, images, icons, links, and repeatable items; saving publishes the configuration to the matching public page.

Prototype console visual rule: authentication and console UI use official shadcn/ui neutral tokens and compact controls inspired by the Dujiao-Next admin container. Support only a rational black/white light and dark theme with an explicit theme toggle; avoid branded purple or decorative dashboard color. Local development exposes TanStack Router and Query Devtools, while production builds exclude them.

Prototype authentication visual rule: the authentication page uses the existing Galaxy Home hero artwork as a full-page background under a monochrome neutral overlay. Keep the intro and shadcn card legible in both light and dark themes.

Prototype media performance rule: keep persisted admin image URLs backward-compatible, but serve bundled artwork through WebP 768px/1280px variants. Preload only the visible route hero/LCP image, use responsive `srcset` for content images, and lazy-load images below the first viewport.

Prototype authorization rule: accounts have exactly two application roles, `admin` and `user`. New signups default to `user`; only admins see or access user management and site-setting navigation, and role changes must be enforced by trusted Supabase server code rather than browser state.

Prototype homepage CMS rule: the admin Home settings page must map one-to-one to every visible Home section. Administrators can publish section visibility, images and focal positions, icons, copy, user/testimonial data, button labels, and destination links; repeatable cards/items support explicit add and delete controls. The public Home renders the same global Supabase configuration, which is publicly readable while writes remain admin-only through RLS.
