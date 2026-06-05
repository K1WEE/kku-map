# Product

## Register

product

## Users

Incoming KKU freshmen and orientation-day visitors (parents, transfer students, event guests). They arrive on a sprawling campus they've never walked, often with patchy mobile signal and the phone in one hand under direct sunlight. Stress is moderate-to-high: they need to be at a specific place soon, and "where is EN04?" is the only question on their mind. Familiarity with map apps is universal but varies; the design cannot assume anyone reads a key or browses a legend.

## Product Purpose

KKU Maps answers one question fast: *where is this place on campus, and how do I get there?* The whole app is a search-and-fly tool wrapped around a single map view: type a building code or Thai nickname, the right place jumps under your thumb, the sheet shows what it is, and a single tap deep-links to Google Maps for turn-by-turn. Success looks like a freshman opening the app, finding their lecture hall, and closing it within fifteen seconds — without ever asking what a category chip means.

## Brand Personality

Calm, reassuring, quietly confident — a friendly senior who knows the campus and points the way without making a show of it. Voice is plain Thai with English where the official building code helps. Warmth comes from spacing, restraint, and a soft palette grounded in the KKU identity, not from illustrations or mascots. The product should feel like infrastructure that's been around for years, not a launch.

## Anti-references

- **Generic Bootstrap admin** — boxy cards, blue links, dense tables. No warmth, no identity.
- **Heavy SaaS marketing site** — gradient heroes, eyebrow kickers, glassmorphism, animated blobs. Wrong register entirely; this is a tool, not a landing page.
- **Thai government portal style** — text-heavy, dated typography, bureaucratic tone, tight cramped spacing. The default a Thai university site falls into and the one to actively resist.
- **Overly playful campus app** — cartoon mascots, neon stickers, comic-sans energy. Freshmen are adults arriving at university; treating them like children reads as condescending.

## Design Principles

1. **One question, one screen.** The map is the product. Search, filters, and the place sheet exist to answer "where is X?" — anything that doesn't serve that answer is removed, not styled.
2. **Familiar before clever.** Map-app conventions (bottom sheet, search-on-top, marker pins, deep-link to Google Maps) are the baseline. Don't invent new patterns; spend the design budget on doing the familiar ones better.
3. **Identity in the accent, not the chrome.** KKU's character lives in marker color, the search-bar lockup, type choice, and one or two small moments — not in the basemap or the surrounding shell. The map itself stays neutral so place markers can carry meaning.
4. **Built for the thumb under sun.** Primary controls (search input, filters, sheet actions) sit in the thumb-reachable strip; type and tap targets are sized for one-handed use; contrast holds outdoors on a phone screen at 50% brightness.
5. **Thai is primary, English supports.** Every label, microcopy, and error message reads naturally in Thai first. English (building codes, faculty names) appears where it's the lingua franca on campus, never as the default voice.

## Accessibility & Inclusion

- **Contrast for outdoor use.** Body and label contrast targeted above WCAG AA (≥4.5:1) on every overlay surface; large text ≥3:1. No light-gray secondary text on white — direct sunlight kills it.
- **Thai + Latin typography pairing.** Font stack must include a proper Thai face (Noto Sans Thai or equivalent) alongside its Latin counterpart, with matching x-height and weight; never rely on the system Thai fallback.
- **Reduced-motion respected.** Map fly-to and sheet transitions honor `prefers-reduced-motion`; map pan is replaced with an instant `setView`, sheet slide with a crossfade.
- **Thumb-reachable controls.** Critical interactions sit in the bottom 60% of the viewport; the top strip is for context, not action.
- **Keyboard and screen-reader paths.** The search input, filter chips, and sheet dialog are reachable and labeled; the dialog uses `role="dialog"` with `aria-modal` and traps focus while open.
