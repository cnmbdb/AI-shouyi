# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Prototype-specific visual rule: in the hero, the "Galaxy Home" title must render centered horizontally and slightly below the navigation, in front of the sky but behind the central mountain, trees, and residence.

Prototype navigation rule: Home and Estates use one persistent shared header and footer. Switching between them must happen client-side by replacing only the middle page content, with no full-page reload or flash.

Prototype mobile navigation rule: on small screens, the persistent header must always show a compact login entry when signed out and the user avatar when signed in, immediately beside the menu toggle without overlapping the brand.

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

Prototype CMS media rule: image controls in site settings, including every product browsing hero and product card image, must support selecting a local image to upload and replace the current image. Keep direct image URL editing backward-compatible; uploaded public media writes remain admin-only.

Prototype compute-spec rule: public product cards must use GPU-compute specifications and matching hardware icons. Show GPU model, VRAM, and hosting term rather than bedroom, bathroom, or floor-area semantics; expose the same three fields in product settings.

Prototype product-results copy rule: the public product results heading must have a prominent dedicated input in product browsing settings. The input supports a `{count}` token that renders the current visible product count after filtering.

Prototype account-settings rule: every authenticated user has an account settings entry in the asset-operation navigation. Users can update their display name, avatar, avatar fallback color, and password; login username and verified email remain read-only, and avatar storage is restricted to the authenticated user's own folder.

Prototype run-compute terminology rule: the console section previously called "托管收益" is labeled "跑算". Device-generated income is called "跑算收益" in summaries, activity, and transaction rows, while generic financial concepts such as monthly earnings and pending settlement remain "收益".

Prototype console-brand rule: the console sidebar brand uses a dual-fan desktop GPU outline icon in NVIDIA Green `#76B900` beside the Aether Lane wordmark, matching the supplied desktop-graphics-card reference. This console-only mark does not replace the public site's four-tile brand symbol.

Prototype shared-logo CMS rule: top-navigation settings include a logo image URL and upload control. The default value is `/images/gpu-logo.svg`, an NVIDIA Green dual-fan GPU mark, so the field is never blank in the default configuration. After publishing, the same logo and site name drive the settings preview, public shared header, and authenticated console sidebar; clearing a saved custom logo falls back to the same GPU mark.

Prototype footer-logo CMS rule: footer settings expose their own Logo image URL and upload control in the brand-and-social section. The default `/images/gpu-logo.svg` value drives the public footer brand independently from the top-navigation Logo, and an empty saved value falls back to the same GPU mark.

Prototype console-loading rule: refreshing or entering an authenticated console route uses the compact animated GPU loading widget rather than a plain loading sentence. It shows account, asset, and console preparation stages, uses NVIDIA Green status motion, and respects `prefers-reduced-motion`.

Prototype settings-density rule: site-setting pages open directly on their editable accordion sections and sticky publish bar. Do not render a separate top content-management summary or workflow introduction card.
