# Design System: Kinetic Precision
 
## 1. Overview & Creative North Star
The vision for this design system is **"Luminous Velocity."** In the context of an EV Charging CMS, we are not merely managing hardware; we are orchestrating the flow of energy. The interface must feel like a high-performance instrument—precise, reactive, and weightless.
 
We move beyond the "SaaS Template" look by embracing **Kinetic Precision**. This is achieved through wide, intentional letter-spacing in headers, asymmetric data density (breathing room vs. focus areas), and a UI that feels "projected" rather than "printed." We treat light as a functional material, using it to guide the eye across complex telemetry.
 
---
 
## 2. Colors & Surface Philosophy
Color is used as a signal, not a decoration. Our foundation is deep and cinematic, providing the perfect stage for the high-energy "Electric Blue" and "Volt Green."
 
### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders for sectioning are prohibited. Layout boundaries must be defined through background color shifts. For example, a card should not be defined by a stroke, but by its `surface-container-low` background sitting against a `surface` background.
 
### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of tinted glass. 
- **Base Layer:** `surface` (#111316)
- **Primary Containers:** `surface-container-low` (#1a1c1f) for main content areas.
- **Floating/Active Elements:** `surface-container-high` (#282a2d) or `highest` (#333538) to pull attention.
- **Interaction Nesting:** When a component lives inside a container, use a tiered shift (e.g., a search bar inside a `surface-container-high` header should use `surface-container-highest`) to create depth without visual noise.
 
### The "Glass & Gradient" Rule
To achieve the high-tech feel, use Glassmorphism for floating elements (Sidebars, Modals).
- **Background Blur:** 20px–40px.
- **Fill:** `surface` at 60-80% opacity.
- **Signature Texture:** Use a subtle radial gradient on primary actions, transitioning from `primary_container` (#00a8ff) to `primary` (#95ccff). This adds a "glow" that flat hex codes cannot replicate.
 
---
 
## 3. Typography
The typography system balances the industrial precision of **Space Grotesk** for data-viz/headings with the functional clarity of **Inter** for management tasks.
 
| Level | Token | Font | Size | Tracking | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Space Grotesk | 3.5rem | -0.02em | For hero metrics (e.g., total kW delivered). |
| **Headline** | `headline-md` | Space Grotesk | 1.75rem | +0.02em | Bold, uppercase for section titles to feel "Modern." |
| **Title** | `title-md` | Inter | 1.125rem | 0 | For card titles and navigation. |
| **Body** | `body-md` | Inter | 0.875rem | 0 | The workhorse for station details and logs. |
| **Label** | `label-sm` | Inter | 0.6875rem | +0.05em | All-caps for status indicators and table headers. |
 
---
 
## 4. Elevation & Depth
Hierarchy is conveyed through **Tonal Layering** rather than traditional structural lines.
 
- **The Layering Principle:** Stack `surface-container` tiers to create a soft, natural lift. Place `surface-container-lowest` elements on a `surface-container-low` background to suggest a recessed area.
- **Ambient Shadows:** Shadows are reserved for elements that literally "fly" over the UI (Modals, Dropdowns). 
    - **Specs:** `0px 24px 48px rgba(0, 0, 0, 0.4)`. 
    - **Coloring:** Shadows must be tinted with the `on-surface` color at low opacity to avoid a "muddy" appearance.
- **The "Ghost Border" Fallback:** If a border is required for extreme accessibility, use the `outline-variant` (#3e4852) at **20% opacity**. Never use 100% opaque strokes.
 
---
 
## 5. Components
 
### Buttons
- **Primary:** High-gloss. Use `primary_container` with a subtle top-to-bottom gradient to `primary`. Roundedness: `full` (9999px) for a "pill" shape that feels ergonomic.
- **Secondary:** Tonal. `surface-container-highest` background with `on-surface` text.
- **Tertiary:** Ghost. No background, `primary` text. Use for low-emphasis actions like "Cancel."
 
### Data Cards
- **Construction:** No borders. Use `surface-container-low`.
- **Spacing:** Large internal padding (`xl`: 1.5rem).
- **Interactive State:** On hover, shift background to `surface-container-high` and apply a subtle "Electric Blue" outer glow using a 4% opacity shadow.
 
### Glassmorphic Sidebars
- **Background:** `surface` at 70% opacity.
- **Backdrop-filter:** `blur(32px)`.
- **Active State:** A vertical "Electric Blue" pill on the far left, using the `primary` token, with a soft glow.
 
### Interactive Data Tables
- **Grid:** Forbid the use of horizontal dividers. Use alternating row colors (Zebra striping) using `surface` and `surface-container-lowest`.
- **Headers:** `label-md` typography, all-caps, with 10% letter spacing.
 
### Station Status Chips
- **Active:** `tertiary_container` (#00b85d) background with `on_tertiary_container` text.
- **Fault:** `error_container` (#93000a) with `on_error_container` text.
- **Shape:** `sm` (0.25rem) roundedness for a more technical, "tag" appearance.
 
---
 
## 6. Do's and Don'ts
 
### Do
- **Embrace Negative Space:** Allow data to breathe. If a view feels cluttered, increase the padding, don't add more lines.
- **Use "Volt Green" Sparingly:** It is a high-utility signal. Only use it for "System Healthy" or "Active Charge."
- **Layering over Shadowing:** Always try to solve a hierarchy problem with a background color shift before reaching for a shadow.
 
### Don't
- **No 100% Black:** Never use `#000000`. Use the `surface` token (#111316) to maintain depth and color accuracy.
- **No Sharp Corners:** Avoid `none` (0px) roundedness. Everything in this system should feel machined and finished, using at least `sm` (0.25rem) or `md` (0.75rem) radii.
- **No High-Contrast Borders:** Never use white or light grey borders to separate dark containers. It breaks the "Luminous Velocity" immersion.