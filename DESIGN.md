# Design System: Hyper-Charge (Dark Theme)
 
## 1. Overview & Creative North Star
The vision for this design system is **"Empowered Journey."** Inspired by premium electric automotive command centers and high-end aerospace cockpits, the interface balances state-of-the-art tech with a high-contrast lifestyle travel atmosphere. It is designed to feel spacious, authoritative, and clean.
 
We embrace **Hyper-Charge Aesthetic (Dark Edition)**: a fusion of rigid geometric precision and organic energy flow. This is achieved through rich, dark slate-navy canvases, a single dominant glowing neon brand accent, and a clean grid layout that prioritizes negative space. We move beyond simple utility to create a "premium digital cockpit" atmosphere for the EV driver.
 
---
 
## 2. Colors & Surface Philosophy
We use high-contrast signature highlights against deep, dark, multi-layered space backgrounds. To prevent visual fatigue, we establish a single dominant glowing accent and define depth through tonal shifts.
 
### Dominant Brand Accent (Electric Cyan)
- **Signature Highlight:** **Electric Cyan** (#00E5FF). Used for primary CTAs, active progress ring gradients, focus indicators, active navigation tabs, and critical highlight states.
 
### Semantic Status Accent (Neon Green)
- **Status Indicator:** **Neon Green** (#39FF14). Reserved strictly as a semantic status color to signal positive charging connection, active energy flow, and 100% capacity. It is not used for primary branding to avoid visual noise.
 
### Brand Gradient
- **The Charge Flow:** A linear gradient from **Deep Blue-Indigo** (#2563EB) to **Electric Cyan** (#00E5FF) at a 135° angle. Used for primary CTAs and active progress charts.
 
### Surface Hierarchy (Tonal Elevation)
- **Base Canvas:** Deep Space Midnight-Navy (#0A0E1A). A rich dark background that reduces visual strain.
- **Card Layers (Borderless):** Rich Slate-Navy (#141A29). Standard cards have **no borders**, blending smoothly onto the base canvas using only tonal contrast and soft ambient shadows.
- **Interactive Layers:** Elevated Navy (#1E2538). Used for text input fields, active toggle tracks, and secondary buttons. These fields utilize a thin 1px border (#1E293B) to stand out.
 
### The "Premium Space" Rule
**Explicit Instruction:** Use generous padding and margins (32px+) between sections. Do not crowd the interface. The design should feel "airy" and expensive, reflecting the premium nature of the charging network.
 
---
 
## 3. Typography
The typography system relies on absolute technical precision, rigid geometry, and clean visual weight. Handwritten script fonts are strictly prohibited in the Dark Theme.
 
| Level | Token | Font | Size | Weight | Color / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Geometric Sans | 4.0rem | Bold | Pure White (#FFFFFF) or Electric Cyan (#00E5FF) for hero headlines and key charging metrics (e.g. SoC %). |
| **Headline** | `headline-md` | Geometric Sans | 2.0rem | Bold | Pure White (#FFFFFF). For section headers. Tight letter-spacing. |
| **Accent** | `accent-italic` | Inter | 1.0rem | Light Italic | Soft Slate-Gray (#94A3B8). For human touches and encouraging status copy (e.g., *almost ready for your journey...*). |
| **Body** | `body-md` | Inter/Sans-Serif | 1.0rem | Regular | Soft Off-White Slate-Gray (#E2E8F0) for comfortable readability. |
| **Label** | `label-sm` | Inter/Sans-Serif | 0.75rem | Medium | All-caps for section headers, tags, and small labels. Slate-Gray (#94A3B8). |
 
---
 
## 4. Elevation & Depth (Borderless Stacking)
Depth is created through tonal layering and atmospheric glowing offsets rather than traditional light drop shadows.
 
- **Tonal Contrast:** Standard cards use Rich Slate-Navy (#141A29) placed directly onto the Deep Space Midnight-Navy (#0A0E1A) background. Cards have **no border strokes** to maximize spatial fluidity and cleanliness.
- **Focused Borders:** Use a thin (1px) border in Dark Slate (#1E293B) at low opacity *strictly* for active elements, focused input fields, or selectable active cards to suggest highlight.
- **Active Ambient Glow:** Selected/active elements and high-power charger states emit a soft, atmospheric Electric Cyan glow (`0px 10px 30px rgba(0, 229, 255, 0.12)`) to lift them visually.
 
---
 
## 5. Components
 
### Buttons
- **Primary:** High-impact. Pill-shaped (9999px roundedness). Solid Brand Gradient (Blue-Indigo to Electric Cyan) with Pure White text, or Solid Pure White with Deep Black text.
- **Secondary:** Ghost style. Pill-shaped. Thin 1px Electric Cyan border with matching text.
 
### Data & Content Cards
- **Construction:** Borderless Rich Slate-Navy (#141A29) background. 
- **Spacing & Rounding:** Extra-large internal padding (`2xl`: 2rem / 32px) and generous corner rounding (24px for standard cards, 32px for large widgets).
 
### Navigation
- **Top Bar:** Transparent with a backdrop-blur. 
- **Bottom Navigation**: High-contrast Slate-Navy container, with active tab states highlighted in Electric Cyan.
 
### Iconography
- **Style:** Minimalist, thin-line (2pt stroke). Monochrome Off-White with Electric Cyan highlights for active states.
 
---
 
## 6. Do's and Don't's
 
### Do
*   **Do Use Borderless Cards:** Rely on tonal shifts (#0A0E1A to #141A29) for standard panel containers.
*   **Do Keep Accents Selective:** Use Electric Cyan for interactive signals, and Neon Green *strictly* for successful statuses.
*   **Do Keep Spacing Expansive:** Ensure margins are 32px+ so data metrics feel premium and easy to scan.
 
### Don't
*   **No Handwritten Scripts:** Do not use casual handwritten scripts; rely on sleek geometric italics instead.
*   **No Border Outlines on Standard Panels:** Avoid enclosing standard lists and static cards in boxy outlines.
*   **No Heavy Grid Borders:** Do not use dividers in lists. Use space or tonal shifts instead.
