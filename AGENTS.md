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

Prototype console visual rule: authentication and console UI use official shadcn/ui neutral tokens and compact controls inspired by the Dujiao-Next admin container. The project supports one white daytime theme only, with no theme toggle, dark preference, or system-theme switching; avoid branded purple or decorative dashboard color. Local development exposes TanStack Router and Query Devtools, while production builds exclude them.

Prototype authentication visual rule: the authentication page uses the existing Galaxy Home hero artwork as a full-page background under a light monochrome neutral overlay. Keep the intro and shadcn card legible in the single white daytime theme.

Prototype media performance rule: keep persisted admin image URLs backward-compatible, but serve bundled artwork through WebP 768px/1280px variants. Preload only the visible route hero/LCP image, use responsive `srcset` for content images, and lazy-load images below the first viewport.

Prototype authorization rule: accounts have exactly two application roles, `admin` and `user`. New signups default to `user`; only admins see or access user management and site-setting navigation, and role changes must be enforced by trusted Supabase server code rather than browser state.

Prototype homepage CMS rule: the admin Home settings page must map one-to-one to every visible Home section. Administrators can publish section visibility, images and focal positions, icons, copy, user/testimonial data, button labels, and destination links; repeatable cards/items support explicit add and delete controls. The public Home renders the same global Supabase configuration, which is publicly readable while writes remain admin-only through RLS.

Prototype CMS media rule: image controls in site settings, including every product browsing hero and product card image, must support selecting a local image to upload and replace the current image. Keep direct image URL editing backward-compatible; uploaded public media writes remain admin-only.

Prototype CMS media-picker rule: every site-settings image replacement entry opens a compact chooser with both the project media library and local upload options; library selections write back the public image URL without requiring a new upload.

Prototype media-library source rule: the project media library combines bundled `public/images` assets, Supabase `site-media` uploads, and the current field image, so existing project artwork remains selectable even when it was not uploaded through the current field or scope.

Prototype compute-spec rule: public product cards must use GPU-compute specifications and matching hardware icons. Show GPU model, VRAM, and hosting term rather than bedroom, bathroom, or floor-area semantics; expose the same three fields in product settings.

Prototype product-results copy rule: the public product results heading must have a prominent dedicated input in product browsing settings. The input supports a `{count}` token that renders the current visible product count after filtering.

Prototype product-card click-link rule: every product browsing card exposes a clearly labeled “点击跳转链接” input in product browsing settings. The saved value controls clicking the entire public product card, supports internal client-side paths and full HTTPS URLs, and remains backward-compatible with the existing `link` field.

Prototype account-settings rule: every authenticated user has an account settings entry in the asset-operation navigation. Users can update their display name, avatar, avatar fallback color, and password; login username and verified email remain read-only, and avatar storage is restricted to the authenticated user's own folder.

Prototype run-compute terminology rule: the console section previously called "托管收益" is labeled "跑算". Device-generated income is called "跑算收益" in summaries, activity, and transaction rows, while generic financial concepts such as monthly earnings and pending settlement remain "收益".

Prototype console-brand rule: the console sidebar brand uses a dual-fan desktop GPU outline icon in NVIDIA Green `#76B900` beside the Aether Lane wordmark, matching the supplied desktop-graphics-card reference. This console-only mark does not replace the public site's four-tile brand symbol.

Prototype shared-logo CMS rule: top-navigation settings include a logo image URL and upload control. The default value is `/images/gpu-logo.svg`, an NVIDIA Green dual-fan GPU mark, so the field is never blank in the default configuration. After publishing, the same logo and site name drive the settings preview, public shared header, and authenticated console sidebar; clearing a saved custom logo falls back to the same GPU mark.

Prototype browser-meta CMS rule: top-navigation settings include persisted browser-tab title and favicon controls; publishing updates the real document title and favicon on public/authenticated web routes, with the GPU mark and `速芯算力suxin.ai` as defaults.

Prototype footer-logo CMS rule: footer settings expose their own Logo image URL and upload control in the brand-and-social section. The default `/images/gpu-logo.svg` value drives the public footer brand independently from the top-navigation Logo, and an empty saved value falls back to the same GPU mark.

Prototype console-loading rule: refreshing or entering an authenticated console route uses a compact neutral loading widget rather than a plain loading sentence. Its primary visual is a gray progress rail with an NVIDIA Green progress layer and a pixel-art RTX 5090 mini GPU riding at the progress head. It retains account, asset, and console preparation stages and respects `prefers-reduced-motion`.

Prototype settings-density rule: site-setting pages open directly on their editable accordion sections and sticky publish bar. Do not render a separate top content-management summary or workflow introduction card.

Prototype commerce-console rule: administrators have a top-level “商城” group in the console sidebar with “商品列表” and “支付设置” child entries. Both pages use the compact section-based settings pattern, persist private administrator-only commerce configuration, and never store payment secrets in browser-readable settings.

