```markdown
# Design System Document: The Editorial Architect

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the cluttered, "utility-first" aesthetic of traditional CMS platforms. Instead, it adopts the persona of **The Digital Curator**. The goal is to treat content management as an editorial experience, where the interface recedes to let the creator’s work take center stage. 

The "template" look is intentionally broken through **Asymmetric Breathing Room** and **Tonal Layering**. We bypass the rigid, boxed-in grids of legacy dashboards in favor of an expansive, airy layout that feels like a premium digital gallery. By utilizing high-contrast typography scales and varying surface depths, we create a hierarchy that feels organic rather than forced.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in a pristine, high-end white base, punctuated by a surgical application of `primary` (#004ac6) and `primary_container` (#2563eb).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off the UI. Standard borders create visual noise. Instead, boundaries must be defined through:
*   **Background Shifts:** Distinguish the global sidebar from the workspace by placing a `surface_container_low` sidebar against a `surface` background.
*   **Tonal Transitions:** Use `surface_container_lowest` for main article cards to make them "pop" naturally against a `surface_container` background.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine paper.
*   **Level 0 (Base):** `surface` (#faf8ff) – The main canvas.
*   **Level 1 (Sections):** `surface_container_low` (#f2f3ff) – Use for sidebars or secondary navigation.
*   **Level 2 (Active Work):** `surface_container_lowest` (#ffffff) – Reserved for the highest priority content, like the active article editor.

### The "Glass & Gradient" Rule
To add "soul" to the minimalism, primary CTAs should utilize a subtle linear gradient: `primary` (#004ac6) to `primary_container` (#2563eb). For floating modals or "quick view" article overlays, use **Glassmorphism**: a background color of `surface_variant` at 70% opacity with a `backdrop-filter: blur(12px)`.

---

## 3. Typography: Editorial Authority
We pair the geometric precision of **Manrope** for high-level structure with the utilitarian clarity of **Inter** for management tasks.

*   **Display & Headlines (Manrope):** Use `display-md` (2.75rem) for dashboard welcomes and `headline-sm` (1.5rem) for article titles. The wide character stance of Manrope communicates authority and modernism.
*   **Body & Labels (Inter):** Use `body-md` (0.875rem) for general metadata. Inter is used here for its high x-height, ensuring legibility even when managing dense content lists.
*   **Hierarchy Note:** Always maintain at least a two-step jump in the typography scale between a title and its metadata to ensure a clear "reading path."

---

## 4. Elevation & Depth: Tonal Layering
We do not use structure; we use light.

*   **The Layering Principle:** Instead of shadows, stack `surface_container` tiers. A `surface_container_highest` element sitting on a `surface` base creates a clear "raised" effect without a single drop shadow.
*   **Ambient Shadows:** If an element must float (e.g., a dropdown menu), use a shadow with a blur of `24px`, an opacity of `6%`, and a color derived from `on_surface` (#131b2e). It should look like a soft glow, not a dark smudge.
*   **The "Ghost Border" Fallback:** If a container needs more definition (e.g., in high-density list views), use the **Ghost Border**: a 1px stroke using `outline_variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Refined Primitives

### Buttons & Pill Filters
*   **Primary Button:** Rounded rectangle (`DEFAULT` 0.5rem radius). Background: Gradient from `primary` to `primary_container`. Text: `on_primary` (#ffffff).
*   **Status Filters:** True "Pill" shape (`full` 9999px radius). Use `surface_container_high` for inactive states and `primary` for active states. 
*   **Interaction:** On hover, buttons should shift +2px vertically with a soft ambient shadow, suggesting tactile feedback.

### Icon-Only Global Sidebar
*   **Visual Style:** Icons should be 24px, centered in a 48px square container.
*   **Active State:** Use a 4px vertical "tab" on the left edge in `primary` blue. Do not box the icon; let it breathe within the `surface_container_low` background.

### Article Cards & Lists
*   **Constraint:** Forbid the use of horizontal divider lines.
*   **Separation:** Use a vertical spacing of `spacing-6` (1.5rem) between cards.
*   **Structure:** Title (`title-lg`), followed by a row of `label-md` metadata. Use `surface_container_lowest` as the card background to distinguish it from the dashboard's gray-wash background.

### Input Fields
*   **Style:** Minimalist underline or "Ghost Border" box. 
*   **Focus State:** The border transitions to `primary` blue with a 2px thickness. Helper text should use `label-sm` in `on_surface_variant`.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use white space as a structural element. If a section feels cluttered, increase the padding to `spacing-10` rather than adding a border.
*   **Do** use `tertiary` (#943700) sparingly for "Draft" or "Warning" states to provide a sophisticated warmth against the cool blues.
*   **Do** ensure all interactive icons have a minimum hit target of 44x44px, even if the icon itself is smaller.

### Don’t
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` (#131b2e) to maintain a premium, slate-toned depth.
*   **Don’t** use "Standard" shadows. If you can see the edge of the shadow, it is too dark.
*   **Don’t** use dividers between list items. Use the `surface_container` color shifts to signify the end of one item and the start of another.

---

## 7. Signature Layout Note: The Asymmetric Header
To break the "standard dashboard" feel, the main page header should be offset. The Page Title (`display-sm`) should sit at `spacing-12` from the left, while the primary "Create New" button should float in the top right with a `Glassmorphism` backing, creating a sense of depth and intentionality.```