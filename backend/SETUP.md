# USE Pack engine — setup (about 15 minutes, once)

The website sends each entry to a small Google Apps Script in your Google account. It saves the
video to Drive, reads it with the Gemini API, makes the USE Pack PDF, emails it to the visitor and
to you, and logs the entry in a Google Sheet.

## 1. Get a Gemini API key (it reads the videos)
1. Go to <https://aistudio.google.com/apikey> and sign in with the Google account you want to use.
2. Click **Create API key** and copy it. Keep it private.
   Note: the free tier has daily limits; for real traffic, turn on billing in Google AI Studio.

## 2. Create the script
1. Go to <https://script.google.com> and click **New project**. Name it **USE Pack engine**.
2. Delete the sample code in `Code.gs`, then paste in everything from `backend/Code.gs`. Click **Save**.
   Then, so the script only asks for the access it needs: **Project Settings** (gear icon) › tick **Show "appsscript.json" manifest file in editor**. Back in the Editor, open `appsscript.json`, replace everything in it with `backend/appsscript.json`, and click **Save**. (This keeps the permissions to Drive, the sheet, sending mail and web requests. Use an account without Advanced Protection: it blocks scripts like this one.)
3. In the function menu at the top choose **setup**, then click **Run**. Approve the permissions
   (Drive, Sheets, Gmail, external requests). This creates a **Making Knowledge Usable** folder in your
   Drive with **Uploads**, **USE Packs** and the **Entries** sheet.

## 3. Add your settings
**Project Settings** (gear icon) ▸ **Script properties** ▸ **Add script property**:

| Property | Value |
| --- | --- |
| `GEMINI_API_KEY` | the key from step 1 (required) |
| `OWNER_EMAIL` | where your copies go (default: info@oluwaseyiashiru.com) |
| `MODEL` | optional, default `gemini-2.5-flash` |
| `DAILY_LIMIT_PER_EMAIL` | optional, default `3` packs per email per day |

## 4. Publish it
1. **Deploy** ▸ **New deployment** ▸ type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and copy the **Web app URL**
   (it ends in `/exec`).
3. Paste that URL into `assets/js/config.js` on the website (or send it to Claude to do it):
   `window.OA_ENDPOINT = 'https://script.google.com/macros/s/…/exec';`

When you change `Code.gs` later: **Deploy** ▸ **Manage deployments** ▸ edit ▸ **New version**, so the
URL stays the same.

## What it can read
| Shared by the visitor | What happens |
| --- | --- |
| YouTube link (public) | Watched and listened to in full |
| Video or audio upload (up to 25 MB) | Saved to your Drive, then watched in full |
| Facebook, Instagram, TikTok or other links | Can't be opened automatically. The pack is made from their description, and it asks them to upload the video for a full read |

## Limits to know
- Gmail sends about 100 emails a day from a free account (each entry sends two: visitor and you).
- Each pack takes roughly 20–90 seconds; long videos take longer.
- Everything stays in your Google account. Visitors agree to this on the form before sending.

## 6. Switch on the $1 unlock (Paystack)

1. Create a free account at https://paystack.com and finish the business verification.
2. In Paystack, go to **Payments ▸ Payment Pages ▸ Create page**: a single payment page, amount **₦1,500** (or $1 if your account takes USD), name it "Unlock my full USE Pack".
3. In the page settings, set **Redirect after payment** to `https://seyidev-ops.github.io/oluwaseyiashiru/start.html`.
4. Copy the page link (it looks like `https://paystack.com/pay/...`) and send it to Claude, or paste it into `assets/js/config.js` as `window.OA_PAY = { link: 'https://paystack.com/pay/...' };`.
5. In Paystack, go to **Settings ▸ API Keys & Webhooks** and copy your **Live Secret Key**.
6. In Apps Script, **Project Settings ▸ Script properties ▸ Add**: `PAYSTACK_SECRET_KEY` = that secret key. Optionally `PAY_MIN_NGN` (default 1500) to set the lowest naira amount that counts as a valid unlock.

The secret key stays in Script Properties only. Never put it in the website code.

## 7. Deeper Systems ($5 a month)

1. In Paystack, **Products ▸ Plans ▸ Create plan**: "Deeper Systems", monthly, ₦7,500 (or $5).
2. **Payment Pages ▸ Create page ▸ Subscription**, choose that plan.
3. Set **Redirect after payment** to `https://seyidev-ops.github.io/oluwaseyiashiru/commit.html?plan=monthly`.
4. Send the page link to Claude. New members appear in a **Members** tab in your Sheet, and both of you get an email.