Prototype commerce-catalog rule: the store catalog is organized into administrator-managed product categories and products. Products expose image upload, category, name, SKU, public slug/share link, GPU specifications, inventory, detail copy, and rental, buyout, or combined billing. Rental products persist period units, renewal eligibility, and current renewal price; renewal orders reference the original rental order and extend its service expiry only after verified payment.

Prototype commerce-detail rule: every enabled store product has a public `/estates/:categoryId/:productId` detail page under the persistent shared header and footer. The page shows product imagery, category, GPU specifications, inventory, rental/buyout choices, renewal terms, and a Web Share/clipboard-compatible share link; legacy `/products/...` and single-segment slug links remain read-compatible but are never generated for new shares.

Prototype payment-runtime rule: payment channels follow the Dujiao-Next provider/channel/interaction/fee/amount/scope model. Public configuration and secret credentials are stored separately; channel administration, server-side order repricing, provider payment creation, callback signature verification, idempotent payment completion, and rental-expiry updates run only in trusted Supabase Edge Functions and service-role database code. Manual transfer and EPay are the first active adapters; unsupported providers must return an explicit adapter-not-enabled error rather than simulate success.

Prototype payment-settings UI rule: the administrator payment settings page must retain the full Dujiao-Next channel-management structure rather than a simplified settings card. It includes provider and channel filters, ID/name/provider/type/interaction/fee/status/sort/action columns, page-size pagination, and a scrollable add/edit dialog with amount limits, payment scopes, member-level restrictions, active state, advanced JSON, and provider-specific fields for EPay v1/v2, PayPal, Stripe, Alipay, WeChat Pay, BEPUSDT, EPUSDT, TokenPay, OKPay, and manual transfer.

Prototype homepage hero action rule: the public Home hero has no primary or secondary action buttons. Home settings must not expose or persist Hero button labels or links.

Prototype product hero carousel rule: the public product-browsing Hero renders five independent cards from the configured Hero image, defaulting to `/images/gpu-carousel-card.png` sourced from `gpu.png`. Match the supplied five-card reference with one dominant centered card, two smaller inner cards, and two lowest-layer outer cards in a compact symmetrical fan. GSAP advances once every 4.5 seconds; when the leftmost card wraps to the far right, it must travel beneath all other four cards at the lowest z-layer rather than crossing in front of them. Hovering or focusing any card pauses the whole group and lifts/straightens that card like drawing from a hand, then smoothly restores and resumes. Respect `prefers-reduced-motion`, pause while the document is hidden, and keep legacy `/images/estates-hero.png` and `/images/estates-hero-game-cards.png` defaults read-compatible.

Prototype console scrolling rule: the console uses one viewport-height shell with the main column as the dedicated vertical scroll container. The sticky top bar and settings publish bar must remain usable while every accordion section and the final page content can scroll fully into view on desktop and mobile.

Prototype CMS focal-preview rule: every cropped content image in Home, product browsing, Blog Home, footer, and commerce settings uses explicit horizontal and vertical percentage focal controls from 0 to 100. Its preview must update immediately and display the normalized `x% y%` crop state. Legacy keyword or single-axis values remain readable and normalize to two percentages; contain-fit logos and payment icons do not expose meaningless crop controls.

Prototype CMS image-preview rule: every cropped CMS image editor shows the complete uncropped source image without stretching, plus a separate crop-result thumbnail using the public component's intended aspect ratio and current focal percentages. The form height must never stretch the source preview into a misleading narrow frame.

Prototype product hero surface rule: the public product-browsing Hero displays only the five-card carousel, with no title, description, or breadcrumb. Its surface is transparent over the white product-page background. Product Hero settings expose only media, focal-position, visibility, and upload controls; copy and breadcrumb fields are not persisted.

Prototype product hero media rule: the product Hero uses one configured image per card, defaulting to `/images/gpu2.png`. The bundled asset is cropped tightly to 986 × 1410 at the outside edge of its rounded pink card border, including removal of the residual right and bottom white strips, and the carousel uses its true card aspect ratio so the border is not clipped. Product Hero settings expose one image, focal-position, and upload control for each card; legacy light and dark image fields remain read-compatible but normalize into the single daytime image.

Prototype product hero CMS rule: Product browsing settings manage the complete five-card Hero. Administrators can enable or hide the section, configure desktop maximum height and mobile height, desktop and mobile primary-card widths, the autoplay interval, and each of the five cards' single daytime image, focal position, upload, and whole-card click link. Saving normalizes numeric limits and publishes the configuration directly to the public `/estates` Hero while remaining read-compatible with legacy shared and theme-specific Hero image fields.

Prototype global theme rule: the public site, authentication flow, and authenticated console use one white daytime theme only. The application must remove any stale `dark` root class and stored theme preference during startup, set `color-scheme: light`, expose no theme toggle, and render only the daytime product Hero media controls and assets.

