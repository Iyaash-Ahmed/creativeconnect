# Images to replace

Every image on the site currently uses a **Picsum placeholder**
(`https://picsum.photos/seed/<name>/<w>/<h>`). To use your own photo, drop a
file named `<slot>.jpg` into `assets/img/` and change that image's `src` from
the Picsum URL to `assets/img/<slot>.jpg`. Each `<img>` has a matching
`data-slot="<name>"` attribute and an HTML comment (`<!-- REPLACE: ... -->`)
right above it so you can find it fast.

Keep the **same width/height ratio** as listed to avoid layout shift. JPGs
around 70–80% quality are a good balance of quality and speed. Aim to keep each
file under ~300 KB for a good mobile Lighthouse score.

| Slot | Page | Section | Recommended size | Ideal photo |
|------|------|---------|------------------|-------------|
| `hero` | index.html | Hero background | 1920 × 1080 | A cinematic, golden-hour wide shot — beach wedding, couple, or resort. Works dark so the white headline stays readable. |
| `package-essentials` | index.html + booking.html | Packages | 600 × 400 | Clean, simple single-subject photo that reads as an entry-level shoot (portrait or small event). |
| `package-story` | index.html + booking.html | Packages (most popular) | 600 × 400 | Your strongest, most emotive image — this is the highlighted card. |
| `package-brand` | index.html + booking.html | Packages | 600 × 400 | A polished brand / product / commercial-looking frame. |
| `wedding-1` | index.html | Work (Weddings & Events) | 1200 × 1200 | Beach wedding ceremony, wide or medium. |
| `wedding-2` | index.html | Work (Weddings & Events) | 1200 × 1200 | Couple portrait by the water. |
| `wedding-3` | index.html | Work (Weddings & Events) | 1200 × 1200 | Event / celebration with guests. |
| `brand-1` | index.html | Work (Brand & Product) | 1200 × 1200 | Resort or lifestyle brand shot. |
| `brand-2` | index.html | Work (Brand & Product) | 1200 × 1200 | Product flat-lay or styled still life. |
| `brand-3` | index.html | Work (Brand & Product) | 1200 × 1200 | Interior / café / venue brand photography. |
| `portrait-1` | index.html | Work (Portraits) | 1200 × 1200 | Graduation or outdoor portrait. |
| `portrait-2` | index.html | Work (Portraits) | 1200 × 1200 | Studio headshot on a dark background. |
| `portrait-3` | index.html | Work (Portraits) | 1200 × 1200 | Family / group portrait. |
| `about` | (optional) | Behind-the-scenes | 1200 × 800 | Behind-the-scenes of the team shooting — handheld, candid. Not yet placed in a section; drop it in wherever you add an About block. |
| `og-image` | all pages | Social share (Open Graph / Twitter) | 1200 × 630 | Branded share image with the CreativeConnect wordmark over a strong photo. This is what shows when the link is shared. |

## Portfolio full-size images (lightbox)

Each portfolio thumbnail opens a larger version in the lightbox. The thumbnail
uses a 600 × 600 crop and the lightbox uses a 1200 × 1200 version of the **same
seed** (set in the `data-full` attribute on each `.portfolio-item` button). When
you swap in a real photo, update **both** the thumbnail `src` and the button's
`data-full` to point at your image (a single 1200 × 1200 file works for both).

## Optional hero background video

The hero can play a muted background video instead of a still. In `index.html`
there's a commented-out `<video>` block inside `.hero__media`:

- Add `assets/img/hero.mp4` (H.264, muted, ~1080p, a few seconds, looping).
- Keep `assets/img/hero.jpg` as the `poster` so there's an instant first frame.
- Uncomment the `<video>` block. Keep `muted autoplay loop playsinline` so it
  autoplays on mobile. Under `prefers-reduced-motion`, consider leaving it as
  the still image only.
