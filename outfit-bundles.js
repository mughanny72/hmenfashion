/* =========================================================================
   OUTFIT BUNDLES — multi-part outfits with color/size choice per part
   ─────────────────────────────────────────────────────────────────────────
   Customer picks color (+size) for each included item (Suit, Shirt, Tie,
   Shoes, Belt, etc.), one fixed price for the whole outfit. Plugs into the
   existing cart + checkout — no changes needed to app.js or Stripe wiring.

   Admin: sidebar button "Outfit Bundles" (shows only when signed in as admin)
   - Click-to-select color & size chips (no typing required)
   - Real image upload (Choose File) or paste a path
   - Edit any saved part before re-adding it
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

  /* ===================== PRESET DATA ===================== */
  const PART_TYPES = ["Suit", "Jacket", "Shirt", "T-Shirt", "Pants", "Shoes", "Tie", "Belt", "Bowtie", "Vest", "Other"];

  const SIZE_PRESETS = {
    Suit: ["34S","36S","36R","38S","38R","38L","40S","40R","40L","42S","42R","42L","44S","44R","44L","46S","46R","46L","48S","48R","48L","50R","50L","52R","52L","54R","54L","56R","56L","58R","58L","60R","60L","62R","62L","64R","64L","66R","66L"],
    Jacket: ["34S","36S","36R","38S","38R","38L","40S","40R","40L","42S","42R","42L","44S","44R","44L","46S","46R","46L","48S","48R","48L","50R","50L","52R","52L","54R","54L","56R","56L","58R","58L","60R","60L","62R","62L","64R","64L","66R","66L"],
    Shirt: ["14.5/32","15.5/32","15.5/34","16.5/32","16.5/34","16.5/36","17.5/32","17.5/34","17.5/36","18.5/32","18.5/34","18.5/36","19/34","20/34","22/36","24/36"],
    "T-Shirt": ["XS","S","M","L","XL","2XL","3XL","4XL"],
    Pants: Array.from({ length: 17 }, (_, i) => String(28 + i * 2)),
    Shoes: ["7","7.5","8","8.5","9","9.5","10","10.5","11","11.5","12","13","14"],
    Vest: ["XS","S","M","L","XL","2XL","3XL"],
    Tie: [],
    Belt: ["S","M","L","XL"],
    Bowtie: [],
    Other: ["XS","S","M","L","XL","2XL"],
  };

  const COMMON_COLORS = ["Black","Navy","Charcoal","Grey","White","Beige","Brown","Burgundy","Red","Blue","Light Blue","Green","Olive","Tan","Silver","Mint"];

  /* ===================== Render bundle cards into the existing Outfits grid ===================== */
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

  if (typeof renderProducts === "function") {
    const _origRenderProducts = renderProducts;
    window.renderProducts = function () {
      _origRenderProducts();
      renderBundleCards();
    };
  }

  /* ===================== Customer-facing customization modal ===================== */
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
        const colorOpts = (p.colors || []).map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
        const sizeOpts = (p.sizes || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
        return `
          <div class="group" style="margin-top:10px;">
            <div class="group-title">${esc(p.label)}</div>
            <div class="row">
              ${colorOpts ? `<label class="lbl">Color<select class="select" data-part="${i}" data-field="color">${colorOpts}</select></label>` : ""}
              ${sizeOpts ? `<label class="lbl">Size<select class="select" data-part="${i}" data-field="size">${sizeOpts}</select></label>` : ""}
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
      return { label: p.label, color: colorEl ? colorEl.value : "", size: sizeEl ? sizeEl.value : "" };
    });

    const summary = selections.map((s) => `${s.label}: ${s.color}${s.size ? "/" + s.size : ""}`).join(", ");
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

  /* ===================== Admin UI ===================== */
  let __bundleDraftParts = [];
  let __partType = "Suit";
  let __partColors = [];
  let __partSizes = [];
  let __partImage = "";
  let __editingBundleOrigId = "";

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
      <div class="modalcard admin-card" style="max-width:920px;width:min(920px,94vw);max-height:88vh;overflow:auto;">
        <button class="iconbtn modalclose" id="btnCloseBundleAdmin" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <h3 style="margin:0 0 4px;">Outfit Bundles</h3>
        <div class="muted tiny" style="margin-bottom:12px;">Complete outfits with color &amp; size choice per item, one fixed price.</div>

        <div id="bundleAdminList" style="margin-bottom:16px;"></div>

        <div style="border-top:1px solid rgba(255,255,255,.12);padding-top:14px;">
          <input type="hidden" id="baOrigId" />
          <div class="row">
            <label class="admin-lbl">Bundle ID (no spaces)
              <input id="baId" placeholder="OUTFIT_BUDGET" />
            </label>
            <label class="admin-lbl">Title
              <input id="baTitle" placeholder="Budget Outfit" />
            </label>
          </div>
          <div class="row">
            <label class="admin-lbl">Price (USD, fixed for the whole outfit)
              <input id="baPrice" type="number" min="0" step="1" placeholder="250" />
            </label>
            <label class="admin-lbl">Bundle Cover Image (optional)
              <input id="baImageFile" type="file" accept="image/*" />
            </label>
          </div>
          <div id="baImagePreviewWrap" class="preview" style="min-height:0;margin-top:8px;display:none;">
            <img id="baImagePreview" style="max-height:120px;" />
          </div>

          <div style="margin-top:16px;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:14px;background:rgba(255,255,255,.03);">
            <div style="font-weight:950;font-size:18px;margin-bottom:10px;">Add a Part</div>

            <label class="admin-lbl">Part Type
              <select id="baPartType" class="select">
                ${PART_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
              </select>
            </label>

            <div class="group" style="margin-top:10px;">
              <div class="group-title">
                Colors for this part
                <button class="btn chip small red" type="button" id="baClearColors">Clear</button>
              </div>
              <div class="chips" id="baColorChips"></div>
              <div class="row" style="margin-top:8px;">
                <input id="baCustomColor" placeholder="Custom color, e.g. Olive" />
                <button class="btn" type="button" id="baAddCustomColor">Add Color</button>
              </div>
              <div class="selected" id="baColorsSelected">No colors selected.</div>
            </div>

            <div class="group" style="margin-top:10px;">
              <div class="group-title">
                Sizes for this part
                <button class="btn chip small red" type="button" id="baClearSizes">Clear</button>
              </div>
              <div class="chips" id="baSizeChips"></div>
              <div class="row" style="margin-top:8px;">
                <input id="baCustomSize" placeholder="Custom size" />
                <button class="btn" type="button" id="baAddCustomSize">Add Size</button>
              </div>
              <div class="selected" id="baSizesSelected">No sizes selected (fine for items like a tie).</div>
            </div>

            <div style="margin-top:14px;">
              <button class="btn gold" type="button" id="baAddPart">+ Add This Part</button>
              <span class="muted tiny" id="baPartHint" style="margin-left:10px;"></span>
            </div>
          </div>

          <div id="baPartsList" style="margin-top:14px;"></div>

          <div class="admin-actions" style="margin-top:14px;">
            <button class="btn primary" id="baSave" type="button">Save Bundle</button>
            <button class="btn ghost" id="baClear" type="button">Clear Everything</button>
            <span class="muted tiny" id="baHint" style="margin-left:auto"></span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.querySelector("#btnCloseBundleAdmin").addEventListener("click", () => {
      if (typeof closeAllModals === "function") closeAllModals();
    });

    m.querySelector("#baPartType").addEventListener("change", (e) => {
      __partType = e.target.value;
      __partSizes = [];
      renderColorChips();
      renderSizeChips();
    });

    m.querySelector("#baClearColors").addEventListener("click", () => {
      __partColors = [];
      renderColorChips();
    });
    m.querySelector("#baClearSizes").addEventListener("click", () => {
      __partSizes = [];
      renderSizeChips();
    });

    m.querySelector("#baAddCustomColor").addEventListener("click", () => {
      const el = document.getElementById("baCustomColor");
      const v = (el.value || "").trim();
      if (v && !__partColors.includes(v)) __partColors.push(v);
      el.value = "";
      renderColorChips();
    });
    m.querySelector("#baAddCustomSize").addEventListener("click", () => {
      const el = document.getElementById("baCustomSize");
      const v = (el.value || "").trim();
      if (v && !__partSizes.includes(v)) __partSizes.push(v);
      el.value = "";
      renderSizeChips();
    });

    m.querySelector("#baImageFile").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        __baBundleImage = reader.result;
        const wrap = document.getElementById("baImagePreviewWrap");
        const img = document.getElementById("baImagePreview");
        img.src = reader.result;
        wrap.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    m.querySelector("#baAddPart").addEventListener("click", baAddPart);
    m.querySelector("#baSave").addEventListener("click", baSaveBundle);
    m.querySelector("#baClear").addEventListener("click", baClearForm);
  }

  let __baBundleImage = "";

  function renderColorChips() {
    const wrap = document.getElementById("baColorChips");
    if (!wrap) return;
    wrap.innerHTML = COMMON_COLORS.map(
      (c) => `<button type="button" class="chip ${__partColors.includes(c) ? "on" : ""}" data-color-chip="${esc(c)}">${esc(c)}</button>`
    ).join("");
    wrap.querySelectorAll("[data-color-chip]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = btn.dataset.colorChip;
        __partColors = __partColors.includes(c) ? __partColors.filter((x) => x !== c) : [...__partColors, c];
        renderColorChips();
      });
    });
    const sel = document.getElementById("baColorsSelected");
    if (sel) sel.textContent = __partColors.length ? __partColors.join(", ") : "No colors selected.";
  }

  function renderSizeChips() {
    const wrap = document.getElementById("baSizeChips");
    if (!wrap) return;
    const presets = SIZE_PRESETS[__partType] || [];
    if (!presets.length) {
      wrap.innerHTML = `<div class="muted tiny">This item type usually doesn't need sizes (e.g. tie, bowtie). You can still add custom sizes below if needed.</div>`;
    } else {
      wrap.innerHTML = presets
        .map((s) => `<button type="button" class="chip small ${__partSizes.includes(s) ? "on" : ""}" data-size-chip="${esc(s)}">${esc(s)}</button>`)
        .join("");
      wrap.querySelectorAll("[data-size-chip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const s = btn.dataset.sizeChip;
          __partSizes = __partSizes.includes(s) ? __partSizes.filter((x) => x !== s) : [...__partSizes, s];
          renderSizeChips();
        });
      });
    }
    const sel = document.getElementById("baSizesSelected");
    if (sel) sel.textContent = __partSizes.length ? __partSizes.join(", ") : "No sizes selected (fine for items like a tie).";
  }

  function baAddPart() {
    if (!__partColors.length) {
      document.getElementById("baPartHint").textContent = "Pick at least one color for this part.";
      return;
    }
    const existingIdx = __bundleDraftParts.findIndex((p) => p.label === __partType);
    const row = { label: __partType, colors: [...__partColors], sizes: [...__partSizes] };
    if (existingIdx >= 0) __bundleDraftParts[existingIdx] = row;
    else __bundleDraftParts.push(row);

    document.getElementById("baPartHint").textContent = `${__partType} added.`;
    __partColors = [];
    __partSizes = [];
    renderColorChips();
    renderSizeChips();
    renderDraftParts();
  }

  function renderDraftParts() {
    const wrap = document.getElementById("baPartsList");
    if (!wrap) return;
    if (!__bundleDraftParts.length) {
      wrap.innerHTML = `<div class="muted tiny">No parts added yet — add at least one above (e.g. Suit, Shirt, Tie, Shoes, Belt).</div>`;
      return;
    }
    wrap.innerHTML =
      `<div style="font-weight:950;margin-bottom:8px;">Parts in this outfit (click Edit to change colors/sizes)</div>` +
      __bundleDraftParts
        .map(
          (p, i) => `
        <div class="variant-mini" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:16px;margin-bottom:8px;background:rgba(255,255,255,.03);">
          <div>
            <b>${esc(p.label)}</b>
            <div class="muted tiny">Colors: ${esc(p.colors.join(", ") || "none")}${p.sizes.length ? " • Sizes: " + esc(p.sizes.join(", ")) : ""}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn" type="button" data-edit-part="${i}">Edit</button>
            <button class="btn red" type="button" data-remove-part="${i}">Remove</button>
          </div>
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
    wrap.querySelectorAll("[data-edit-part]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.editPart);
        const p = __bundleDraftParts[idx];
        if (!p) return;
        __partType = p.label;
        __partColors = [...p.colors];
        __partSizes = [...p.sizes];
        document.getElementById("baPartType").value = PART_TYPES.includes(p.label) ? p.label : "Other";
        __bundleDraftParts.splice(idx, 1);
        renderColorChips();
        renderSizeChips();
        renderDraftParts();
        document.getElementById("baPartHint").textContent = `Editing "${p.label}" — adjust above, then click "+ Add This Part" to save it back.`;
      });
    });
  }

  function baClearForm() {
    document.getElementById("baOrigId").value = "";
    document.getElementById("baId").value = "";
    document.getElementById("baTitle").value = "";
    document.getElementById("baPrice").value = "";
    document.getElementById("baImageFile").value = "";
    document.getElementById("baImagePreviewWrap").style.display = "none";
    __baBundleImage = "";
    __bundleDraftParts = [];
    __partType = "Suit";
    __partColors = [];
    __partSizes = [];
    document.getElementById("baPartType").value = "Suit";
    renderColorChips();
    renderSizeChips();
    renderDraftParts();
    document.getElementById("baHint").textContent = "";
    document.getElementById("baPartHint").textContent = "";
  }

  function baSaveBundle() {
    const orig = (document.getElementById("baOrigId").value || "").trim();
    const id = (document.getElementById("baId").value || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const title = (document.getElementById("baTitle").value || "").trim();
    const price = Number(document.getElementById("baPrice").value || 0);
    const image = __baBundleImage || "";

    if (!id || !title || !price || !__bundleDraftParts.length) {
      document.getElementById("baHint").textContent = "ID, Title, Price, and at least one Part are required.";
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
    __baBundleImage = b.image || "";
    if (__baBundleImage) {
      document.getElementById("baImagePreview").src = __baBundleImage;
      document.getElementById("baImagePreviewWrap").style.display = "block";
    }
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
    renderColorChips();
    renderSizeChips();
    renderDraftParts();
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
        btn.style.display = typeof _adminIsAuthed === "function" && _adminIsAuthed() ? "" : "none";
      }
      refreshVis();
      setInterval(refreshVis, 1000);
      return true;
    }
    if (!tryInject()) {
      document.addEventListener("DOMContentLoaded", tryInject, { once: true });
    }
  })();

  try {
    renderBundleCards();
  } catch (_) {}
})();
