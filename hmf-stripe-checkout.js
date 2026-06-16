/* H MEN'S FASHION — STRIPE CHECKOUT SAFE FIX */
(function () {
  const CART_KEY = "hmfCart";
  let checkoutRunning = false;

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function normalizeCart(cart) {
    return cart.map((item) => ({
      id: item.id || "",
      cartKey: item.cartKey || "",
      styleNumber: item.styleNumber || "",
      name: item.name || "H Men's Fashion item",
      price: Number(item.price || 0),
      qty: Math.max(1, Number(item.qty || 1)),
      productMode: item.productMode || "",
      itemType: item.itemType || "",
      suitSize: item.suitSize || "",
      shirtSize: item.shirtSize || "",
      pantsSize: item.pantsSize || "",
      shoeSize: item.shoeSize || "",
      beltSize: item.beltSize || "",
      color: item.color || "",
      fit: item.fit || "",
      image: item.image || ""
    }));
  }

  function setHint(message) {
    const hint = document.getElementById("cartHint");
    if (hint) hint.textContent = message;
    else alert(message);
  }

  function prepareButton() {
    const btn = document.getElementById("btnCheckout");
    if (!btn || checkoutRunning) return;

    btn.disabled = false;
    btn.removeAttribute("disabled");

    if (!btn.dataset.hmfStripeReady) {
      btn.dataset.hmfStripeReady = "1";
      btn.addEventListener("click", startCheckout);
    }
  }

  async function startCheckout(e) {
    if (e) e.preventDefault();

    const btn = document.getElementById("btnCheckout");
    const cart = normalizeCart(getCart());

    if (!cart.length) {
      setHint("Your cart is empty.");
      prepareButton();
      return;
    }

    const badItem = cart.find((item) => !item.price || item.price <= 0);
    if (badItem) {
      setHint("One cart item has an invalid price. Remove it and add it again.");
      prepareButton();
      return;
    }

    try {
      checkoutRunning = true;

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Opening secure checkout...";
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ cart })
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        throw new Error("Checkout API response is not JSON.");
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || data.message || "Could not create checkout session.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("HMF checkout error:", err);
      checkoutRunning = false;

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Checkout Securely";
      }

      setHint("Checkout error. Check Terminal for Stripe/API message.");
    }
  }

  function init() {
    prepareButton();

    // Some cart scripts redraw the button. This light timer reconnects it safely.
    setInterval(prepareButton, 800);

    // Delegated backup click, without MutationObserver.
    if (!window.__HMF_SAFE_STRIPE_DELEGATE__) {
      window.__HMF_SAFE_STRIPE_DELEGATE__ = true;
      document.addEventListener("click", function (e) {
        const btn = e.target.closest && e.target.closest("#btnCheckout");
        if (!btn) return;
        if (btn.dataset.hmfStripeReady) return;
        startCheckout(e);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