Prototype shared-header material rule: the persistent public header uses a borderless white translucent frosted-glass surface with backdrop blur and a soft neutral shadow. Do not add a white outline or inset border highlight, and do not use a blue-purple filled navigation background; keep navigation text dark and readable on Home, Estates, Blog, and mobile menus.

Prototype shared-chrome language rule: the public shared top navigation and footer use Simplified Chinese for all user-facing navigation, column, contact, copyright, and policy copy. Their corresponding administrator settings must display and edit the same Chinese values; normalization migrates only the known legacy English defaults while preserving genuinely customized text.

Prototype CMS crop-result rule: every site-settings image editor that exposes an image focal-position field must apply the current field value to its separate crop-result thumbnail in real time. That thumbnail uses cover cropping and matching `object-position` semantics, displays the current focal value, and uses a section-appropriate aspect ratio when known so administrators see the published crop direction before saving.

Prototype product filter CMS rule: the public product-browsing sidebar uses compute-product semantics only. It filters enabled products by deployment region, GPU model, VRAM, hosting term, and optional maximum price; selectable values are derived from the enabled product cards so public filtering and product settings cannot drift apart. Product browsing settings manage the sidebar title and description, every visible group label and all-option label, result and empty copy, sort copy, module visibility, and the overall filter/sort switches. Legacy real-estate filter copy is migrated to the compute defaults during normalization.

Prototype marketing-pages CMS rule: About, yield calculator, agency, and contact join the existing public routes under the persistent shared header and footer with the same daytime compute-product visual system and client-side navigation. Each visible page section has a matching administrator accordion that controls visibility, image URL and upload, two-axis focal position, icon, copy, button label, and click link; repeatable section items also expose add, delete, display, icon, copy, and link controls where the public anatomy supports them.

Prototype Android release rule: the first Android APK packages the web app with Capacitor and uses the production Supabase backend, but does not enable native payment checkout yet. Authentication deep links and Android App Links use the `ai.suxin.ai` domain.

Prototype branch-boundary rule: `main` is the website project and production website deployment source. `Android` contains the website plus Capacitor/Android native development and APK build support. Website and Supabase changes originate on `main` and are synchronized into `Android`; Android-only native files, SDK configuration, signing, emulator work, and APK changes must remain on `Android` and must not be merged back into `main`.

Prototype typography rule: all public pages, authentication screens, and authenticated console pages must favor readable text over miniature display density. Keep primary body copy and controls around 13-15px, secondary labels and metadata around 10-12px, and avoid restoring 8-10px text except inside intentionally scaled CMS preview canvases.

Prototype public-header typography rule: shared top-navigation labels must stay readable at 15px on desktop and 14px at the intermediate desktop breakpoint; the expanded mobile menu keeps the 15px label size without changing the header's compact geometry.

Prototype mobile user-management rule: on small screens, user-management selection must remain visibly actionable without horizontal discovery. Show a labeled select-all control and the destructive bulk-delete button above the table, keep row checkboxes high-contrast and touch-friendly, and pin the selection column to the table's left edge while horizontally scrolling other columns.

Prototype mobile console-sidebar rule: the console drawer keeps the brand and help area fixed while its navigation is a dedicated touch-scroll region. Every administrator group and site-setting entry, including pages added below the initial viewport, must remain reachable above the device safe area and mobile browser toolbar.

Prototype user-selection state rule: user-management checkboxes must expose an unmistakable selected state on desktop and mobile: neutral black fill with a white check, a distinct mixed-state bar for partial selection, selected-row highlighting, an immediately updated selected count, and an enabled destructive action only when at least one non-current user is selected.

Prototype account-deletion reuse rule: administrator soft deletion preserves rental and financial history, but must immediately release the deleted account's profile, username alias, and email alias so those credentials can register again. Authentication errors must render a useful Chinese message and never expose opaque values such as `{}`.

Prototype signup-OTP rule: registration confirmation emails may expose both a link and a six-digit code. Verify the manually entered email code with Supabase `verifyOtp` type `email`; reserve `signup` for sending or resending the signup confirmation message. A fresh code must not be reported as expired because of a mismatched verification type. The login screen must keep a direct verification entry so users can reopen the form after refreshing, edit the pending email address, and complete verification without registering again.

Prototype GitHub Pages route rule: every stable public, authentication, and console route that users may open or refresh directly must be emitted as a real static directory entry during production builds so GitHub Pages returns a successful document instead of relying only on a 404 SPA fallback. The application must normalize trailing slashes before route matching.

Prototype web-auth flow rule: the client-only GitHub Pages website uses Supabase implicit auth flow so manually entered six-digit signup and recovery OTPs remain directly verifiable. Capacitor Android keeps PKCE for native authentication and App Link code exchange.

Prototype auth-email freshness rule: each Supabase confirmation email template must contain exactly one rendered document, and its subject must include `{{ .Token }}` so mailbox threading cannot make an older six-digit code look current. Authentication UI copy must tell users that only the newest subject code remains valid.
