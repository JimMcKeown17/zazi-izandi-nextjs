# Styling & Theme

All custom theming is defined in `app/globals.css` using Tailwind CSS v4's `@theme` directive.

## Brand Colors (CSS Custom Properties)

```css
--color-primary: #2c5aa0        /* Primary blue */
--color-primary-50: #f0f5fc     /* Lightest */
--color-primary-100 – 600       /* Full palette */
--color-primary-700: #2c5aa0    /* Same as primary */
--color-primary-800: #2a4d85
--color-primary-900: #27426b    /* Darkest */

--color-accent-yellow: #ffd641  /* Brand yellow — accents, CTAs */
--color-accent-red: #e74c3c     /* Alerts, emphasis */
```

Usage: `text-primary`, `bg-primary-100`, `border-accent-yellow`, etc.

## Fonts

| Variable | Font | Usage |
|----------|------|-------|
| `--font-family-sans` | Roboto | Headings, UI elements |
| `--font-family-body` | Open Sans | Default body text |

Loaded via `next/font/google` in `app/layout.tsx` as `--font-roboto` and `--font-open-sans`.

## Custom CSS Classes

| Class | Purpose |
|-------|---------|
| `.container` | Responsive centered container (max `80rem`, responsive padding) |
| `.section-heading` | Blue heading — `1.875rem` mobile, `2.25rem` desktop |
| `.section-subheading` | Gray subtitle — `1.125rem` mobile, `1.25rem` desktop |
| `.btn-primary` | Blue button with shadow and hover |
| `.btn-secondary` | Yellow button with shadow and hover |
| `.video-background` | Full-screen video positioning (used in hero) |
| `.overlay` | Dark overlay (`rgba(0,0,0,0.5)`) |
| `.overlay-light` | Light overlay (`rgba(255,255,255,0.9)`) |

## Animations

| Class | Effect |
|-------|--------|
| `.animate-fadeIn` | Fade in + slide up (0.6s) |
| `.animate-slideInLeft` | Slide from left (0.6s) |
| `.animate-slideInRight` | Slide from right (0.6s) |
| `.animate-on-scroll` | Initially hidden; add `.animated` class to reveal (used with JS scroll observers) |

## Global Defaults

- `html`: `scroll-behavior: smooth`
- `section`: `py-16` (mobile), `py-20` (tablet+)
- Custom scrollbar: primary blue thumb

The bare `section` rule is public-page marketing spacing, not dashboard-card
spacing. Operational components under `/mobile-app/*` and `/pm/*` must not use
a bare `<section>` as a compact panel root: the global rule adds `4rem` of
vertical padding on mobile and `5rem` at tablet widths, independently of the
panel's Tailwind `p-*` class. Use a `<div>` with `role="region"` and an
`aria-labelledby` heading when named-region semantics are needed, or explicitly
neutralize the global spacing when a semantic `<section>` is essential. Add a
render/source regression assertion for compact operational panels so this
marketing-to-dashboard style leak is caught before visual review.
