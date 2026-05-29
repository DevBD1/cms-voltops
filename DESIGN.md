# Design System: Hyper-Charge
 
## 1. Overview & Creative North Star
The vision for this design system is **"Empowered Journey."** Inspired by IONITY's European charging network, the interface balances high-tech infrastructure with human-centric lifestyle experiences. It is designed to feel premium, reliable, and effortless.
 
We embrace **Hyper-Charge Aesthetic**: a fusion of rigid geometric precision and organic energy. This is achieved through high-contrast surfaces, vibrant brand gradients that signify power flow, and a minimalist layout that prioritizes clarity and white space. We move beyond simple utility to create a "premium travel" atmosphere.
 
---
 
## 2. Colors & Surface Philosophy
Color is a primary brand signifier. We use a high-energy gradient to represent the flow of electricity against a clean, high-contrast background.
 
### Brand Gradient
- **The Energy Flow:** A linear gradient from **Power Purple** (#6A0DAD) to **Pulse Pink** (#FF007F). Used for primary CTAs, progress indicators, and key branding elements.
 
### Surface Hierarchy
- **Base Layer:** Pure White (#FFFFFF) to create a clean, modern, and accessible foundation.
- **Contrast Layer:** Deep Black (#000000) for headers, primary text, and high-impact containers.
- **Action Layer:** Neon Pink (#FF007F) used sparingly for stylistic accents and interactive highlights.
 
### The "Premium Space" Rule
**Explicit Instruction:** Use generous padding and margins (32px+) between sections. Do not crowd the interface. The design should feel "airy" and expensive, reflecting the premium nature of the charging network.
 
---
 
## 3. Typography
The typography system pairs technical geometric sans-serifs with a "human" script accent.
 
| Level | Token | Font | Size | Weight | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Geometric Sans | 4.0rem | Bold | For hero headlines and major metrics. |
| **Headline** | `headline-md` | Geometric Sans | 2.0rem | Bold | For section headers. Tight letter-spacing. |
| **Accent** | `accent-script` | Handwritten Script | 1.5rem | Regular | For stylistic "human" touches (e.g., "beyond"). |
| **Body** | `body-md` | Inter/Sans-Serif | 1.0rem | Regular | For descriptions and general content. |
| **Label** | `label-sm` | Inter/Sans-Serif | 0.75rem | Medium | All-caps for headers, tags, and small labels. |
 
---
 
## 4. Elevation & Depth
Depth is created through high contrast and subtle shadows rather than complex layering.
 
- **High Contrast:** Place Deep Black containers directly on Pure White backgrounds to create immediate visual hierarchy.
- **Subtle Borders:** Use very thin (1px) borders in Light Gray (#E5E7EB) for cards and input fields to provide structure without noise.
- **Interactive Shadows:** Apply soft, large-radius shadows (`0px 10px 30px rgba(0, 0, 0, 0.05)`) only to interactive cards and modals to suggest lift.
 
---
 
## 5. Components
 
### Buttons
- **Primary:** High-impact. Pill-shaped (9999px roundedness). Solid Deep Black background with Pure White text, or Brand Gradient for the main conversion point.
- **Secondary:** Ghost style. Pill-shaped. Thin 1px Black or Neon Pink border with matching text.
 
### Data & Content Cards
- **Construction:** Pure White background with a subtle 1px #E5E7EB border.
- **Spacing:** Extra-large internal padding (`2xl`: 2rem).
- **Style:** Clean, high-contrast typography and clear call-to-action buttons.
 
### Navigation
- **Top Bar:** Minimalist and sticky. Deep Black or Pure White background depending on context. Simple text links with high tracking for a "Modern" feel.
- **Mega Menu:** Large, structured dropdowns for complex categories like "Charging" and "Locations."
 
### Iconography
- **Style:** Minimalist, thin-line (2pt stroke). Monochrome (Black/White) with occasional Neon Pink highlights for active states.
 
---
 
## 6. Do's and Don'ts
 
### Do
- **Use Photography:** Incorporate high-quality lifestyle photography that emphasizes the travel experience.
- **Embrace the Gradient:** Use the Purple-to-Pink gradient as the "pulse" of the application.
- **Maintain High Contrast:** Ensure text is always perfectly legible against its background.
 
### Don't
- **No Clutter:** Avoid dense tables or packed lists. If information is complex, break it into cards or stepped flows.
- **No Heavy Shadows:** Avoid dark, muddy shadows. Keep them light and airy.
- **No Default Fonts:** Avoid generic system fonts where possible; use Geometric Sans and Inter to maintain the high-tech feel.
