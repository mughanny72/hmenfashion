H Men's Fashion — Stripe Checkout Update

COPY THESE FILES
- api/create-checkout-session.js  -> put inside your api folder
- hmf-stripe-checkout.js          -> put in the main website folder
- success.html / cancel.html      -> optional replace

ADD THIS SCRIPT TO INDEX.HTML
At the bottom, after hmf-products-addon.js:

<script src="./hmf-stripe-checkout.js"></script>

Example:
<script src="./app.js"></script>
<script src="./hmf-products-addon.js"></script>
<script src="./hmf-stripe-checkout.js"></script>
</body>
</html>

PACKAGE
Your package.json must include stripe:
"stripe": "^19.0.0"

If missing, run:
npm install stripe

VERCEL ENVIRONMENT VARIABLES
STRIPE_SECRET_KEY = sk_test_...
SITE_URL = https://your-domain.com

IMPORTANT
This is real Stripe Checkout after Vercel deployment and Stripe keys.
For public live mode, prices should be validated server-side from a database or server product list.
