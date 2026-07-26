H Men's Fashion — Payment + Live Shipping Setup (2026-07-26)

WHAT WAS BUILT
- Stripe Checkout was already wired up (api/create-checkout-session.js).
- NEW: live USPS/UPS shipping rates, quoted per order based on real cart
  weight + the customer's address, using Shippo (goshippo.com).
- Customer flow: fill cart -> enter shipping address in the Cart section ->
  click "Get Shipping Rates" -> pick a rate -> "Checkout Securely" (locked
  until a rate is chosen) -> Stripe Checkout charges cart total + the exact
  quoted shipping price.

NEW FILES
- api/shipping-rates.js   Calls Shippo, returns live rate options.
- hmf-shipping.js         Injects the address form + rate picker into the
                          cart section on the live site.

CHANGED FILES
- api/create-checkout-session.js   Now requires a selected shippingRate and
                                    charges that exact amount via Stripe
                                    shipping_options.
- hmf-stripe-checkout.js           Blocks checkout until a shipping rate is
                                    selected; sends it to the API.
- app.js                           Added default package weights per
                                    category (SUITS/CASUAL/SHOES/ACCESSORIES)
                                    used to estimate shipping cost. Override
                                    any single product with `weightOz: 24`.
- index-live-backup.html           Added the shipping widget + script tag.
  (This is the full storefront, currently held back behind index.html's
  "coming soon" page — see GOING LIVE below.)
- style.css                        Styling for the new shipping widget.

---

STEP 1 — GET A SHIPPO API KEY (required, free)
1. Sign up at https://goshippo.com
2. Go to Settings -> API -> copy your Test token first, then your Live token
   once you're ready for real orders.
3. In Vercel: Project Settings -> Environment Variables -> add
     SHIPPO_API_KEY = shippo_test_...   (use the live key only after testing)
4. Redeploy.

USPS rates work out of the box on Shippo. For UPS rates, go to Shippo's
Settings -> Carrier Accounts and either connect your own UPS account or
enable Shippo's UPS account — otherwise the rate list will only show USPS.

STEP 2 — CONFIRM YOUR SHIP-FROM ADDRESS
api/shipping-rates.js has your store address hardcoded (Greensburg PA,
Westmoreland Mall). If you ship from somewhere else, edit the SHIP_FROM
block at the top of that file.

STEP 3 — TEST WITH STRIPE TEST KEYS FIRST (important)
Your Vercel env currently has a LIVE Stripe secret key (sk_live...). Before
testing checkout, temporarily switch STRIPE_SECRET_KEY (and
STRIPE_WEBHOOK_SECRET, if you re-point the webhook) to your Stripe TEST
keys from dashboard.stripe.com (toggle "Test mode" top-right, then
Developers -> API keys). Use Shippo's test token at the same time
(shippo_test_...) so no real charges or real shipping labels are created.

Test card: 4242 4242 4242 4242, any future expiry, any CVC, any ZIP.

Run through: add items to cart -> enter a real US address -> Get Shipping
Rates -> pick one -> Checkout Securely -> pay with the test card -> confirm
success.html shows the order and the amount includes shipping.

Only switch STRIPE_SECRET_KEY back to sk_live... (and SHIPPO_API_KEY back
to shippo_live_...) once that full run works.

STEP 4 — CONFIRM YOUR STRIPE ACCOUNT IS ACTIVATED FOR LIVE PAYMENTS
Log into https://dashboard.stripe.com (live mode) and check:
- No "complete your account" / restricted banner at the top.
- Settings -> Business settings shows your business details as verified.
- Settings -> Bank accounts and scheduling shows a bank account added for
  payouts.
If you see any warning banner, Stripe won't process real card charges (or
won't pay you out) until it's resolved.

STEP 5 — GOING LIVE
Once Steps 1-4 all check out, ask me to restore the full site: I'll copy
index-live-backup.html over index.html so visitors see the real store
instead of the "coming soon" page.

---

NOTES / LIMITATIONS
- Shipping is US-only for now (matches your current Stripe
  shipping_address_collection setting).
- Rate calculation uses one general apparel box size and per-category
  weight estimates, not a real per-item scale. Good enough for accurate
  USPS/UPS pricing; refine weights in app.js if a category is consistently
  off.
- If Shippo returns no rates for an address (rare — bad ZIP, no carrier
  account connected, etc.), the customer sees a message and checkout stays
  locked until they fix the address or you add a carrier account.
