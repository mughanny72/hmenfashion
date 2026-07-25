# How to Edit Your Site — Outfits, Pictures & Videos

Two ways to manage your site:

1. **Admin Panel (no code)** — sign in, click buttons. Best for day-to-day adding/deleting outfits.
2. **Edit the files** — for photos in `/images`, videos in `/videos`, and structural changes.

---

## Quickest path: use the Admin Panel

1. Open the site (`index.html`) in your browser.
2. In the **left sidebar**, click **"Admin Login"** (or press **Ctrl/Cmd + Shift + A**).
3. **First time:** you'll be asked to **create an admin password**. Pick one you'll remember — it stays in this browser.
4. Sign in. The sidebar now shows **"Admin Panel"** and **"Log out"**.
5. Click **Admin Panel** to:
   - **All Outfits** — see every outfit, click **Edit** or **Delete**.
   - **Add / Edit** — fill out a form (title, price, category, image, video) → Save.
6. Changes save instantly to your browser and survive reloads.
7. Click **Export JSON** any time to download a backup of all your outfits.
8. Click **Log out** when you're done — the panel disappears.

> The password is hashed (SHA-256) before storing. To start over, sign in screen has a "Forget password" link that wipes it on this browser.

---

---

## Folder Map (where things live)

```
hmenfashion/
├── index.html        ← page structure (lookbook, sections, footer)
├── app.js            ← THE PRODUCT LIST lives here (line ~134)
├── style.css         ← colors, sizes, layout
├── images/           ← drop product photos and logo here (.jpg, .png, .webp)
└── videos/           ← drop product / lookbook videos here (.mp4)
```

---

## 1. Add a New Outfit

Open **`app.js`** and find the line that says `const PRODUCTS = [` (around line 134).

Inside the `[ ... ]` you'll see blocks like this:

```js
{
  id: "SUIT_NAVY",
  title: "Classic Navy Suit Set",
  category: "SUITS",
  subcat: "SUIT_BUSINESS",
  price: 249,
  desc: "Clean silhouette, versatile navy tone. Perfect for work, weddings, and events.",
  bg: "linear-gradient(135deg, ...)"
},
```

**To add an outfit**, copy a block, paste it inside the array, and change the values:

```js
{
  id: "TUX_BLACK_VELVET",
  title: "Black Velvet Tuxedo",
  category: "SUITS",
  subcat: "TUX_VELVET",
  price: 329,
  desc: "Statement evening piece. Soft velvet, sharp tailoring.",
  image: "./images/tux-velvet.jpg"
},
```

### Field cheat-sheet

| Field | Required? | What it does |
|---|---|---|
| `id` | yes | Unique label (UPPERCASE, no spaces). Used internally. |
| `title` | yes | Shown on the card |
| `category` | yes | Must be one of: `SUITS`, `CASUAL`, `SHOES`, `ACCESSORIES` |
| `subcat` | yes | Sub-category key (see existing list — e.g. `SUIT_BUSINESS`, `SHOES`, `ACCESSORIES`) |
| `price` | yes | Number only, no `$` (e.g. `249`) |
| `desc` | yes | One-line description on the card |
| `image` | no | Path to a photo: `"./images/your-file.jpg"` |
| `video` | no | Path to a clip: `"./videos/your-file.mp4"` |
| `bg` | no | CSS gradient — fallback if no image/video |

> If you provide both, **video** wins, then **image**, then **bg**.

---

## 2. Delete an Outfit

In `app.js`, find the block for the outfit and delete the entire `{ ... },` — including the trailing comma.

**Before:**
```js
  {
    id: "BELT_BLACK",
    title: "Slim Black Belt",
    ...
  }
```

**After:** *(just gone)*

> Tip: delete from top-to-bottom carefully — don't leave a dangling `,` before the closing `]`.

---

## 3. Add a Picture to an Outfit

1. Save your photo into the **`images/`** folder. Example: `images/suit-navy.jpg`
2. Open **`app.js`**, find the outfit block.
3. Add this line inside the block:

```js
image: "./images/suit-navy.jpg",
```

Save. Reload the site. Done.

**Recommended photo size:** 800×600 px or larger, JPG/PNG/WEBP, under 500 KB.

---

## 4. Add a Video to an Outfit

1. Save your `.mp4` into the **`videos/`** folder. Example: `videos/suit-navy.mp4`
2. In **`app.js`**, add this line inside the outfit block:

```js
video: "./videos/suit-navy.mp4",
```

The card will autoplay it muted on loop — no controls, looks cinematic.

**Recommended:** under 5 MB, 5–15 seconds, 1280×720, .mp4 (H.264).

---

## 5. Add Videos to the Lookbook (the big slideshow)

The Lookbook has 4 slides: Business, Wedding, Casual, Evening.

1. Drop 4 videos into `videos/` named:
   - `business.mp4`
   - `wedding.mp4`
   - `casual.mp4`
   - `evening.mp4`
2. Open **`index.html`**.
3. For each slide you'll see a commented-out line like:
   ```html
   <!-- <video class="look-video" src="./videos/business.mp4" autoplay loop muted playsinline></video> -->
   ```
4. **Remove the `<!--` and `-->`** to enable it:
   ```html
   <video class="look-video" src="./videos/business.mp4" autoplay loop muted playsinline></video>
   ```

Reload. Each slide now plays your video as a cinematic background.

---

## 6. Change the Logo

Replace `images/logo-hmf-gold.png` with your new logo (keep the same filename, or update the `src` in `index.html`).

---

## 7. Change Text on the Page (titles, taglines, footer)

Open **`index.html`** and search for the text. Change it. Save. Reload.

Examples:
- Brand tagline → search for `Affordable Luxury • Smart Value`
- Page title → search for `<title>` (line 6)
- Footer "About" text → search for `We focus on men's essentials`

---

## 8. Add a New Lookbook Slide

In `index.html`, find a slide block (`<article class="look-slide" ...>`), copy it, paste below, and:
- Change `data-look="..."` to a new name
- Change `data-index="..."` to the next number (currently last is `3`, so use `4`)
- Update the title, description, and key-piece button
- Add a matching `<button class="look-dot" ...>` at the bottom of the section

---

## 9. Test Before Going Live

Open `index.html` directly in your browser (double-click the file) — that's it. No server needed.

If something looks broken, the most common causes are:
- Missing comma between outfit blocks in `app.js`
- Wrong image/video filename or wrong folder
- Forgot to remove `<!--` / `-->` around the video tag

Open the browser **Developer Console** (right-click → Inspect → Console) — any error tells you the line.

---

## Quick Recap

| I want to… | File | Action |
|---|---|---|
| Add an outfit | `app.js` | Copy a `{ ... }` block, change values |
| Delete an outfit | `app.js` | Delete the `{ ... },` block |
| Add a photo | `images/` + `app.js` | Save file, add `image: "./images/..."` |
| Add a video | `videos/` + `app.js` | Save file, add `video: "./videos/..."` |
| Add lookbook video | `videos/` + `index.html` | Save file, uncomment `<video>` line |
| Change page text | `index.html` | Find & replace |

That's it. The site does the rest automatically.
