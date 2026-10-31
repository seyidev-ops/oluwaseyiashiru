# oluwaseyiashiru.com

Personal website of Oluwaseyi Ashiru — Making Knowledge Usable.

A static site (HTML, CSS, vanilla JS), served by GitHub Pages. No build step.

- `index.html` — the page
- `start.html`, `commit.html`, `about.html` — the run-through, the next-level commitment and About
- `assets/css/`, `assets/js/` — styles, the living knowledge field (`core.js`) and each page's script
- `assets/img/` — approved logo exports, icons and portrait (from the brand package)

Brand rules: see the Oluwaseyi Ashiru Brand Guidelines (v1.0). Never redraw or recolour the logo.

## USE Pack engine

`backend/` holds the Google Apps Script that turns each Start-page entry into a USE Pack (Drive, Sheet, Gemini, PDF, email). Setup: `backend/SETUP.md`. The site switches it on when `assets/js/config.js` has the web app URL.

## SEO

- `sitemap.xml` lists the public pages (edit it by hand when a page is added); `robots.txt` points to it.
- `googlef394f795304cbe59.html` is the Google Search Console ownership file. Keep it in the root.
- Each public page carries a canonical URL, Open Graph and Twitter tags (absolute `og-image.jpg`); `index.html` also has Person/WebSite JSON-LD.
