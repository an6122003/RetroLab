# Goal Description

Build a responsive, modern frontend for a technology news and review magazine (similar to Vat Vo Studio) with a focus on an engaging, pixel-perfect user interface and smooth interactions in both light and dark modes. The backend will integrate the existing Notion API logic ([notion.js](file:///h:/Coding%20Projects/blog-web/notion.js)).

## Proposed Changes

### Configuration Setup
#### [NEW] [package.json](file:///h:/Coding%20Projects/blog-web/package.json)
- Migrate the project to include Next.js (`next`), React (`react`, `react-dom`), Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`), Icons (`lucide-react`), Themes (`next-themes`), and Animation (`framer-motion`). Update scripts to use Next.js (`dev`, `build`, `start`).
#### [NEW] `tsconfig.json` & `tailwind.config.ts`
- Set up TypeScript and configure Tailwind with the customized design tokens from `ui-ux-pro-max` (Fonts: Inter/Roboto, Merriweather/Newsreader; Colors: deep tech grays like `zinc-950`).

### Global Architecture
#### [NEW] `src/app/layout.tsx` & `src/app/globals.css`
- Wrap the application in a `ThemeProvider` (from `next-themes`) for Light/Dark mode toggling.
- Define global CSS variables, typography imports, and utility classes based on the design system.
#### [NEW] `src/app/page.tsx`
- Build the Homepage layout including the Hero section (Bento grid style), Category Rows (4-column grid), and the Infinite Scroll Feed list.
#### [NEW] `src/components/ui/...`
- **Header**: Sticky navigation with backdrop blur, logo, category links, Search Icon, Theme Toggle, and a mobile hamburger menu triggering a slide-out drawer.
- **Footer**: Standard footer layout.
- **Cards**: `FeaturedCard` (large, background image), `GridCard` (medium, 16:9 thumbnail), and `ListCard` (compact, horizontal).
- **CategoryBadge**: Small rounded pills with distinct colors.
- **SearchModal**: Full-screen or centered overlay with an input field and instant mock search results.

### Data Mocking & Integration
#### [NEW] `src/lib/mockData.ts`
- Array of 10 robust mock articles simulating the Notion API payload, complete with fake tags, titles, dates, excerpts, and Unsplash image URLs. This allows the UI to be developed perfectly before fully wiring up [notion.js](file:///h:/Coding%20Projects/blog-web/notion.js).

## Verification Plan

### Automated Tests
- Run `npm run lint` and `npm run build` to ensure the Next.js scaffold compiles without errors and strictly follows the React 18+ App Router conventions.

### Manual Verification
- Launch the development server (`npm run dev`) and manually inspect the following:
  - **Light/Dark Mode toggle**: Verify elements transition correctly and dark mode uses `zinc-950` instead of pure black.
  - **Responsive Layout**: Resize the browser to ensure the Hero bento grid stacks on mobile, and the Header successfully converts to a mobile drawer.
  - **Interactions**: Confirm that hover-zoom effects on images and sticky backdrop blurs perform smoothly without layout shifts.
  - **Typography**: Check that the UI uses Inter/Roboto, and the prose areas use a serif font.
