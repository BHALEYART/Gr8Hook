# Gr8 Hook

Marketing website for **Gr8 Hook** — [gr8hook.com](https://gr8hook.com).

Plain HTML, CSS and JS. No build step. Hosted on GitHub Pages.

## Pages
Each page is a folder with its own `index.html`, giving clean URLs (`gr8hook.com/about/`). Links between pages are relative, so the site works on the custom domain and on a `github.io` preview URL.

| File | URL | Page |
| --- | --- | --- |
| `index.html` | `/` | Home |
| `about/index.html` | `/about/` | About |
| `services/index.html` | `/services/` | Services (8 services, each with its own `#anchor`) |
| `work/index.html` | `/work/` | Portfolio / case studies |
| `contact/index.html` | `/contact/` | Contact form + booking section (`#book`) |
| `privacy/index.html` | `/privacy/` | Privacy policy (template) |
| `404.html` | — | Not-found page |

## Brand
- Navy `#0F1B2D` · Coral `#FF5A36` · Mist `#EEF0F3` · Slate `#4A5568`
- Headings: Sora · Body: Manrope (Google Fonts)
- Colors live as CSS variables at the top of `css/style.css`.

## Placeholders to fill in
Search the project for `[` to find them all:
- Stats on the home page (`[XX]+` etc.)
- Testimonials, project images and case studies
- Photo of Brandon (home + about)
- Phone number, city/state
- Social links (`href="#"` in the footer)
- Contact form: replace `YOUR_FORM_ID` in `contact/index.html` with a Formspree form ID (or point it at a GoHighLevel form)
- Booking calendar embed in `contact/index.html#book`
- Privacy policy date and review

## SEO
- Every page has its own title, meta description, canonical URL, Open Graph and Twitter card tags.
- JSON-LD schema per page: `ProfessionalService` + `WebSite` on all pages, plus `AboutPage` + `Person` (About), an `ItemList` of all 8 `Service`s (Services), `CollectionPage` (Work), `ContactPage` (Contact), and `BreadcrumbList` on inner pages.
- `robots.txt`, `sitemap.xml` (update `lastmod` when pages change), `site.webmanifest`.
- Share image `assets/og-image.png` (1200×630), `assets/apple-touch-icon.png`, `assets/logo.png`.
- 404 page is `noindex`.
- Once you have them, add `telephone`, `address` and social `sameAs` links to the `ProfessionalService` block in each page's schema, and keep them matching your Google Business Profile.
- After launch: submit `https://gr8hook.com/sitemap.xml` in Google Search Console and check pages with Google's Rich Results Test.

## Deploy (GitHub Pages + custom domain)
1. Push to `main`.
2. Repo **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main` / root.
3. The `CNAME` file already contains `gr8hook.com`.
4. At your domain registrar, add DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `bhaleyart.github.io`
5. Back in **Settings → Pages**, tick **Enforce HTTPS** once the certificate is issued.
