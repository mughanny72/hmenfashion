/* =========================
   HMENFASHION.COM — app.js (CLEAN + FIXED + UPGRADED)
   ✅ No duplicate functions
   ✅ No "floating middle screen" (hard-closes ALL modals)
   ✅ Sidebar Category → Subcategory (editable, saved in localStorage)
   ✅ Products render + search + category dropdown + subcategory filter
   ✅ Cart (localStorage) + quick add + qty controls
   ✅ Product Quick View modal + Policy modal (single instance)
========================= */
console.log("🔥 APP VERSION 2.1 LIVE");
// ---------- Tiny helpers ----------
const CART_KEY = "HMEN_CART_V1"; // ✅ must match DevTools key
const $ = (sel) => document.querySelector(sel);

function clampInt(v, min, max){
  const num = Number.parseInt(String(v), 10);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function n(v, fallback = 0){
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function money(v){
  return `$${n(v).toFixed(2)}`;
}

function calcCart(cartArr){
  const items = Array.isArray(cartArr) ? cartArr : [];
  const subtotal = items.reduce((sum, it) => sum + (n(it.price) * n(it.qty, 1)), 0);
  return {
    subtotal,
    subtotalText: money(subtotal)
  };
}
function money(v){
  return `$${n(v).toFixed(2)}`;
}
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
function uid(prefix="id"){ return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`; }
function keyify(s){
  return String(s||"")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"") || "ITEM";
}
function enableSidebarScrollLock(){
  const side = document.querySelector(".sidenav");
  if (!side) return;

  // Make sidebar independently scrollable
  side.style.overflowY = "auto";
  side.style.maxHeight = "calc(100vh - 16px)";
  side.style.overscrollBehavior = "contain";
  side.style.scrollBehavior = "smooth";
  side.style.paddingRight = "6px";

  // Sticky header (the first child is our header block)
  const head = side.firstElementChild;
  if (head){
    head.style.position = "sticky";
    head.style.top = "0";
    head.style.zIndex = "5";
    head.style.paddingTop = "10px";
    head.style.paddingBottom = "10px";
    head.style.backdropFilter = "blur(10px)";
    head.style.background = "rgba(10,10,10,.55)";
    head.style.borderBottom = "1px solid rgba(255,255,255,.08)";
  }

  // Nice scrollbar (WebKit)
  const styleId = "hmen-sidebar-scroll-style";
  if (!document.getElementById(styleId)){
    const st = document.createElement("style");
    st.id = styleId;
    st.textContent = `
      .sidenav{ scrollbar-width: thin; scrollbar-color: rgba(231,195,106,.55) rgba(255,255,255,.06); }
      .sidenav::-webkit-scrollbar{ width: 10px; }
      .sidenav::-webkit-scrollbar-track{ background: rgba(255,255,255,.06); border-radius: 10px; }
      .sidenav::-webkit-scrollbar-thumb{ background: rgba(231,195,106,.55); border-radius: 10px; }
      .sidenav::-webkit-scrollbar-thumb:hover{ background: rgba(231,195,106,.75); }
    `;
    document.head.appendChild(st);
  }

  // Prevent scroll chaining to the main page (wheel/trackpad)
  side.addEventListener("wheel", (e) => {
    const delta = e.deltaY;
    const atTop = side.scrollTop <= 0;
    const atBottom = side.scrollTop + side.clientHeight >= side.scrollHeight - 1;

    // stop page scroll when sidebar hits the edges
    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Touch devices: keep scroll inside sidebar
  side.addEventListener("touchmove", (e) => {
    // allow inside scroll, but prevent page scroll chaining
    e.stopPropagation();
  }, { passive: true });
}
function isAdminMode(){
  // turn on by visiting:  ?admin=1
  // turn off by:         ?admin=0
  const p = new URLSearchParams(location.search);
  if (p.has("admin")) {
    const v = p.get("admin");
    localStorage.setItem("HMEN_ADMIN_MODE", v === "1" ? "1" : "0");
  }
  return localStorage.getItem("HMEN_ADMIN_MODE") === "1";
}
/* ---------- Storage keys ---------- */
const LS = {
  cart: CART_KEY, // ✅ unified
  collapsed: "HMEN_SIDEBAR_COLLAPSED",
  catTree: "HMEN_CAT_TREE_V1"
};

/* =========================
   PRODUCTS (add subcat to make sidebar filtering work)
========================= */
const PRODUCTS = [
  {
    id: "SUIT_NAVY",
    title: "Classic Navy Suit Set",
    category: "SUITS",
    subcat: "SUIT_BUSINESS",
    price: 249,
    desc: "Clean silhouette, versatile navy tone. Perfect for work, weddings, and events.",
    bg: "linear-gradient(135deg, rgba(231,195,106,.25), rgba(255,255,255,.06)), radial-gradient(120px 120px at 30% 20%, rgba(231,195,106,.30), transparent 60%), linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.50))"
  },
  {
    id: "SHIRT_WHITE",
    title: "White Dress Shirt",
    category: "CASUAL",
    subcat: "SHIRT_DRESS",
    price: 39,
    desc: "Sharp collar, easy pairing. A must-have base layer for any outfit.",
    bg: "linear-gradient(135deg, rgba(255,255,255,.10), rgba(231,195,106,.10)), radial-gradient(140px 120px at 70% 30%, rgba(255,255,255,.12), transparent 60%)"
  },
  {
    id: "BLAZER_CHAR",
    title: "Charcoal Blazer",
    category: "CASUAL",
    subcat: "JKT_SPORT",
    price: 129,
    desc: "Smart casual staple. Works with jeans, chinos, or dress pants.",
    bg: "linear-gradient(135deg, rgba(255,255,255,.08), rgba(0,0,0,.20)), radial-gradient(120px 120px at 40% 20%, rgba(231,195,106,.18), transparent 60%)"
  },
  {
    id: "LOAFERS_BROWN",
    title: "Brown Leather Loafers",
    category: "SHOES",
    subcat: "SHOES",
    price: 79,
    desc: "Dress up or down. Comfort + clean finish for everyday confidence.",
    bg: "linear-gradient(135deg, rgba(231,195,106,.18), rgba(0,0,0,.30)), radial-gradient(140px 120px at 30% 30%, rgba(255,255,255,.10), transparent 60%)"
  },
  {
    id: "TIE_SET",
    title: "Tie + Pocket Square Set",
    category: "ACCESSORIES",
    subcat: "ACCESSORIES",
    price: 29,
    desc: "Instant upgrade. Match textures and elevate your look in seconds.",
    bg: "linear-gradient(135deg, rgba(231,195,106,.22), rgba(255,255,255,.06)), radial-gradient(140px 120px at 70% 30%, rgba(231,195,106,.18), transparent 60%)"
  },
  {
    id: "BELT_BLACK",
    title: "Slim Black Belt",
    category: "ACCESSORIES",
    subcat: "ACCESSORIES",
    price: 25,
    desc: "Minimal and premium look. A clean finish for suits and trousers.",
    bg: "linear-gradient(135deg, rgba(255,255,255,.06), rgba(0,0,0,.35)), radial-gradient(120px 120px at 40% 20%, rgba(231,195,106,.14), transparent 60%)"
  }
];

/* =========================
   CATEGORY TREE (editable, saved)
========================= */
const DEFAULT_CAT_TREE = [
  { id: uid("cat"), name: "Outfits", subs: [
    { id: uid("sub"), name: "All", key: "ALL" },
    { id: uid("sub"), name: "New Arrivals", key: "NEW" },
    { id: uid("sub"), name: "Best Sellers", key: "BEST" }
  ]},
  { id: uid("cat"), name: "Suits", subs: [
    { id: uid("sub"), name: "Business Suit", key: "SUIT_BUSINESS" },
    { id: uid("sub"), name: "Wedding Suit", key: "SUIT_WEDDING" },
    { id: uid("sub"), name: "3-Piece Suit", key: "SUIT_3PC" }
  ]},
  { id: uid("cat"), name: "Tux", subs: [
    { id: uid("sub"), name: "Tuxedo Set", key: "TUX_SET" },
    { id: uid("sub"), name: "Velvet Tux Jacket", key: "TUX_VELVET" },
    { id: uid("sub"), name: "Tux Shirt", key: "TUX_SHIRT" }
  ]},
  { id: uid("cat"), name: "Jackets", subs: [
    { id: uid("sub"), name: "Sport Jacket", key: "JKT_SPORT" },
    { id: uid("sub"), name: "Velvet Jacket", key: "JKT_VELVET" },
    { id: uid("sub"), name: "Coat", key: "COAT" }
  ]},
  { id: uid("cat"), name: "Knitwear", subs: [
    { id: uid("sub"), name: "Sweater", key: "SWEATER" },
    { id: uid("sub"), name: "Turtleneck", key: "TURTLENECK" },
    { id: uid("sub"), name: "Mock-Neck", key: "MOCKNECK" }
  ]},
  { id: uid("cat"), name: "Shirts", subs: [
    { id: uid("sub"), name: "Dress Shirt", key: "SHIRT_DRESS" },
    { id: uid("sub"), name: "Tux Shirt", key: "SHIRT_TUX" },
    { id: uid("sub"), name: "Casual Shirt", key: "SHIRT_CASUAL" }
  ]},
  { id: uid("cat"), name: "Pants", subs: [
    { id: uid("sub"), name: "Dress Pants", key: "PANTS_DRESS" },
    { id: uid("sub"), name: "Casual Pants", key: "PANTS_CASUAL" },
    { id: uid("sub"), name: "Khaki Pants", key: "PANTS_KHAKI" },
    { id: uid("sub"), name: "Chino Pants", key: "PANTS_CHINO" }
  ]}
];

let catTree = loadCatTree();

/* =========================
   STATE
========================= */
let cart = loadCart();
let activeCategory = "ALL";
let activeSubcat = "ALL";
let searchTerm = "";
let modalProductId = null;

/* =========================
   POLICIES
========================= */
const POLICIES = {
  shipping: { title: "Shipping Policy", body: "Demo text. We will customize your real shipping details when you launch." },
  returns:  { title: "Returns Policy",  body: "Demo text. We will define your return window and exchange rules." },
  privacy:  { title: "Privacy Policy",  body: "Demo text. We will add your privacy terms and data handling." },
  terms:    { title: "Terms & Conditions", body: "Demo text. We will add your store terms and limitations." }
};
let __CAT_EDITOR_SELECTED__ = null; // category id

function ensureCatEditorModal(){
  if (document.getElementById("catEditorModal")) return;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "catEditorModal";
  modal.hidden = true;
  modal.style.display = "none";

  modal.innerHTML = `
    <div class="modal-card" style="max-width:980px;width:min(980px,94vw)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>
          <div style="font-weight:900;font-size:18px">Category Manager</div>
          <div class="muted" style="margin-top:2px">Add, edit, reorder categories + subcategories (auto-saved).</div>
        </div>
        <button class="btn ghost" id="btnCloseCatEditor" type="button" aria-label="Close">✕</button>
      </div>

      <div style="display:grid;grid-template-columns: 1.1fr .9fr; gap:14px; margin-top:12px">
        <div class="card" style="padding:12px;border:1px solid rgba(255,255,255,.08)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
            <strong>Categories</strong>
            <button class="btn primary" id="btnAddCat" type="button">+ Add Category</button>
          </div>
          <div class="muted tiny" style="margin-bottom:10px">Click a category to edit its subcategories.</div>
          <div id="catList"></div>
        </div>

        <div class="card" style="padding:12px;border:1px solid rgba(255,255,255,.08)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
            <strong>Subcategories</strong>
            <button class="btn primary" id="btnAddSub" type="button">+ Add Sub</button>
          </div>
          <div class="muted tiny" style="margin-bottom:10px" id="subHeadHint">Select a category.</div>
          <div id="subList"></div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px">
        <div class="muted tiny">Esc closes • Changes save automatically</div>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn ghost" id="btnResetCats" type="button">Reset Default</button>
          <button class="btn primary" id="btnDoneCats" type="button">Done</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const styleId = "hmen-cat-editor-style";
  if (!document.getElementById(styleId)){
    const st = document.createElement("style");
    st.id = styleId;
    st.textContent = `
      #catEditorModal .rowitem{
        display:flex;align-items:center;justify-content:space-between;gap:10px;
        padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;
        background: rgba(255,255,255,.03); margin-bottom:8px;
      }
      #catEditorModal .rowitem.active{ outline:2px solid rgba(231,195,106,.55); }
      #catEditorModal input{
        width:100%; padding:10px 12px; border-radius:12px;
        border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.25); color:#fff;
      }
      #catEditorModal .miniBtns{ display:flex; gap:6px; align-items:center; }
      #catEditorModal .iconbtn2{
        width:36px; height:36px; border-radius:12px;
        border:1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04);
        color:#fff; cursor:pointer;
      }
      #catEditorModal .iconbtn2:hover{ background: rgba(255,255,255,.08); }
    `;
    document.head.appendChild(st);
  }

  // Close
  $("#btnCloseCatEditor")?.addEventListener("click", closeAllModals);
  $("#btnDoneCats")?.addEventListener("click", closeAllModals);

  // Reset default
  $("#btnResetCats")?.addEventListener("click", () => {
    if (!confirm("Reset categories to default?")) return;
    catTree = structuredClone(DEFAULT_CAT_TREE);
    saveCatTree();
    activeSubcat = "ALL";
    __CAT_EDITOR_SELECTED__ = catTree[0]?.id || null;
    renderSidebarCategories();
    renderProducts();
    renderCatEditor();
  });

  // Add category
  $("#btnAddCat")?.addEventListener("click", () => {
    const name = prompt("Category name:");
    if (!name) return;
    catTree.push({
      id: uid("cat"),
      name: name.trim(),
      subs: [{ id: uid("sub"), name: "All", key: keyify(name) + "_ALL" }]
    });
    saveCatTree();
    __CAT_EDITOR_SELECTED__ = catTree[catTree.length - 1].id;
    renderSidebarCategories();
    renderProducts();
    renderCatEditor();
  });

  // Add subcategory
  $("#btnAddSub")?.addEventListener("click", () => {
    const cIdx = getEditorSelectedCatIndex();
    if (cIdx < 0) return alert("Select a category first.");
    const name = prompt("Subcategory name:");
    if (!name) return;
    catTree[cIdx].subs.push({ id: uid("sub"), name: name.trim(), key: keyify(name) });
    saveCatTree();
    renderSidebarCategories();
    renderProducts();
    renderCatEditor();
  });
}

function getEditorSelectedCatIndex(){
  if (!__CAT_EDITOR_SELECTED__) return -1;
  return catTree.findIndex(c => c.id === __CAT_EDITOR_SELECTED__);
}

function renderCatEditor(){
  const catList = $("#catList");
  const subList = $("#subList");
  const hint = $("#subHeadHint");
  if (!catList || !subList || !hint) return;

  catList.innerHTML = "";
  subList.innerHTML = "";

  if (!__CAT_EDITOR_SELECTED__ && catTree.length) __CAT_EDITOR_SELECTED__ = catTree[0].id;

  catTree.forEach((cat, idx) => {
    const row = document.createElement("div");
    row.className = "rowitem" + (cat.id === __CAT_EDITOR_SELECTED__ ? " active" : "");

    row.innerHTML = `
      <div style="flex:1;min-width:0">
        <input value="${escapeHtml(cat.name)}" />
        <div class="muted tiny" style="margin-top:6px">${cat.subs.length} subcategories</div>
      </div>
      <div class="miniBtns">
        <button class="iconbtn2" type="button" title="Select">☰</button>
        <button class="iconbtn2" type="button" title="Up">↑</button>
        <button class="iconbtn2" type="button" title="Down">↓</button>
        <button class="iconbtn2" type="button" title="Delete">🗑</button>
      </div>
    `;

    const input = row.querySelector("input");
    const [btnSelect, btnUp, btnDown, btnDel] = row.querySelectorAll(".iconbtn2");

    btnSelect.addEventListener("click", () => {
      __CAT_EDITOR_SELECTED__ = cat.id;
      renderCatEditor();
    });

    btnUp.addEventListener("click", () => {
      if (idx <= 0) return;
      const [x] = catTree.splice(idx, 1);
      catTree.splice(idx - 1, 0, x);
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    btnDown.addEventListener("click", () => {
      if (idx >= catTree.length - 1) return;
      const [x] = catTree.splice(idx, 1);
      catTree.splice(idx + 1, 0, x);
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    btnDel.addEventListener("click", () => {
      if (!confirm(`Delete category "${cat.name}"?`)) return;
      catTree.splice(idx, 1);
      __CAT_EDITOR_SELECTED__ = catTree[0]?.id || null;
      saveCatTree();
      renderSidebarCategories();
      renderProducts();
      renderCatEditor();
    });

    input.addEventListener("change", () => {
      cat.name = String(input.value || "").trim() || cat.name;
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    catList.appendChild(row);
  });

  const cIdx = getEditorSelectedCatIndex();
  if (cIdx < 0){
    hint.textContent = "Select a category.";
    return;
  }

  const cat = catTree[cIdx];
  hint.textContent = `Editing: ${cat.name}`;

  cat.subs.forEach((sub, idx) => {
    const row = document.createElement("div");
    row.className = "rowitem";

    row.innerHTML = `
      <div style="flex:1;min-width:0">
        <input value="${escapeHtml(sub.name)}" />
        <div class="muted tiny" style="margin-top:6px">key: ${escapeHtml(sub.key)}</div>
      </div>
      <div class="miniBtns">
        <button class="iconbtn2" type="button" title="Up">↑</button>
        <button class="iconbtn2" type="button" title="Down">↓</button>
        <button class="iconbtn2" type="button" title="Delete">🗑</button>
      </div>
    `;

    const input = row.querySelector("input");
    const [btnUp, btnDown, btnDel] = row.querySelectorAll(".iconbtn2");

    btnUp.addEventListener("click", () => {
      if (idx <= 0) return;
      const [x] = cat.subs.splice(idx, 1);
      cat.subs.splice(idx - 1, 0, x);
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    btnDown.addEventListener("click", () => {
      if (idx >= cat.subs.length - 1) return;
      const [x] = cat.subs.splice(idx, 1);
      cat.subs.splice(idx + 1, 0, x);
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    btnDel.addEventListener("click", () => {
      if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
      cat.subs.splice(idx, 1);
      saveCatTree();
      renderSidebarCategories();
      renderProducts();
      renderCatEditor();
    });

    input.addEventListener("change", () => {
      sub.name = String(input.value || "").trim() || sub.name;
      saveCatTree();
      renderSidebarCategories();
      renderCatEditor();
    });

    subList.appendChild(row);
  });
}
/* =========================
   INIT
========================= */
safeSetYear();
applySidebarPreference();
hideAllModals();
showOverlay(false);
renderSidebarCategories();
enableSidebarScrollLock();   // ✅ add this
renderProducts();
renderCart();
wireUI();



// ✅ One-time payment checkout (store orders)
async function startCheckout() {
  const btn = document.getElementById("btnCheckout");

  try {
    if (btn && btn.disabled) return;

    // ✅ 1) Always sync UI cart -> localStorage BEFORE checkout
    if (!Array.isArray(cart)) cart = loadCart();
    saveCart(); // ensures localStorage has what user sees

    // ✅ 2) Use the SAME cart array for checkout
    const cartArr = cart;

    if (!Array.isArray(cartArr) || cartArr.length === 0) {
      setCartHint?.("Your cart is empty.");
      return;
    }

    // ✅ 3) Build Stripe items safely (cents)
    const items = cartArr
      .map((it) => {
        const title = String(it.title || it.name || "Item").trim();
        const qty = clampInt(it.qty ?? it.quantity ?? 1, 1, 99);

        // prefer unitAmount (cents) else compute from price (dollars)
        const unitAmount =
          Number.isFinite(Number(it.unitAmount)) && Number(it.unitAmount) > 0
            ? Math.round(Number(it.unitAmount))
            : Math.round(n(it.price, 0) * 100);

        return {
          name: title,
          unitAmount,
          qty,
          sku: String(it.id || it.sku || ""),
        };
      })
      .filter((x) => x.unitAmount > 0 && x.qty > 0);

    if (!items.length) {
      alert("Cart items missing prices. Fix product prices first.");
      return;
    }

    const customerEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

    // ✅ UI state
    if (btn) {
      btn.disabled = true;
      btn.dataset.oldText = btn.textContent || "";
      btn.textContent = "Redirecting…";
    }
    setCartHint?.("Opening secure checkout…");

    // ✅ 4) Call your Stripe session API
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "payment",
        customerEmail: customerEmail || undefined,
        items,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.error || `Checkout error (${res.status})`);
      return;
    }
    if (!data?.url) {
      alert("Missing checkout URL from server.");
      return;
    }

    // ✅ 5) Redirect to Stripe hosted checkout
    window.location.href = data.url;

  } catch (err) {
    console.error("Checkout error:", err);
    alert(err?.message || "Something went wrong.");
  } finally {
    // if redirect didn't happen, restore button
    const b = document.getElementById("btnCheckout");
    if (b) {
      b.disabled = false;
      b.textContent = b.dataset.oldText || "Checkout";
    }
  }
}

/* =========================
   UI WIRING — UPDATED
   - Uses CART_KEY everywhere for checkout
   - Keeps your existing wiring intact
========================= */
function wireUI() {
  $("#btnScrollCart")?.addEventListener("click", () => {
    document.getElementById("cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  // ✅ Lookbook button
  document.getElementById("btnGoLookbook")?.addEventListener("click", () => {
    document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#btnCollapse")?.addEventListener("click", () => {
    const layout = $("#layout");
    if (!layout) return;
    layout.classList.toggle("is-collapsed");
    localStorage.setItem(LS.collapsed, layout.classList.contains("is-collapsed") ? "1" : "0");
  });

  $("#btnHamburger")?.addEventListener("click", openMobileMenu);
  $("#btnOpenMobileMenu")?.addEventListener("click", openMobileMenu);

  $("#overlay")?.addEventListener("click", () => {
    closeMobileMenu();
    closeAllModals();
  });

  $("#searchInput")?.addEventListener("input", (e) => {
    searchTerm = String(e.target.value || "").trim().toLowerCase();
    renderProducts();
  });

  // ✅ Click the ⌘K badge/button -> focus search
  document.getElementById("btnHotkeyHint")?.addEventListener("click", () => {
    document.getElementById("searchInput")?.focus();
  });

  $("#categorySelect")?.addEventListener("change", (e) => {
    activeCategory = e.target.value || "ALL";
    renderProducts();
  });

  $("#btnClearCart")?.addEventListener("click", () => {
    cart = [];
    saveCart();
    renderCart();
    setCartHint("Cart cleared.");
  });

  document.getElementById("btnCheckout")?.addEventListener("click", startCheckout);

  $("#contactForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const hint = $("#formHint");
    if (hint) hint.textContent = "Message received (demo). Next step: connect email/WhatsApp.";
    e.target.reset();
    setTimeout(() => { if (hint) hint.textContent = ""; }, 1800);
  });

  document.querySelectorAll("[data-policy]").forEach(btn => {
    btn.addEventListener("click", () => openPolicy(btn.getAttribute("data-policy")));
  });
  $("#btnClosePolicy")?.addEventListener("click", closePolicyModal);

  $("#btnCloseModal")?.addEventListener("click", closeProductModal);
  $("#pmMinus")?.addEventListener("click", () => bumpModalQty(-1));
  $("#pmPlus")?.addEventListener("click", () => bumpModalQty(+1));
  $("#pmAdd")?.addEventListener("click", addModalToCart);
  $("#pmGoCart")?.addEventListener("click", () => {
    closeProductModal();
    document.getElementById("cart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#btnEditCats")?.addEventListener("click", openCategoryEditor);
    window.addEventListener("keydown", (e) => {
    // Ignore typing in inputs
    const t = (e.target?.tagName || "").toLowerCase();
    if (t === "input" || t === "textarea" || e.target?.isContentEditable) return;

    if (e.key.toLowerCase() === "l") {
      document.getElementById("lookbook")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

enableSidebarScrollLock();
/* =========================
   SIDEBAR + MOBILE
========================= */
function applySidebarPreference(){
  const v = localStorage.getItem(LS.collapsed);
  if (v === "1") $("#layout")?.classList.add("is-collapsed");
}

function openMobileMenu(){
  closeAllModals();
  $("#layout")?.classList.add("is-mobile-open");
  showOverlay(true);
}
function closeMobileMenu(){
  $("#layout")?.classList.remove("is-mobile-open");
  const anyModalOpen = document.querySelector(".modal:not([hidden])");
  if (!anyModalOpen) showOverlay(false);
}
function showOverlay(on){
  const ov = $("#overlay");
  if (!ov) return;
  ov.hidden = !on;
}
function markActiveSidebarLinks(){
  document.querySelectorAll(".sidenav .navlink").forEach(el => el.removeAttribute("aria-current"));
  const active = document.querySelector(".sidenav .navlink.active");
  if (active) active.setAttribute("aria-current", "page");
}
/* =========================
   MODALS — hard control (fix flying middle screen)
========================= */
function hideAllModals(){
  document.querySelectorAll(".modal").forEach(m => {
    m.hidden = true;
    m.style.display = "none";
  });
}
function openOnlyModal(selector){
  hideAllModals();
  const m = $(selector);
  if (!m) return null;
  m.hidden = false;
  m.style.display = "grid";
  showOverlay(true);
  return m;
}
function closeAllModals(){
  hideAllModals();
  const mobileOpen = $("#layout")?.classList.contains("is-mobile-open");
  if (!mobileOpen) showOverlay(false);
}

/* =========================
   SIDEBAR Category -> Subcategory (Editable)
========================= */
function renderSidebarCategories(){
  const nav = document.querySelector(".sidenav");
  if (!nav) return;

  nav.innerHTML = "";

  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.justifyContent = "space-between";
  head.style.gap = "10px";
  head.style.padding = "6px 4px 10px";

  const admin = isAdminMode();

  head.innerHTML = `
    <div class="muted tiny">Categories</div>
    ${admin ? `<button class="btn ghost" id="btnEditCats" type="button" style="padding:8px 10px;border-radius:12px;">Edit</button>` : ""}
  `;

  nav.appendChild(head);

  if (admin) $("#btnEditCats")?.addEventListener("click", openCategoryEditor);

  catTree.forEach((cat) => {
    const wrap = document.createElement("div");
    wrap.className = "catgroup";

    const catRow = document.createElement("button");
    catRow.type = "button";
    catRow.className = "navlink";
    catRow.style.width = "100%";
    catRow.style.justifyContent = "space-between";
    catRow.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px;">
        <span class="navtext">${escapeHtml(cat.name)}</span>
      </span>
      <span class="muted tiny">▾</span>
    `;

    const subBox = document.createElement("div");
    subBox.style.display = "grid";
    subBox.style.gap = "6px";
    subBox.style.padding = "6px 0 10px 14px";

    cat.subs.forEach(sub => {
      const a = document.createElement("button");
      a.type = "button";
      a.className = "navlink";
      a.style.width = "100%";
      a.style.padding = "8px 10px";
      a.style.borderRadius = "14px";
      a.style.background = "transparent";

      const isActive = (activeSubcat === sub.key);
      if (isActive) a.classList.add("active");

      a.innerHTML = `<span class="navtext">${escapeHtml(sub.name)}</span>`;
a.addEventListener("click", () => {
  activeSubcat = sub.key;

  renderSidebarCategories();
  renderProducts();

  // ✅ Premium micro animation on product grid
  try{
    document.getElementById("productGrid")?.animate(
      [
        { opacity: .7, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 220, easing: "ease-out" }
    );
  }catch(_){}
});

      subBox.appendChild(a);
    });

    let open = true;
    catRow.addEventListener("click", () => {
      open = !open;
      subBox.style.display = open ? "grid" : "none";
      catRow.querySelector(".muted.tiny").textContent = open ? "▾" : "▸";
    });

    wrap.appendChild(catRow);
    wrap.appendChild(subBox);
    nav.appendChild(wrap);
  });

  // Re-wire edit button after rebuilding (admin only recommended)
  if (admin) $("#btnEditCats")?.addEventListener("click", openCategoryEditor);

  // ✅ ADD THIS HERE (LAST LINE BEFORE END)
  markActiveSidebarLinks();
}

/* ----- Editor (prompt-based, zero HTML changes) ----- */
function openCategoryEditor(){
  if (!isAdminMode()) return;
  ensureCatEditorModal();
  renderCatEditor();
  openOnlyModal("#catEditorModal");
}

function pickCategoryIndex(){
  const list = catTree.map((c,i)=> `${i+1}) ${c.name}`).join("\n");
  const ans = prompt(`Pick category:\n${list}\n\nType number:`);
  if (!ans) return -1;
  const idx = Number(ans) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= catTree.length) return -1;
  return idx;
}
function pickSubIndex(){
  const cIdx = pickCategoryIndex();
  if (cIdx < 0) return { cIdx:-1, sIdx:-1 };
  const subs = catTree[cIdx].subs;
  const list = subs.map((s,i)=> `${i+1}) ${s.name}`).join("\n");
  const ans = prompt(`Pick subcategory in "${catTree[cIdx].name}":\n${list}\n\nType number:`);
  if (!ans) return { cIdx:-1, sIdx:-1 };
  const sIdx = Number(ans) - 1;
  if (!Number.isInteger(sIdx) || sIdx < 0 || sIdx >= subs.length) return { cIdx:-1, sIdx:-1 };
  return { cIdx, sIdx };
}
function reorderCategories(){
  const list = catTree.map((c,i)=> `${i+1}) ${c.name}`).join("\n");
  const from = prompt(`Move which category?\n${list}\n\nType FROM number:`);
  if (!from) return;
  const to = prompt(`Move to position (1-${catTree.length}):`);
  if (!to) return;

  const f = Number(from)-1, t = Number(to)-1;
  if (!Number.isInteger(f) || !Number.isInteger(t)) return;
  if (f<0 || f>=catTree.length || t<0 || t>=catTree.length) return;

  const [item] = catTree.splice(f,1);
  catTree.splice(t,0,item);
}
function reorderSubcategories(cIdx){
  const subs = catTree[cIdx].subs;
  const list = subs.map((s,i)=> `${i+1}) ${s.name}`).join("\n");
  const from = prompt(`Move which subcategory in "${catTree[cIdx].name}"?\n${list}\n\nType FROM number:`);
  if (!from) return;
  const to = prompt(`Move to position (1-${subs.length}):`);
  if (!to) return;

  const f = Number(from)-1, t = Number(to)-1;
  if (!Number.isInteger(f) || !Number.isInteger(t)) return;
  if (f<0 || f>=subs.length || t<0 || t>=subs.length) return;

  const [item] = subs.splice(f,1);
  subs.splice(t,0,item);
}

/* =========================
   PRODUCTS RENDER
========================= */
function renderProducts(){
  const grid = $("#productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const filtered = PRODUCTS.filter(p => {
    const matchCat = (activeCategory === "ALL") || (p.category === activeCategory);
    const matchSub = (activeSubcat === "ALL") || (p.subcat === activeSubcat);

    const t = (p.title + " " + p.category + " " + p.desc).toLowerCase();
    const matchSearch = !searchTerm || t.includes(searchTerm);

    return matchCat && matchSub && matchSearch;
  });

  if (!filtered.length){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "10px 0";
    empty.textContent = "No results. Try another search or choose All.";
    grid.appendChild(empty);
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="pimg" style="background-image:${p.bg}" role="button" tabindex="0" aria-label="View ${escapeHtml(p.title)}"></div>
      <div class="pbody">
        <div class="ptitle">${escapeHtml(p.title)}</div>
        <div class="pmeta">
          <span class="pill">${escapeHtml(p.category)}</span>
          <span class="price">${money(p.price)}</span>
        </div>
        <div class="pdesc">${escapeHtml(p.desc)}</div>
        <div class="pactions">
          <button class="btn primary" type="button">Quick Add</button>
          <button class="btn ghost" type="button">View</button>
        </div>
      </div>
    `;

    const img = card.querySelector(".pimg");
    const [btnAdd, btnView] = card.querySelectorAll(".pactions button");

    btnAdd?.addEventListener("click", () => addToCart(p.id, { size:"M", qty:1 }));
    btnView?.addEventListener("click", () => openProductModal(p.id));

    img?.addEventListener("click", () => openProductModal(p.id));
    img?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openProductModal(p.id);
    });

    grid.appendChild(card);
  });
}
// ===============================
// ⌘K / Ctrl+K Quick Search + Esc close
// strong capture + double-focus (wins focus fights)
// ===============================
(function initQuickSearchHotkeys(){
  if (window.__QUICK_SEARCH_HOTKEYS__) return;
  window.__QUICK_SEARCH_HOTKEYS__ = true;

  function getSearchInput(){
    return (
      document.querySelector("#searchInput") ||
      document.querySelector('input[type="search"]') ||
      document.querySelector('input[placeholder*="Search"]') ||
      document.querySelector('input[placeholder*="search"]')
    );
  }

  function ensureGlowStyle(){
    if (document.getElementById("quickSearchGlowStyle")) return;
    const st = document.createElement("style");
    st.id = "quickSearchGlowStyle";
    st.textContent = `
      .quick-search-glow{
        outline:none !important;
        box-shadow:0 0 0 3px rgba(210,170,90,.35), 0 0 18px rgba(210,170,90,.25) !important;
        border-color:rgba(210,170,90,.55) !important;
        transition:box-shadow .18s ease, border-color .18s ease;
      }
    `;
    document.head.appendChild(st);
  }

  function glow(el){
    if (!el) return;
    ensureGlowStyle();
    el.classList.add("quick-search-glow");
    setTimeout(() => el.classList.remove("quick-search-glow"), 900);
  }

  function focusSearch(){
    const el = getSearchInput();
    if (!el) return false;

    const doFocus = () => {
      try{
        el.focus({ preventScroll:true });
        const v = el.value || "";
        el.setSelectionRange?.(v.length, v.length);
      }catch(_){}
      glow(el);
    };

    // focus now + again next tick (beats “focus steal”)
    doFocus();
    requestAnimationFrame(doFocus);
    setTimeout(doFocus, 30);

    return true;
  }

  function closeSearch(){
    const el = getSearchInput();
    if (!el) return;
    try { el.value = ""; } catch(_){}
    try { el.dispatchEvent(new Event("input", { bubbles:true })); } catch(_){}
    try { el.blur(); } catch(_){}
  }

  // capture early
  window.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();

    if ((e.metaKey || e.ctrlKey) && key === "k") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      focusSearch();
      return false;
    }

    if (key === "escape") {
      const el = getSearchInput();
      if (el && document.activeElement === el) {
        e.preventDefault();
        closeSearch();
      }
    }
  }, true);

  document.addEventListener("focusin", (e) => {
    const el = getSearchInput();
    if (el && e.target === el) glow(el);
  });
})();
/* =========================
   CART
========================= */
function addToCart(productId, opts = {}) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;

  const size = String(opts.size || "M").trim().toUpperCase();
  const qty = clampInt(opts.qty ?? 1, 1, 99);

  const key = `${p.id}__${size}`;
  const existing = cart.find(x => x.key === key);

  // ✅ normalize price once (dollars + cents)
  const price = Number(p.price || 0);                 // 249
  const unitAmount = Math.round(price * 100);         // 24900

  if (existing) {
    existing.qty = clampInt(Number(existing.qty || 0) + qty, 1, 99);

    // ✅ keep price attached (important if old items exist)
    existing.price = Number(existing.price ?? price);
    existing.unitAmount = Math.round(Number(existing.unitAmount ?? unitAmount));
    existing.size = existing.size || size;
  } else {
    cart.push({
      key,
      id: p.id,
      title: String(p.title || ""),
      category: String(p.category || ""),
      subcat: String(p.subcat || ""),
      size,
      qty,

      // ✅ needed for totals + Stripe
      price,        // dollars
      unitAmount,   // cents

      addedAt: Date.now()
    });
  }

  saveCart();
  renderCart();
  setCartHint("Added to cart.");
  setTimeout(() => setCartHint(""), 900);
}

function incCart(key){
  const item = cart.find(x => x.key === key);
  if (!item) return;
  item.qty = clampInt(item.qty + 1, 1, 99);
  saveCart();
  renderCart();
}

function decCart(key){
  const item = cart.find(x => x.key === key);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) cart = cart.filter(x => x.key !== key);
  saveCart();
  renderCart();
}

function removeCart(key){
  cart = cart.filter(x => x.key !== key);
  saveCart();
  renderCart();
}



function renderCart() {
  const list = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");

  // ✅ badge optional (never block rendering)
  const badge =
    document.getElementById("cartCountBadge") ||
    document.querySelector("[data-cart-count]");

  const checkoutBtn = document.getElementById("btnCheckout");

  if (!list || !totalEl) return;

  // ✅ Ensure cart is an array
  if (!Array.isArray(cart)) cart = [];

  // ✅ Hard-fix legacy / corrupted items (missing key/qty/price)
  //    This prevents NaN totals and "0" bugs.
  cart = cart
    .map((it) => {
      const title = String(it?.title || it?.name || "Item");
      const qty = clampInt(it?.qty ?? it?.quantity ?? 1, 1, 99);

      // price dollars (for UI)
      const price = n(it?.price, 0);

      // unitAmount cents (for Stripe / future)
      const unitAmount =
        Number.isFinite(Number(it?.unitAmount)) && Number(it.unitAmount) > 0
          ? Math.round(Number(it.unitAmount))
          : Math.round(price * 100);

      // stable key (needed for inc/dec/remove)
      const size = String(it?.size || "M").trim().toUpperCase();
      const id = String(it?.id || it?.sku || "");
      const key = String(it?.key || (id ? `${id}__${size}` : `ITEM__${size}`));

      return {
        ...it,
        id,
        title,
        size,
        key,
        qty,
        price,
        unitAmount,
      };
    })
    .filter((it) => it.qty > 0); // keep positive qty only

  // ✅ Persist the cleaned cart so UI + storage stay identical
  try {
    saveCart?.();
  } catch (_) {}

  // ✅ Render
  list.innerHTML = "";

  let count = 0;

  cart.forEach((item) => {
    const price = n(item.price, 0);
    const qty = clampInt(item.qty ?? 1, 1, 99);
    count += qty;

    const row = document.createElement("div");
    row.className = "cartrow";
    row.innerHTML = `
      <div class="cartleft">
        <div class="carttitle">${escapeHtml(item.title || "Item")}</div>
        <div class="cartsub">
          ${escapeHtml(item.category || "")}
          ${item.size ? ` • Size ${escapeHtml(item.size)}` : ""}
          • ${money(price)} each
        </div>
      </div>

      <div class="cartright">
        <div class="qtymini" aria-label="Quantity controls">
          <button class="iconbtn" type="button" aria-label="Decrease">−</button>
          <span>${qty}</span>
          <button class="iconbtn" type="button" aria-label="Increase">+</button>
        </div>
        <button class="btn ghost" type="button">Remove</button>
      </div>
    `;

    const btnMinus = row.querySelectorAll(".qtymini .iconbtn")[0];
    const btnPlus = row.querySelectorAll(".qtymini .iconbtn")[1];
    const btnRemove = row.querySelector(".cartright .btn.ghost");

    // ✅ Always use item.key (guaranteed above)
    btnMinus?.addEventListener("click", () => decCart(item.key));
    btnPlus?.addEventListener("click", () => incCart(item.key));
    btnRemove?.addEventListener("click", () => removeCart(item.key));

    list.appendChild(row);
  });

  if (!cart.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Cart is empty. Add items from Outfits above.";
    list.appendChild(empty);
  }

  // ✅ Subtotal (single source of truth)
  const { subtotal, subtotalText } = calcCart(cart);
  totalEl.textContent = Number.isFinite(subtotal) ? subtotalText : "$0.00";

  // ✅ badge safe
  if (badge) badge.textContent = String(count);

  // ✅ UX: disable checkout when empty
  if (checkoutBtn) checkoutBtn.disabled = count <= 0;
}

/* =========================
   PRODUCT MODAL
========================= */
function openProductModal(productId){
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;

  modalProductId = p.id;

  $("#pmImg") && ($("#pmImg").style.backgroundImage = p.bg);
  $("#pmTitle") && ($("#pmTitle").textContent = p.title);
  $("#pmPrice") && ($("#pmPrice").textContent = money(p.price));
  $("#pmDesc") && ($("#pmDesc").textContent = p.desc);
  $("#pmCat") && ($("#pmCat").textContent = p.category);
  $("#pmTag") && ($("#pmTag").textContent = "SMART VALUE");

  $("#pmQty") && ($("#pmQty").value = "1");
  $("#pmSize") && ($("#pmSize").value = "M");
  $("#pmHint") && ($("#pmHint").textContent = "");

  openOnlyModal("#productModal");
  $("#pmAdd")?.focus();
}

function closeProductModal(){
  modalProductId = null;
  closeAllModals();
}

function bumpModalQty(delta){
  const el = $("#pmQty");
  if (!el) return;
  const cur = clampInt(el.value, 1, 99);
  el.value = String(clampInt(cur + delta, 1, 99));
}

function addModalToCart(){
  if (!modalProductId) return;
  const size = $("#pmSize")?.value || "M";
  const qty = clampInt($("#pmQty")?.value ?? 1, 1, 99);
  addToCart(modalProductId, { size, qty });
  $("#pmHint") && ($("#pmHint").textContent = "Added to cart.");
}

/* =========================
   POLICY MODAL
========================= */
function openPolicy(key){
  const p = POLICIES[key];
  if (!p) return;

  const t = $("#polTitle");
  const b = $("#polBody");
  if (!t || !b) return;

  t.textContent = p.title;
  b.textContent = p.body;

  openOnlyModal("#policyModal");
}

function closePolicyModal(){
  closeAllModals();
}

/* =========================
   STORAGE
========================= */
function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function loadCatTree(){
  try{
    const raw = localStorage.getItem(LS.catTree);
    const val = raw ? JSON.parse(raw) : null;
    if (!val || !Array.isArray(val)) return structuredClone(DEFAULT_CAT_TREE);
    return val;
  }catch(_){
    return structuredClone(DEFAULT_CAT_TREE);
  }
}
function saveCatTree(){
  try{ localStorage.setItem(LS.catTree, JSON.stringify(catTree)); }catch(_){}
}
(function wireSubscribeOnce(){
  const btn = document.getElementById("subscribeBtn");
  if(!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const msg = document.getElementById("subscribeMsg");
  const emailEl = document.getElementById("memberEmail");

  btn.addEventListener("click", async () => {
    try{
      btn.disabled = true;
      if(msg) msg.textContent = "Redirecting to secure checkout...";

      const customerEmail = (emailEl?.value || "").trim();

      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind:"subscription", customerEmail })
      });

      const data = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data?.error || "Checkout failed");
      if(!data?.url) throw new Error("Missing checkout URL");

      window.location.href = data.url;
    }catch(e){
      console.error(e);
      if(msg) msg.textContent = "Error: " + (e?.message || "Unknown error");
      btn.disabled = false;
    }
  });
})();
/* =========================
   SMALL UI HELPERS
========================= */
function safeSetYear(){
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}
function setCartHint(msg){
  const h = $("#cartHint");
  if (h) h.textContent = msg || "";
}
/* =========================
   LOOKBOOK BUNDLES
========================= */
function addLookBundle(type){
  const t = String(type || "").toLowerCase();

  if (t === "business"){
    addToCart("SUIT_NAVY", { size:"M", qty:1 });
    addToCart("SHIRT_WHITE", { size:"M", qty:1 });
    addToCart("LOAFERS_BROWN", { size:"M", qty:1 });
    return;
  }

  if (t === "wedding"){
    addToCart("SUIT_NAVY", { size:"M", qty:1 });
    addToCart("SHIRT_WHITE", { size:"M", qty:1 });
    addToCart("TIE_SET", { size:"M", qty:1 });
    return;
  }

  if (t === "casual"){
    addToCart("BLAZER_CHAR", { size:"M", qty:1 });
    addToCart("SHIRT_WHITE", { size:"M", qty:1 });
    addToCart("BELT_BLACK", { size:"M", qty:1 });
    return;
  }

  if (t === "evening"){
    addToCart("SUIT_NAVY", { size:"M", qty:1 });
    addToCart("TIE_SET", { size:"M", qty:1 });
    return;
  }

  console.warn("Unknown look bundle:", type);
}

/* =========================
   LOOKBOOK — one clean controller
   ✅ carousel controls is-active
   ✅ dots + arrows + autoplay
   ✅ keyboard ← → and Esc stops auto
   ✅ parallax (desktop)
   ✅ "View Key Piece" opens product modal + scrolls to outfits
========================= */
(function initLookbook(){
  if (window.__LOOKBOOK__) return;
  window.__LOOKBOOK__ = true;

  const root = document.getElementById("lookbook");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".look-slide"));
  if (!slides.length) return;

  const dots = Array.from(root.querySelectorAll(".look-dot"));
  const btnPrev = document.getElementById("lookPrev");
  const btnNext = document.getElementById("lookNext");
  const btnAuto = document.getElementById("lookAuto");

  let idx = 0;
  let timer = null;

  function setActive(i){
    idx = (i + slides.length) % slides.length;

    slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));

    dots.forEach((d, k) => {
      const on = (k === idx);
      d.classList.toggle("is-on", on);
      d.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function next(){ setActive(idx + 1); }
  function prev(){ setActive(idx - 1); }

  function stopAuto(){
    if (timer) clearInterval(timer);
    timer = null;
    if (btnAuto){
      btnAuto.setAttribute("aria-pressed", "false");
      btnAuto.textContent = "Auto";
    }
  }

  function startAuto(){
    stopAuto();
    timer = setInterval(next, 4500);
    if (btnAuto){
      btnAuto.setAttribute("aria-pressed", "true");
      btnAuto.textContent = "Auto ✓";
    }
  }

  // Buttons
  btnPrev?.addEventListener("click", () => { stopAuto(); prev(); });
  btnNext?.addEventListener("click", () => { stopAuto(); next(); });
  btnAuto?.addEventListener("click", () => { timer ? stopAuto() : startAuto(); });

  // Dots
  dots.forEach((d, i) => {
    d.addEventListener("click", () => {
      stopAuto();
      const to = Number(d.dataset.to ?? i);
      setActive(to);
    });
  });

  // Click: Shop look + View key piece (event delegation)
  root.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".look-add");
    if (addBtn){
      e.preventDefault();
      stopAuto();
      const type = String(addBtn.dataset.bundle || "").trim();
      if (type && typeof addLookBundle === "function") addLookBundle(type);
      document.getElementById("cart")?.scrollIntoView({ behavior:"smooth", block:"start" });
      return;
    }

    const viewBtn = e.target.closest(".look-view");
    if (viewBtn){
      e.preventDefault();
      stopAuto();
      const pid = String(viewBtn.dataset.jump || "").trim();
      if (pid && typeof openProductModal === "function") {
        // optional: bring user back to outfits first (better UX)
        document.getElementById("outfits")?.scrollIntoView({ behavior:"smooth", block:"start" });
        // open modal after scroll starts
        setTimeout(() => openProductModal(pid), 150);
      }
    }
  });

  // Keyboard: ← → ; Esc stops auto
  window.addEventListener("keydown", (e) => {
    const t = (e.target?.tagName || "").toLowerCase();
    if (t === "input" || t === "textarea" || e.target?.isContentEditable) return;

    if (e.key === "ArrowRight") { stopAuto(); next(); }
    if (e.key === "ArrowLeft")  { stopAuto(); prev(); }
    if (e.key === "Escape")     { stopAuto(); }
  });

  // Parallax (desktop only)
  const isTouch = window.matchMedia?.("(hover: none)").matches;
  if (!isTouch){
    let raf = 0;
    window.addEventListener("mousemove", (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const x = (e.clientX / window.innerWidth - 0.5) * 24;
        const y = (e.clientY / window.innerHeight - 0.5) * 18;
        document.documentElement.style.setProperty("--lb-x", `${x}px`);
        document.documentElement.style.setProperty("--lb-y", `${y}px`);
      });
    }, { passive: true });
  }

  // Start state
  setActive(0);
})();

/* =========================
   Lookbook "Shop This Look" buttons
========================= */
document.addEventListener("click", function(e){
  const btn = e.target.closest(".look-add");
  if(!btn) return;

  e.preventDefault();

  const type = String(btn.dataset.bundle || "").trim();
  if (!type) return;

  addLookBundle(type);

  try { setCartHint?.("Added full look to cart."); } catch(_){}

  document.getElementById("cart")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});