/* H MEN'S FASHION — LIVE SHIPPING RATES (USPS/UPS via Shippo)
   Injects an address form + live rate picker into the cart section.
   Checkout stays disabled until a shipping rate is selected.
   Selected rate is saved to localStorage and read by hmf-stripe-checkout.js.
*/
(function () {
  const CART_KEY = "hmfCart";
  const SHIP_ADDR_KEY = "hmfShipAddress";
  const SHIP_RATE_KEY = "hmfShippingRate";

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function injectWidget() {
    const cartbox = document.querySelector("#cart .cartbox");
    if (!cartbox || document.getElementById("hmfShippingBox")) return;

    const footer = cartbox.querySelector(".cartfooter");
    const box = document.createElement("div");
    box.id = "hmfShippingBox";
    box.className = "hmf-shipping-box";
    box.innerHTML = `
      <h3 class="hmf-ship-title">Shipping (US only)</h3>
      <div class="hmf-ship-grid">
        <input type="text" id="shipName" placeholder="Full name" autocomplete="name">
        <input type="text" id="shipStreet1" placeholder="Street address" autocomplete="address-line1">
        <input type="text" id="shipStreet2" placeholder="Apt / Suite (optional)" autocomplete="address-line2">
        <input type="text" id="shipCity" placeholder="City" autocomplete="address-level2">
        <input type="text" id="shipState" placeholder="State (e.g. PA)" autocomplete="address-level1" maxlength="2">
        <input type="text" id="shipZip" placeholder="ZIP code" autocomplete="postal-code" maxlength="10">
      </div>
      <button class="btn ghost" id="btnGetShipping" type="button">Get Shipping Rates</button>
      <div id="shipRatesList" class="hmf-ship-rates"></div>
      <div id="shipHint" class="hint"></div>
    `;

    if (footer) cartbox.insertBefore(box, footer);
    else cartbox.appendChild(box);

    restoreSavedAddress();
    document.getElementById("btnGetShipping").addEventListener("click", fetchRates);
    setCheckoutEnabled(false);
  }

  function restoreSavedAddress() {
    try {
      const saved = JSON.parse(localStorage.getItem(SHIP_ADDR_KEY) || "null");
      if (!saved) return;
      const map = {
        shipName: "name", shipStreet1: "street1", shipStreet2: "street2",
        shipCity: "city", shipState: "state", shipZip: "zip"
      };
      Object.entries(map).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el && saved[key]) el.value = saved[key];
      });
    } catch {}
  }

  function readAddress() {
    return {
      name: (document.getElementById("shipName")?.value || "").trim(),
      street1: (document.getElementById("shipStreet1")?.value || "").trim(),
      street2: (document.getElementById("shipStreet2")?.value || "").trim(),
      city: (document.getElementById("shipCity")?.value || "").trim(),
      state: (document.getElementById("shipState")?.value || "").trim().toUpperCase(),
      zip: (document.getElementById("shipZip")?.value || "").trim()
    };
  }

  function setHint(msg, isError) {
    const hint = document.getElementById("shipHint");
    if (!hint) return;
    hint.textContent = msg || "";
    hint.style.color = isError ? "#e35a5a" : "";
  }

  function setCheckoutEnabled(enabled) {
    const btn = document.getElementById("btnCheckout");
    if (!btn) return;
    if (enabled) {
      btn.removeAttribute("data-hmf-ship-locked");
    } else {
      btn.setAttribute("data-hmf-ship-locked", "1");
    }
  }

  async function fetchRates() {
    const cart = getCart();
    if (!cart.length) {
      setHint("Your cart is empty.", true);
      return;
    }

    const address = readAddress();
    if (!address.street1 || !address.city || !address.state || !address.zip) {
      setHint("Please fill in street, city, state, and ZIP.", true);
      return;
    }

    localStorage.setItem(SHIP_ADDR_KEY, JSON.stringify(address));
    localStorage.removeItem(SHIP_RATE_KEY);
    setCheckoutEnabled(false);

    const listEl = document.getElementById("shipRatesList");
    const btn = document.getElementById("btnGetShipping");
    btn.disabled = true;
    btn.textContent = "Getting rates...";
    setHint("");
    listEl.innerHTML = "";

    try {
      const res = await fetch("/api/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, address })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not get shipping rates.");
      }

      if (!data.rates || !data.rates.length) {
        setHint(data.message || "No shipping rates found for that address.", true);
        return;
      }

      renderRates(data.rates);
    } catch (err) {
      console.error("HMF shipping rate error:", err);
      setHint(err.message || "Could not get shipping rates.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Get Shipping Rates";
    }
  }

  function renderRates(rates) {
    const listEl = document.getElementById("shipRatesList");
    listEl.innerHTML = rates.map((r, i) => `
      <label class="hmf-ship-rate">
        <input type="radio" name="hmfShipRate" value="${i}">
        <span>${r.carrier} — ${r.service}${r.days ? ` (${r.days} day${r.days > 1 ? "s" : ""})` : ""}</span>
        <strong>$${r.amount.toFixed(2)}</strong>
      </label>
    `).join("");

    listEl.querySelectorAll('input[name="hmfShipRate"]').forEach((input) => {
      input.addEventListener("change", () => {
        const chosen = rates[Number(input.value)];
        localStorage.setItem(SHIP_RATE_KEY, JSON.stringify(chosen));
        setHint(`Selected: ${chosen.carrier} ${chosen.service} — $${chosen.amount.toFixed(2)}`);
        setCheckoutEnabled(true);
      });
    });
  }

  function clearSavedShipping() {
    localStorage.removeItem(SHIP_ADDR_KEY);
    localStorage.removeItem(SHIP_RATE_KEY);
    ["shipName", "shipStreet1", "shipStreet2", "shipCity", "shipState", "shipZip"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const listEl = document.getElementById("shipRatesList");
    if (listEl) listEl.innerHTML = "";
    setHint("");
    setCheckoutEnabled(false);
  }

  function watchClearCartButton() {
    // The cart's own "Clear" button lives outside this widget (wired in app.js).
    // Hook it here too so clearing the cart also resets the shipping step.
    if (window.__HMF_SHIP_CLEAR_WIRED__) return;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest("#btnClearCart");
      if (btn) setTimeout(clearSavedShipping, 0);
    });
    window.__HMF_SHIP_CLEAR_WIRED__ = true;
  }

  function init() {
    injectWidget();
    watchClearCartButton();
    // Cart re-renders periodically elsewhere; keep the widget present.
    setInterval(injectWidget, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
