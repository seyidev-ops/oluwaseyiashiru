<p align="center">
  <a href="https://oluwaseyiashiru.com"><img src="assets/brand/linkedin-cover.png" alt="Oluwaseyi Ashiru, Applied Learning Designer. I help people act on what they know. oluwaseyiashiru.com" width="100%"></a>
</p>

<h1 align="center">oluwaseyiashiru.com</h1>

<p align="center">
  <b>Oluwaseyi Ashiru · Applied Learning Designer</b><br>
  <i>Turning knowing into doing.</i>
</p>

<p align="center">
  <a href="https://oluwaseyiashiru.com">Website</a> ·
  <a href="https://oluwaseyiashiru.com/start.html">Act on it</a> ·
  <a href="https://oluwaseyiashiru.com/about.html">About</a> ·
  <a href="https://oluwaseyiashiru.com/speak.html">Speaking</a> ·
  <a href="https://oluwaseyiashiru.com/dothis">DO THIS</a>
</p>

---

> **Information is what you hear. Learning is what you do about it.**

I help people act on what they know. This repository is the personal website behind that work: a static site (HTML, CSS, vanilla JavaScript) served by GitHub Pages, with no build step.

> *"But prove yourselves doers of the word, and not merely hearers who delude themselves."*
> James 1:22 (NASB 1995)

## The USE method

Every tool on the site follows three steps.

| | Step | What it means |
|---|---|---|
| **U** | Understand it | Find what the teaching actually says. |
| **S** | Simplify it | Cut it down to the next clear step. |
| **E** | Execute it | Do it, and keep the evidence. |

## What lives here

| Page | Purpose |
|---|---|
| `index.html` | Home |
| `start.html` | **Act on it**: one question at a time, ending in an Action Card and a USE Pack |
| `commit.html` | The next level: Deeper Systems and Inner Circle |
| `roast.html`, `roast-room/` | Roast Room: a council of simulated advisors debates a business decision |
| `speak.html` | Speaking enquiries |
| `dothis/` | DO THIS: a free, sponsor-funded event |
| `about.html` | About Oluwaseyi |
| `privacy.html`, `terms.html` | Privacy and terms (visitors consent before any data is stored) |

```
assets/
  css/     styles for each page
  js/      the living knowledge field (core.js) and each page's script
  img/     approved logo exports, icons and portrait
  brand/   approved social covers (LinkedIn, Facebook)
backend/   Google Apps Script USE Pack engine
```

## USE Pack engine

`backend/` holds the Google Apps Script that turns each Start entry into a USE Pack (Drive, Sheet, Gemini, PDF, email). Setup steps are in `backend/SETUP.md`. The site switches it on when `assets/js/config.js` has the web app URL. Keys live in Script Properties, never in this public repository.

## Brand

| | |
|---|---|
| Title | Applied Learning Designer |
| Logo line | Turning knowing into doing |
| Statement | Information is what you hear. Learning is what you do about it. |
| Colours | Navy `#14213D` · Warm white `#F7F5F0` · Gold `#D4A24C` · Slate `#5A6275` |
| Type | Fraunces (headings) · Montserrat (text) |

Use only the approved logo exports in `assets/img/`. Never redraw or recolour the logo.

## SEO

- `sitemap.xml` lists the public pages (edit it by hand when a page is added); `robots.txt` points to it.
- `googlef394f795304cbe59.html` is the Google Search Console ownership file. Keep it in the root.
- Each public page carries a canonical URL, Open Graph and Twitter tags (absolute `og-image.jpg`); `index.html` also has Person/WebSite JSON-LD.

## Contact

[info@oluwaseyiashiru.com](mailto:info@oluwaseyiashiru.com) · WhatsApp [+234 703 313 4979](https://wa.me/2347033134979)

<p align="center"><sub>© Oluwaseyi Ashiru · Doing under God</sub></p>
