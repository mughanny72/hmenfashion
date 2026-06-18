/* =========================================================================
   OUTFIT BUNDLES — multi-part outfits with color/size choice per part
   ─────────────────────────────────────────────────────────────────────────
   Customer picks color (+size) for each included item (Suit, Shirt, Tie,
   Shoes, Belt, etc.), one fixed price for the whole outfit. Plugs into the
   existing cart + checkout — no changes needed to app.js or Stripe wiring.

   Admin: sidebar button "Outfit Bundles" (shows only when signed in as admin)
   Storage: localStorage key HMEN_BUNDLES_V1
========================================================================= */
(function () {
  const BUNDLES_LS_KEY = "HMEN_BUNDLES_V1";
  let BUNDLES = [];

  function loadBundles() {
    try {
      const raw = localStorage.getItem(BUNDLES_LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      BUNDLES = Array.isArray(arr) ? arr : [];
    } catch (_) {
      BUNDLES = [];
    }
  }
  function saveBundles() {
    try {
      localStorage.setItem(BUNDLES_LS_KEY, JSON.stringify(BUNDLES));
    } catch (_) {}
  }
  loadBundles();

  function esc(s) {
    return typeof escapeHtml === "function" ? escapeHtml(s) : String(s ?? "");
  }
  function fmtMoney(v) {
    return typeof money === "function" ? money(v) : ("$" + Number(v || 0).toFixed(2));
  }

  /* ---------- Render bundle cards into the existing Outfits grid ---------- */
  function renderBundleCards() {
    const grid = document.getElementById("productGrid");
    if (!grid || !BUNDLES.length) return;

    BUNDLES.forEach((b) => {
      const card = document.createElement("article");
      card.className = "card";
      const visual = b.image
        ? `<img class="pmedia" src="${esc(b.image)}" alt="${esc(b.title)}" loading="lazy" />`
        : "";
      const partsLine = (b.parts || []).map((p) => p.label).join(" + ");
      card.innerHTML = `
        <div class="pimg" role="button" tabindex="0" aria-label="Customize ${esc(b.title)}">${visual}</div>
        <div class="pbody">
          <div class="ptitle">${esc(b.title)}</div>
          <div class="pmeta">
            <span class="pill">Complete Outfit</span>
            <span class="price">${fmtMoney(b.price)}</span>
          </div>
          <div class="pdesc">${esc(partsLine)}</div>
          <div class="pactions">
            <button class="btn primary" type="button" data-bundle-open="${esc(b.id)}">Customize &amp; Add</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-bundle-open]").forEach((btn) => {
      btn.addEventListener("click", () => openBundleModal(btn.dataset.bundleOpen));
    });
  }

  /* Hook into the existing renderProducts so bundles always show alongside regular items */
  if (typeof renderProducts === "function") {
    const _origRenderProducts = renderProducts;
    window.renderProducts = function () {
      _origRenderProducts();
      renderBundleCards();
    };
  }

  /* ---------- Bundle customization modal (customer-facing) ---------- */
  function ensureBundleModal() {
    if (document.getElementById("bundleModal")) return;
    const m = document.createElement("div");
    m.className = "modal";
    m.id = "bundleModal";
    m.hidden = true;
    m.style.display = "none";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML = `
      <div class="modalcard">
        <button class="iconbtn modalclose" id="btnCloseBundle" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <h3 id="bmTitle" style="margin:0 0 6px;"></h3>
        <div class="price big" id="bmPrice" style="margin-bottom:10px;"></div>
        <div id="bmParts"></div>
        <div class="modalactions" style="margin-top:14px;">
          <button class="btn primary" id="bmAdd" type="button">Add to Cart</button>
        </div>
        <div class="hint" id="bmHint"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.querySelector("#btnCloseBundle").addEventListener("click", () => {
      if (typeof closeAllModals === "function") closeAllModals();
    });
  }

  let __currentBundleId = null;

  function openBundleModal(id) {
    const b = BUNDLES.find((x) => x.id === id);
    if (!b) return;
    ensureBundleModal();
    __currentBundleId = id;

    document.getElementById("bmTitle").textContent = b.title;
    document.getElementById("bmPrice").textContent = fmtMoney(b.price);

    const wrap = document.getElementById("bmParts");
    wrap.innerHTML = (b.parts || [])
      .map((p, i) => {
        const colorOpts = (p.colors || [])
          .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
          .join("");
        const sizeOpts = (p.sizes || [])
          .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
          .join("");
        return `
          <div class="group" style="margin-top:10px;">
            <div class="group-title">${esc(p.label)}</div>
            <div class="row">
              ${
                colorOpts
                  ? `<label class="lbl">Color
                <select class="select" data-part="${i}" data-field="color">${colorOpts}</select>
              </label>`
                  : ""
              }
              ${
                sizeOpts
                  ? `<label class="lbl">Size
                <select class="select" data-part="${i}" data-field="size">${sizeOpts}</select>
              </label>`
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");

    document.getElementById("bmHint").textContent = "";
    if (typeof openOnlyModal === "function") openOnlyModal("#bundleModal");
  }

  function addBundleToCart() {
    const b = BUNDLES.find((x) => x.id === __currentBundleId);
    if (!b) return;

    const wrap = document.getElementById("bmParts");
    const selections = (b.parts || []).map((p, i) => {
      const colorEl = wrap.querySelector(`[data-part="${i}"][data-field="color"]`);
      const sizeEl = wrap.querySelector(`[data-part="${i}"][data-field="size"]`);
      return {
        label: p.label,
        color: colorEl ? colorEl.value : "",
        size: sizeEl ? sizeEl.value : "",
      };
    });

    const summary = selections
      .map((s) => `${s.label}: ${s.color}${s.size ? "/" + s.size : ""}`)
      .join(", ");
    const price = Number(b.price || 0);

    if (typeof cart === "undefined" || typeof saveCart !== "function" || typeof renderCart !== "function") {
      console.error("Cart functions not found — app.js may not be loaded yet.");
      return;
    }

    cart.push({
      key: "BUNDLE_" + b.id + "_" + Date.now(),
      id: b.id,
      title: `${b.title} (${summary})`,
      category: "OUTFITS",
      size: "",
      qty: 1,
      price,
      unitAmount: Math.round(price * 100),
      selections,
      addedAt: Date.now(),
    });

    saveCart();
    renderCart();
    document.getElementById("bmHint").textContent = "Added to cart.";
    setTimeout(() => {
      if (typeof closeAllModals === "function") closeAllModals();
      document.getElementById("cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  }

  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "bmAdd") addBundleToCart();
  });

  /* ---------- Admin UI: create/edit/delete bundles ---------- */
  function ensureBundleAdminModal() {
    if (document.getElementById("bundleAdminModal")) return;
    const m = document.createElement("div");
    m.className = "modal";
    m.id = "bundleAdminModal";
    m.hidden = true;
    m.style.display = "none";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML = `
      <div class="modalcard admin-card">
        <button class="iconbtn modalclose" id="btnCloseBundleAdmin" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <h3 style="margin:0 0 4px;">Outfit Bundles</h3>
        <div class="muted tiny" style="margin-bottom:12px;">Complete outfits with color &amp; size choice per item, one fixed price.</div>

        <div id="bundleAdminList" style="margin-bottom:16px;"></div>

        <div style="border-top:1px solid rgba(255,255,255,.12);padding-top:14px;">
          <input type="hidden" id="baOrigId" />
          <label class="admin-lbl">Bundle ID (no spaces)
            <input id="baId" placeholder="OUTFIT_BUDGET" />
          </label>
          <label class="admin-lbl">Title
            <input id="baTitle" placeholder="Budget Outfit" />
          </label>
          <label class="admin-lbl">Price (USD, fixed for the whole outfit)
            <input id="baPrice" type="number" min="0" step="1" placeholder="250" />
          </label>
          <label class="admin-lbl">Image (optional)
            <input id="baImage" placeholder="./images/budget-outfit.jpg" />
          </label>

          <div style="margin-top:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px;">
            <div style="font-weight:900;margin-bottom:8px;">Add a Part</div>
            <input id="baPartLabel" placeholder="Part name, e.g. Suit" style="margin-bottom:8px;width:100%;" />
            <input id="baPartColors" placeholder="Colors, comma separated: Navy, Charcoal, Black" style="margin-bottom:8px;width:100%;" />
            <input id="baPartSizes" placeholder="Sizes, comma separated (optional): 38R, 40R, 42R" style="margin-bottom:8px;width:100%;" />
            <button class="btn" id="baAddPart" type="button">Add Part</button>
          </div>

          <div id="baPartsList" style="margin-top:10px;"></div>

          <div class="admin-actions" style="margin-top:14px;">
            <button class="btn primary" id="baSave" type="button">Save Bundle</button>
            <button class="btn ghost" id="baClear" type="button">Clear Form</button>
            <span class="muted tiny" id="baHint" style="margin-left:auto"></span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.querySelector("#btnCloseBundleAdmin").addEventListener("click", () => {
      if (typeof closeAllModals === "function") closeAllModals();
    });
    m.querySelector("#baAddPart").addEventListener("click", baAddPart);
    m.querySelector("#baSave").addEventListener("click", baSaveBundle);
    m.querySelector("#baClear").addEventListener("click", baClearForm);
  }

  let __bundleDraftParts = [];

  function baAddPart() {
    const label = (document.getElementById("baPartLabel").value || "").trim();
    if (!label) {
      document.getElementById("baHint").textContent = "Part name is required.";
      return;
    }
    const colors = (document.getElementById("baPartColors").value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const sizes = (document.getElementById("baPartSizes").value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    __bundleDraftParts.push({ label, colors, sizes });
    document.getElementById("baPartLabel").value = "";
    document.getElementById("baPartColors").value = "";
    document.getElementById("baPartSizes").value = "";
    renderDraftParts();
  }

  function renderDraftParts() {
    const wrap = document.getElementById("baPartsList");
    if (!wrap) return;
    if (!__bundleDraftParts.length) {
      wrap.innerHTML = `<div class="muted tiny">No parts added yet.</div>`;
      return;
    }
    wrap.innerHTML = __bundleDraftParts
      .map(
        (p, i) => `
      <div class="variant-mini" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.10);border-radius:14px;margin-bottom:6px;">
        <div>
          <b>${esc(p.label)}</b>
          <div class="muted tiny">Colors: ${esc(p.colors.join(", ") || "none")} ${
          p.sizes.length ? " • Sizes: " + esc(p.sizes.join(", ")) : ""
        }</div>
        </div>
        <button class="btn red" type="button" data-remove-part="${i}">Remove</button>
      </div>
    `
      )
      .join("");
    wrap.querySelectorAll("[data-remove-part]").forEach((btn) => {
      btn.addEventListener("click", () => {
        __bundleDraftParts.splice(Number(btn.dataset.removePart), 1);
        renderDraftParts();
      });
    });
  }

  function baClearForm() {
    document.getElementById("baOrigId").value = "";
    document.getElementById("baId").value = "";
    document.getElementById("baTitle").value = "";
    document.getElementById("baPrice").value = "";
    document.getElementById("baImage").value = "";
    __bundleDraftParts = [];
    renderDraftParts();
    document.getElementById("baHint").textContent = "";
  }

  function baSaveBundle() {
    const orig = (document.getElementById("baOrigId").value || "").trim();
    const id = (document.getElementById("baId").value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    const title = (document.getElementById("baTitle").value || "").trim();
    const price = Number(document.getElementById("baPrice").value || 0);
    const image = (document.getElementById("baImage").value || "").trim();

    if (!id || !title || !price || !__bundleDraftParts.length) {
      document.getElementById("baHint").textContent =
        "ID, Title, Price, and at least one Part are required.";
      return;
    }

    const data = { id, title, price, image, parts: __bundleDraftParts.map((p) => ({ ...p })) };

    if (orig) {
      const idx = BUNDLES.findIndex((b) => b.id === orig);
      if (idx >= 0) BUNDLES[idx] = data;
      else BUNDLES.push(data);
    } else {
      if (BUNDLES.some((b) => b.id === id)) {
        document.getElementById("baHint").textContent = "That ID already exists.";
        return;
      }
      BUNDLES.push(data);
    }

    saveBundles();
    baClearForm();
    renderBundleAdminList();
    try {
      renderProducts();
    } catch (_) {}
    document.getElementById("baHint").textContent = "Saved.";
  }

  function renderBundleAdminList() {
    const wrap = document.getElementById("bundleAdminList");
    if (!wrap) return;
    if (!BUNDLES.length) {
      wrap.innerHTML = `<div class="muted tiny">No outfit bundles yet.</div>`;
      return;
    }
    wrap.innerHTML = BUNDLES.map(
      (b) => `
      <div class="admin-row-item">
        <div class="admin-thumb">${b.image ? `<img src="${esc(b.image)}" alt="">` : ""}</div>
        <div class="admin-info">
          <div class="admin-row-title">${esc(b.title)}</div>
          <div class="muted tiny">$${b.price} • ${esc((b.parts || []).map((p) => p.label).join(" + "))}</div>
        </div>
        <div class="admin-rowbtns">
          <button class="btn ghost" data-edit-bundle="${esc(b.id)}" type="button">Edit</button>
          <button class="btn admin-del" data-del-bundle="${esc(b.id)}" type="button">Delete</button>
        </div>
      </div>
    `
    ).join("");
    wrap.querySelectorAll("[data-edit-bundle]").forEach((btn) => {
      btn.addEventListener("click", () => baEdit(btn.dataset.editBundle));
    });
    wrap.querySelectorAll("[data-del-bundle]").forEach((btn) => {
      btn.addEventListener("click", () => baDelete(btn.dataset.delBundle));
    });
  }

  function baEdit(id) {
    const b = BUNDLES.find((x) => x.id === id);
    if (!b) return;
    document.getElementById("baOrigId").value = b.id;
    document.getElementById("baId").value = b.id;
    document.getElementById("baTitle").value = b.title;
    document.getElementById("baPrice").value = b.price;
    document.getElementById("baImage").value = b.image || "";
    __bundleDraftParts = (b.parts || []).map((p) => ({ ...p }));
    renderDraftParts();
    document.getElementById("baHint").textContent = "Editing " + b.id;
  }

  function baDelete(id) {
    if (!confirm("Delete this outfit bundle?")) return;
    BUNDLES = BUNDLES.filter((b) => b.id !== id);
    saveBundles();
    renderBundleAdminList();
    try {
      renderProducts();
    } catch (_) {}
  }

  function openBundleAdmin() {
    if (typeof _adminIsAuthed === "function" && !_adminIsAuthed()) {
      if (typeof _adminLoginOpen === "function") _adminLoginOpen();
      return;
    }
    ensureBundleAdminModal();
    baClearForm();
    renderBundleAdminList();
    try {
      hideAllModals();
    } catch (_) {}
    const m = document.getElementById("bundleAdminModal");
    m.hidden = false;
    m.style.display = "grid";
    try {
      showOverlay(true);
    } catch (_) {}
  }

  /* Inject "Outfit Bundles" button next to Admin Panel, visible only when signed in */
  (function injectBundleAdminButton() {
    function tryInject() {
      const slot = document.querySelector(".side-bottom");
      if (!slot) return false;
      if (document.getElementById("btnOpenBundleAdmin")) return true;
      const btn = document.createElement("button");
      btn.id = "btnOpenBundleAdmin";
      btn.type = "button";
      btn.className = "btn ghost full";
      btn.textContent = "Outfit Bundles";
      btn.style.marginBottom = "8px";
      btn.addEventListener("click", openBundleAdmin);
      slot.insertBefore(btn, slot.firstChild);

      function refreshVis() {
        btn.style.display =
          typeof _adminIsAuthed === "function" && _adminIsAuthed() ? "" : "none";
      }
      refreshVis();
      setInterval(refreshVis, 1000);
      return true;
    }
    if (!tryInject()) {
      document.addEventListener("DOMContentLoaded", tryInject, { once: true });
    }
  })();

  /* Initial render in case renderProducts already ran before this script loaded */
  try {
    renderBundleCards();
  } catch (_) {}
})();
