/* HMF PREVIEW CLICK ONLY — does not touch card layout, cart, checkout, admin, or product rendering */
(function(){
  if (window.__HMF_PREVIEW_CLICK_ONLY__) return;
  window.__HMF_PREVIEW_CLICK_ONLY__ = true;

  function getProducts(){
    try{
      const data = JSON.parse(localStorage.getItem("HMF_ADMIN_PRODUCTS") || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){
      return [];
    }
  }

  function esc(v){
    return String(v ?? "").replace(/[&<>'"]/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
    }[ch]));
  }

  function getTitle(card){
    const h = card.querySelector("h3");
    return h ? h.textContent.trim() : "";
  }

  function getImageFile(card){
    const img = card.querySelector("img");
    const src = img ? (img.getAttribute("src") || img.src || "") : "";
    return src.split("/").pop();
  }

  function findProduct(card){
    const title = getTitle(card);
    const imgFile = getImageFile(card);
    const products = getProducts();

    return products.find(p => String(p.name || p.title || "").trim() === title)
      || products.find(p => {
        const imgs = [];
        if (p.image) imgs.push(String(p.image));
        if (Array.isArray(p.variants)) p.variants.forEach(v => v.image && imgs.push(String(v.image)));
        return imgs.some(x => imgFile && x.includes(imgFile));
      })
      || null;
  }

  function opt(arr){
    return (arr || []).map(x => `<option>${esc(x)}</option>`).join("");
  }

  function openPreview(product, card){
    document.getElementById("hmfPreviewClickOnlyModal")?.remove();

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const firstVariant = variants[0] || {};
    const image = product.image || firstVariant.image || "./images/logo-hmf-gold.png";
    const colors = variants.map(v => v.color).filter(Boolean);
    const suitSizes = product.suitSizes || product.sizes || [];
    const shirtSizes = product.shirtSizes || [];
    const pantsSizes = product.pantsSizes || [];
    const shoeSizes = product.shoeSizes || [];
    const fits = product.fits || product.fitTypes || [];

    const modal = document.createElement("div");
    modal.id = "hmfPreviewClickOnlyModal";
    modal.innerHTML = `
      <div class="hmf-preview-only-bg">
        <div class="hmf-preview-only-box">
          <button class="hmf-preview-only-close" type="button">×</button>
          <div class="hmf-preview-only-img">
            <img id="hmfPreviewOnlyImg" src="${esc(image)}" onerror="this.src='./images/logo-hmf-gold.png'">
          </div>
          <div class="hmf-preview-only-info">
            <div class="hmf-preview-only-pill">${esc(product.category || "Product")}</div>
            <h2>${esc(product.name || product.title || "H Men's Fashion Product")}</h2>
            <p>${esc(product.description || "")}</p>
            <div class="hmf-preview-only-price">$${Number(product.price || 0).toFixed(2)}</div>

            ${suitSizes.length ? `<label>Jacket / Suit Size</label><select>${opt(suitSizes)}</select>` : ""}
            ${shirtSizes.length ? `<label>Shirt Size</label><select>${opt(shirtSizes)}</select>` : ""}
            ${pantsSizes.length ? `<label>Pants Size</label><select>${opt(pantsSizes)}</select>` : ""}
            ${shoeSizes.length ? `<label>Shoe Size</label><select>${opt(shoeSizes)}</select>` : ""}
            ${colors.length ? `<label>Color</label><select id="hmfPreviewOnlyColor">${opt(colors)}</select>` : ""}
            ${fits.length ? `<label>Fit Type</label><select>${opt(fits)}</select>` : ""}

            <button class="hmf-preview-only-add" type="button">Add to Cart</button>
          </div>
        </div>
      </div>
      <style>
        #hmfPreviewClickOnlyModal{position:fixed;inset:0;z-index:999999}
        .hmf-preview-only-bg{position:absolute;inset:0;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:26px}
        .hmf-preview-only-box{width:min(1220px,96vw);height:min(790px,92vh);background:#0d1018;border:1px solid rgba(255,255,255,.16);border-radius:26px;display:grid;grid-template-columns:1.55fr .9fr;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.65);position:relative}
        .hmf-preview-only-close{position:absolute;right:18px;top:18px;z-index:3;width:48px;height:48px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.09);color:#fff;font-size:32px;font-weight:900;cursor:pointer}
        .hmf-preview-only-img{background:#050609;display:grid;place-items:center;min-width:0;min-height:0}
        .hmf-preview-only-img img{width:100%;height:100%;object-fit:contain}
        .hmf-preview-only-info{padding:34px;overflow:auto;color:#fff}
        .hmf-preview-only-info h2{font-size:34px;line-height:1.1;margin:14px 0}
        .hmf-preview-only-info p{color:#c9c3b0;font-size:18px;line-height:1.35}
        .hmf-preview-only-price{font-size:32px;font-weight:950;color:#f0d27a;margin:16px 0}
        .hmf-preview-only-info label{display:block;margin:13px 0 6px;font-weight:900;color:#d6d2c8}
        .hmf-preview-only-info select{width:100%;padding:14px;border-radius:14px;background:#080a10;color:#fff;border:1px solid rgba(255,255,255,.16);font-size:16px}
        .hmf-preview-only-pill{display:inline-flex;border:1px solid rgba(240,210,122,.35);border-radius:999px;padding:8px 12px;color:#fff2bd;font-weight:900;background:rgba(240,210,122,.10)}
        .hmf-preview-only-add{width:100%;margin-top:20px;padding:16px;border:0;border-radius:16px;background:linear-gradient(135deg,#f0d27a,#d4af52);font-weight:950;color:#111;cursor:pointer}
        @media(max-width:850px){.hmf-preview-only-box{grid-template-columns:1fr;height:94vh}.hmf-preview-only-img{height:48vh}}
      </style>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".hmf-preview-only-close").onclick = () => modal.remove();
    modal.querySelector(".hmf-preview-only-bg").addEventListener("click", (e) => {
      if(e.target.classList.contains("hmf-preview-only-bg")) modal.remove();
    });

    const colorSel = modal.querySelector("#hmfPreviewOnlyColor");
    if(colorSel){
      colorSel.addEventListener("change", () => {
        const found = variants.find(v => String(v.color) === colorSel.value);
        if(found && found.image) modal.querySelector("#hmfPreviewOnlyImg").src = found.image;
      });
    }

    modal.querySelector(".hmf-preview-only-add").onclick = () => {
      const addButton = Array.from(card.querySelectorAll("button, .btn")).find(b => /add to cart/i.test(b.textContent || ""));
      if(addButton) addButton.click();
      modal.remove();
    };
  }

  function isInteractive(el){
    return !!el.closest("button,a,select,input,textarea,label,.btn");
  }

  document.addEventListener("click", function(e){
    if(isInteractive(e.target)) return;

    const card = e.target.closest(".hmf-admin-card, .product-card, [data-product-id]");
    if(!card) return;

    const product = findProduct(card);
    if(!product) return;

    e.preventDefault();
    e.stopPropagation();
    openPreview(product, card);
  }, true);
})();
