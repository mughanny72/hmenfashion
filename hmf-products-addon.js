/* H MEN'S FASHION — OUTFITS + SINGLE ITEMS + COLOR VARIANTS */
(function(){
const KEY='HMF_ADMIN_PRODUCTS',CART='hmfCart';
/* Live catalog cache — same for every visitor worldwide, fetched from /api/products and
   /api/bundles (backed by MongoDB), not just this one browser's storage. A local copy is
   kept in localStorage purely so the page can paint instantly on repeat visits while the
   fresh network copy loads in the background. */
let PRODUCTS_CACHE=[],BUNDLES_CACHE=[];
function hmfLoadCachedFromLocalStorage(){
  try{PRODUCTS_CACHE=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(PRODUCTS_CACHE))PRODUCTS_CACHE=[]}catch(e){PRODUCTS_CACHE=[]}
  try{BUNDLES_CACHE=JSON.parse(localStorage.getItem('HMF_ADMIN_BUNDLES')||'[]');if(!Array.isArray(BUNDLES_CACHE))BUNDLES_CACHE=[]}catch(e){BUNDLES_CACHE=[]}
  window.__hmfProductsCache=PRODUCTS_CACHE;
}
async function hmfFetchLiveCatalog(){
  try{
    const [pr,br]=await Promise.all([
      fetch('/api/products').then(r=>r.json()).catch(()=>null),
      fetch('/api/bundles').then(r=>r.json()).catch(()=>null)
    ]);
    if(pr&&pr.ok&&Array.isArray(pr.products)){
      PRODUCTS_CACHE=pr.products;window.__hmfProductsCache=PRODUCTS_CACHE;
      try{localStorage.setItem(KEY,JSON.stringify(PRODUCTS_CACHE))}catch(_){}
    }
    if(br&&br.ok&&Array.isArray(br.bundles)){
      BUNDLES_CACHE=br.bundles;
      try{localStorage.setItem('HMF_ADMIN_BUNDLES',JSON.stringify(BUNDLES_CACHE))}catch(_){}
    }
    renderProducts();renderBundles();renderCart();
  }catch(e){
    console.warn('HMF: could not reach the live catalog, showing the last saved copy on this device.',e);
  }
}
const money=n=>'$'+Number(n||0).toFixed(2),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const getP=()=>PRODUCTS_CACHE,getC=()=>JSON.parse(localStorage.getItem(CART)||'[]'),saveC=c=>localStorage.setItem(CART,JSON.stringify(c));const opts=a=>(a||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');function vars(p){return p.variants&&p.variants.length?p.variants:(p.colors||[]).map(c=>({color:c,image:p.image}))}function img(p,c){let v=vars(p).find(x=>String(x.color).toLowerCase()===String(c).toLowerCase());return v?.image||p.image||''}function parts(p){let a=[];if((p.suitSizes||[]).length)a.push('Jacket/Suit');if((p.shirtSizes||[]).length)a.push(p.shirtType||'Shirt');if((p.pantsSizes||[]).length)a.push('Pants');if((p.shoeSizes||[]).length)a.push('Shoes');if((p.beltSizes||[]).length)a.push('Belt');return a.join(' + ')||p.itemType||'Item'}function css(){if(document.getElementById('hmfCss'))return;let s=document.createElement('style');s.id='hmfCss';s.textContent=`.hmf-card-photo{cursor:zoom-in;position:relative;min-height:360px;background:#050609;display:flex;align-items:center;justify-content:center;overflow:hidden}.hmf-card-photo img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}.hmf-card-photo:after{content:"Click to preview";position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.hmf-preview-modal{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;padding:22px}.hmf-preview-modal.show{display:flex}.hmf-preview-box{width:min(1200px,96vw);height:min(760px,92vh);display:grid;grid-template-columns:1.25fr .75fr;background:#0d0f16;border:1px solid rgba(255,255,255,.16);border-radius:24px;overflow:hidden}.hmf-preview-img{background:#050609;display:flex;align-items:center;justify-content:center}.hmf-preview-img img{max-width:100%;max-height:100%;object-fit:contain}.hmf-preview-info{padding:22px;overflow:auto}.hmf-preview-close{float:right;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.06);color:#fff;font-size:26px;border:1px solid rgba(255,255,255,.18)}.hmf-preview-title{font-size:30px;color:#fff}.hmf-preview-price{font-size:26px;color:#e7c36a;font-weight:950}.hmf-preview-pill{display:inline-flex;border:1px solid rgba(231,195,106,.35);background:rgba(231,195,106,.12);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900;margin:0 6px 8px 0}.hmf-preview-fields{display:grid;gap:11px;margin:14px 0}.hmf-preview-fields label{display:grid;gap:6px;font-size:12px;color:rgba(255,255,255,.68);font-weight:900}.hmf-preview-fields select{padding:13px;border-radius:13px;background:#080a10;color:#fff;border:1px solid rgba(255,255,255,.14)}.hmf-preview-add{width:100%;border:0;border-radius:14px;padding:15px;background:#caa24a;color:#111;font-weight:950}@media(max-width:850px){.hmf-preview-box{grid-template-columns:1fr;height:94vh}.hmf-preview-img{height:48vh}}`;document.head.appendChild(s)}function modal(){if(document.getElementById('hmfModal'))return;let d=document.createElement('div');d.id='hmfModal';d.className='hmf-preview-modal';d.innerHTML=`<div class="hmf-preview-box"><div class="hmf-preview-img"><img id="pvImg"></div><div class="hmf-preview-info"><button class="hmf-preview-close" id="pvClose">×</button><div id="pvPills"></div><h2 class="hmf-preview-title" id="pvTitle"></h2><p class="muted" id="pvDesc"></p><div class="hmf-preview-price" id="pvPrice"></div><div class="hmf-preview-fields" id="pvFields"></div><button class="hmf-preview-add" id="pvAdd">Add to Cart</button></div></div>`;document.body.appendChild(d);document.getElementById('pvClose').onclick=()=>d.classList.remove('show');d.onclick=e=>{if(e.target===d)d.classList.remove('show')}}function field(id,label,arr,on=''){return arr&&arr.length?`<label>${label}<select id="${id}" ${on}>${opts(arr)}</select></label>`:''}
function fitAwareFieldsHtml(p,ids){
  const hasFitGroups=Array.isArray(p.fitGroups)&&p.fitGroups.length;
  if(!hasFitGroups){
    return field(ids.suit,'Jacket / Suit Size',p.suitSizes)+field(ids.shirt,'Shirt Size',p.shirtSizes)+field(ids.pants,'Pants Size',p.pantsSizes)+field(ids.shoe,'Shoe Size',p.shoeSizes)+field(ids.belt,'Belt Size',p.beltSizes)+field(ids.fit,'Fit Type',p.fits);
  }
  const g0=p.fitGroups[0];
  const fitNames=p.fitGroups.map(g=>g.fit);
  let html=field(ids.fit,'Fit',fitNames,`onchange="hmfFitGroupChanged('${p.id}',this.value,'${ids.suit}','${ids.shirt}','${ids.pants}','${ids.shoe}')"`);
  html+=field(ids.suit,'Jacket / Suit Size',g0.suitSizes);
  html+=field(ids.shirt,'Shirt Size',g0.shirtSizes);
  html+=field(ids.pants,'Pants Size',g0.pantsSizes);
  html+=field(ids.shoe,'Shoe Size',g0.shoeSizes);
  html+=field(ids.belt,'Belt Size',p.beltSizes);
  return html;
}
window.hmfFitGroupChanged=function(productId,fitName,suitId,shirtId,pantsId,shoeId){
  const p=getP().find(x=>x.id===productId);if(!p||!Array.isArray(p.fitGroups))return;
  const g=p.fitGroups.find(x=>x.fit===fitName)||p.fitGroups[0];
  if(!g)return;
  const setSel=(id,arr)=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=opts(arr);};
  setSel(suitId,g.suitSizes);
  setSel(shirtId,g.shirtSizes);
  setSel(pantsId,g.pantsSizes);
  setSel(shoeId,g.shoeSizes);
};function colorChanged(id,sel){let p=getP().find(x=>x.id===id);let im=document.getElementById('img_'+id);if(p&&im)im.src=img(p,sel.value)}window.hmfColorChanged=colorChanged;window.hmfOpenOutfitPreview=function(id){let p=getP().find(x=>x.id===id);if(!p)return;modal();let v=vars(p),colors=v.map(x=>x.color);document.getElementById('pvImg').src=img(p,colors[0]);document.getElementById('pvTitle').textContent=p.name||'';document.getElementById('pvDesc').textContent=p.description||'';document.getElementById('pvPrice').textContent=money(p.price);document.getElementById('pvPills').innerHTML=`<span class="hmf-preview-pill">${esc(p.styleNumber?'Style '+p.styleNumber:(p.productMode==='single'?'Single Item':'Outfit'))}</span><span class="hmf-preview-pill">${esc(parts(p))}</span>`;document.getElementById('pvFields').innerHTML=fitAwareFieldsHtml(p,{fit:'pv_fit',suit:'pv_suit',shirt:'pv_shirt',pants:'pv_pants',shoe:'pv_shoe',belt:'pv_belt'})+field('pv_color','Color',colors);let pc=document.getElementById('pv_color');if(pc)pc.onchange=()=>document.getElementById('pvImg').src=img(p,pc.value);document.getElementById('pvAdd').onclick=()=>{hmfAddAdminProductToCart(id,{suitSize:document.getElementById('pv_suit')?.value||'',shirtSize:document.getElementById('pv_shirt')?.value||'',pantsSize:document.getElementById('pv_pants')?.value||'',shoeSize:document.getElementById('pv_shoe')?.value||'',beltSize:document.getElementById('pv_belt')?.value||'',color:document.getElementById('pv_color')?.value||'',fit:document.getElementById('pv_fit')?.value||''});document.getElementById('hmfModal').classList.remove('show')};document.getElementById('hmfModal').classList.add('show')};window.hmfAddAdminProductToCart=function(id,ch={}){let p=getP().find(x=>x.id===id);if(!p)return;let color=ch.color??document.getElementById('hmf_color_'+id)?.value??'';let item={id:p.id,name:p.name,price:Number(p.price||0),styleNumber:p.styleNumber||'',productMode:p.productMode||'',itemType:p.itemType||'',suitSize:ch.suitSize??document.getElementById('hmf_suit_'+id)?.value??'',shirtSize:ch.shirtSize??document.getElementById('hmf_shirt_'+id)?.value??'',pantsSize:ch.pantsSize??document.getElementById('hmf_pants_'+id)?.value??'',shoeSize:ch.shoeSize??document.getElementById('hmf_shoe_'+id)?.value??'',beltSize:ch.beltSize??document.getElementById('hmf_belt_'+id)?.value??'',color,fit:ch.fit??document.getElementById('hmf_fit_'+id)?.value??'',image:img(p,color),qty:1};item.cartKey=[item.id,item.suitSize,item.shirtSize,item.pantsSize,item.shoeSize,item.beltSize,item.color,item.fit].join('|');let c=getC(),f=c.find(x=>x.cartKey===item.cartKey);f?f.qty++:c.push(item);saveC(c);renderCart();try{document.getElementById('cart')?.scrollIntoView({behavior:'smooth'})}catch(_){}};window.hmfChangeAdminCartQty=(k,d)=>{let c=getC(),i=c.find(x=>x.cartKey===k);if(!i)return;i.qty+=d;if(i.qty<=0)c=c.filter(x=>x.cartKey!==k);saveC(c);renderCart()};window.hmfRemoveAdminCartItem=k=>{saveC(getC().filter(x=>x.cartKey!==k));renderCart()};function renderProducts(){let grid=document.getElementById('productGrid');if(!grid)return;let p=getP();if(!p.length){grid.innerHTML='<div class="muted" style="grid-column:1/-1;padding:18px;border:1px dashed rgba(255,255,255,.16);border-radius:16px;">No products added yet.</div>';return}grid.innerHTML=p.map(x=>{let v=vars(x),colors=v.map(y=>y.color);return `<div class="product-card hmf-admin-card"><div class="product-img hmf-card-photo" onclick="hmfOpenOutfitPreview('${x.id}')" style="border-radius:18px;"><img id="img_${x.id}" src="${esc(img(x,colors[0]))}"></div><div class="product-body"><div class="pillrow"><span class="pill">${esc(x.styleNumber?'Style '+x.styleNumber:(x.productMode==='single'?'Single Item':'Outfit'))}</span><span class="pill">${esc(parts(x))}</span></div><h3 onclick="hmfOpenOutfitPreview('${x.id}')" style="cursor:zoom-in">${esc(x.name)}</h3><p class="muted">${esc(x.description)}</p><div class="price big">${money(x.price)}</div><div style="display:grid;gap:10px;margin:14px 0;">${fitAwareFieldsHtml(x,{fit:'hmf_fit_'+x.id,suit:'hmf_suit_'+x.id,shirt:'hmf_shirt_'+x.id,pants:'hmf_pants_'+x.id,shoe:'hmf_shoe_'+x.id,belt:'hmf_belt_'+x.id})}${colors.length?`<label>Color<select id="hmf_color_${x.id}" onchange="hmfColorChanged('${x.id}',this)">${opts(colors)}</select></label>`:''}</div><button class="btn ghost full" onclick="hmfOpenOutfitPreview('${x.id}')">Preview</button><button class="btn primary full" style="margin-top:8px" onclick="hmfAddAdminProductToCart('${x.id}')">Add to Cart</button></div></div>`}).join('')}function renderCart(){let items=document.getElementById('cartItems'),total=document.getElementById('cartTotal'),badge=document.getElementById('cartCountBadge');if(!items||!total)return;let c=getC();if(badge)badge.textContent=c.reduce((s,x)=>s+Number(x.qty||0),0);total.textContent=money(c.reduce((s,x)=>s+x.price*x.qty,0));items.innerHTML=c.length?c.map(i=>`<div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b>${esc(i.name)}</b><div class="muted tiny">${i.isBundle?('Bundle • Includes: '+esc(i.itemsLabel||'')):(`${i.styleNumber?`Style: ${esc(i.styleNumber)} • `:''}${i.suitSize?`Jacket/Suit: ${esc(i.suitSize)} • `:''}${i.shirtSize?`Shirt: ${esc(i.shirtSize)} • `:''}${i.pantsSize?`Pants: ${esc(i.pantsSize)} • `:''}${i.shoeSize?`Shoes: ${esc(i.shoeSize)} • `:''}${i.beltSize?`Belt: ${esc(i.beltSize)} • `:''}Color: ${esc(i.color||'')}`)}</div><div class="muted tiny">${money(i.price)} x ${i.qty}</div><button class="iconbtn" onclick="hmfChangeAdminCartQty('${esc(i.cartKey)}',-1)">−</button> <button class="iconbtn" onclick="hmfChangeAdminCartQty('${esc(i.cartKey)}',1)">+</button> <button class="btn ghost" onclick="hmfRemoveAdminCartItem('${esc(i.cartKey)}')">Remove</button></div>`).join(''):'<div class="muted">Your cart is empty.</div>'}

/* ===== BUNDLES: combos of existing products sold at a set price ===== */
const BUNDLE_KEY='HMF_ADMIN_BUNDLES';
const getB=()=>BUNDLES_CACHE;
function bundleImg(b){if(b.image)return b.image;let items=(b.itemIds||[]).map(id=>getP().find(p=>p.id===id)).filter(Boolean);let first=items[0];if(!first)return'./images/logo-hmf-gold.png';let v=vars(first);return(v[0]&&v[0].image)||first.image||'./images/logo-hmf-gold.png'}
function renderBundles(){
  let grid=document.getElementById('hmfBundlesGrid');
  let section=document.getElementById('bundlesSection');
  if(!grid)return;
  let bundles=getB();
  if(!bundles.length){grid.innerHTML='<div class="muted" style="grid-column:1/-1;padding:18px;border:1px dashed rgba(255,255,255,.16);border-radius:16px;">No bundles yet. Add products in Admin, then combine them into a bundle.</div>';return}
  let products=getP();
  grid.innerHTML=bundles.map(b=>{
    let items=(b.itemIds||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean);
    let itemsTotal=items.reduce((s,p)=>s+Number(p.price||0),0);
    let savings=itemsTotal-Number(b.price||0);
    return `<div class="hmf-feature-card hmf-bundle-card"><div class="hmf-feature-img"><img src="${esc(bundleImg(b))}" onerror="this.src='./images/logo-hmf-gold.png'" alt="${esc(b.name||'Bundle')}"></div><div class="hmf-feature-body"><h3>${esc(b.name||'Bundle')}</h3><p class="muted">${esc(b.description||'')}</p><p class="muted tiny">Includes: ${esc(items.map(p=>p.name).join(', ')||'')}</p><div class="hmf-price">${money(b.price)}${savings>0?` <span style="color:#65ef9a;font-size:13px;font-weight:800">Save ${money(savings)}</span>`:''}</div><button class="btn primary full" style="margin-top:10px" onclick="hmfAddBundleToCart('${b.id}')" type="button">Add Bundle to Cart</button></div></div>`;
  }).join('');
}
window.hmfAddBundleToCart=function(bundleId){
  let b=getB().find(x=>x.id===bundleId);if(!b)return;
  let products=getP();
  let items=(b.itemIds||[]).map(id=>products.find(p=>p.id===id)).filter(Boolean);
  let item={id:'bundle_'+b.id,name:b.name||'Bundle',price:Number(b.price||0),qty:1,isBundle:true,itemsLabel:items.map(p=>p.name).join(', '),image:bundleImg(b),cartKey:'bundle_'+b.id};
  let c=getC(),f=c.find(x=>x.cartKey===item.cartKey);
  f?f.qty++:c.push(item);
  saveC(c);renderCart();
  try{document.getElementById('cart')?.scrollIntoView({behavior:'smooth'});}catch(_){}
};
window.hmfAddBundleBySlug=function(slug){
  let b=getB().find(x=>String(x.slug||'').toLowerCase()===String(slug||'').toLowerCase());
  if(!b)return false;
  window.hmfAddBundleToCart(b.id);
  return true;
};

function init(){hmfLoadCachedFromLocalStorage();css();modal();renderProducts();renderBundles();renderCart();hmfFetchLiveCatalog()}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();})();


/* === HMF RESTORE BIG PRODUCT PREVIEW ONLY === */
(function(){
  function getProductsSafe(){
    if(Array.isArray(window.__hmfProductsCache)) return window.__hmfProductsCache;
    try{
      const raw = localStorage.getItem("HMF_ADMIN_PRODUCTS") || "[]";
      const data = JSON.parse(raw);
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

  function findProductFromCard(card){
    const titleEl = card.querySelector("h3");
    const title = titleEl ? titleEl.textContent.trim() : "";
    const imgEl = card.querySelector("img");
    const img = imgEl ? (imgEl.getAttribute("src") || imgEl.src || "") : "";
    const imgFile = img.split("/").pop();

    const products = getProductsSafe();

    return products.find(p => String(p.name || "").trim() === title)
      || products.find(p => String(p.title || "").trim() === title)
      || products.find(p => {
        const pImg = String(p.image || (p.variants && p.variants[0] && p.variants[0].image) || "");
        return pImg && imgFile && pImg.includes(imgFile);
      })
      || null;
  }

  function optionHtml(arr){
    return (arr || []).map(x => `<option>${esc(x)}</option>`).join("");
  }

  function openFallbackPreview(p, card){
    let old = document.getElementById("hmfBigPreviewFixed");
    if(old) old.remove();

    const variants = Array.isArray(p.variants) ? p.variants : [];
    const firstVariant = variants[0] || {};
    const image = p.image || firstVariant.image || "./images/logo-hmf-gold.png";
    const colors = variants.map(v => v.color).filter(Boolean);
    const suitSizes = p.suitSizes || p.sizes || [];
    const shirtSizes = p.shirtSizes || [];
    const pantsSizes = p.pantsSizes || [];
    const shoeSizes = p.shoeSizes || [];
    const fits = p.fits || p.fitTypes || [];
    const category = p.category || (p.productMode === "single" ? "Single Item" : "Outfit");

    const modal = document.createElement("div");
    modal.id = "hmfBigPreviewFixed";
    modal.innerHTML = `
      <div class="hmf-big-preview-bg">
        <div class="hmf-big-preview-box">
          <button class="hmf-big-preview-close" type="button">×</button>
          <div class="hmf-big-preview-img">
            <img id="hmfBigPreviewImg" src="${esc(image)}" onerror="this.src='./images/logo-hmf-gold.png'">
          </div>
          <div class="hmf-big-preview-info">
            <div class="hmf-big-pill">${esc(category)}</div>
            <h2>${esc(p.name || p.title || "H Men's Fashion Product")}</h2>
            <p>${esc(p.description || "")}</p>
            <div class="hmf-big-price">$${Number(p.price || 0).toFixed(2)}</div>

            ${suitSizes.length ? `<label>Jacket / Suit Size</label><select>${optionHtml(suitSizes)}</select>` : ""}
            ${shirtSizes.length ? `<label>Shirt Size</label><select>${optionHtml(shirtSizes)}</select>` : ""}
            ${pantsSizes.length ? `<label>Pants Size</label><select>${optionHtml(pantsSizes)}</select>` : ""}
            ${shoeSizes.length ? `<label>Shoe Size</label><select>${optionHtml(shoeSizes)}</select>` : ""}
            ${colors.length ? `<label>Color</label><select id="hmfBigPreviewColor">${optionHtml(colors)}</select>` : ""}
            ${fits.length ? `<label>Fit Type</label><select>${optionHtml(fits)}</select>` : ""}

            <button class="hmf-big-add" type="button">Add to Cart</button>
          </div>
        </div>
      </div>
      <style>
        #hmfBigPreviewFixed{position:fixed;inset:0;z-index:999999}
        .hmf-big-preview-bg{position:absolute;inset:0;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:26px}
        .hmf-big-preview-box{width:min(1220px,96vw);height:min(790px,92vh);background:#0d1018;border:1px solid rgba(255,255,255,.16);border-radius:26px;display:grid;grid-template-columns:1.55fr .9fr;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.65);position:relative}
        .hmf-big-preview-close{position:absolute;right:18px;top:18px;z-index:3;width:48px;height:48px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.09);color:#fff;font-size:32px;font-weight:900;cursor:pointer}
        .hmf-big-preview-img{background:#050609;display:grid;place-items:center;min-width:0;min-height:0}
        .hmf-big-preview-img img{width:100%;height:100%;object-fit:contain}
        .hmf-big-preview-info{padding:34px;overflow:auto;color:#fff}
        .hmf-big-preview-info h2{font-size:34px;line-height:1.1;margin:14px 0}
        .hmf-big-preview-info p{color:#c9c3b0;font-size:18px;line-height:1.35}
        .hmf-big-price{font-size:32px;font-weight:950;color:#f0d27a;margin:16px 0}
        .hmf-big-preview-info label{display:block;margin:13px 0 6px;font-weight:900;color:#d6d2c8}
        .hmf-big-preview-info select{width:100%;padding:14px;border-radius:14px;background:#080a10;color:#fff;border:1px solid rgba(255,255,255,.16);font-size:16px}
        .hmf-big-pill{display:inline-flex;border:1px solid rgba(240,210,122,.35);border-radius:999px;padding:8px 12px;color:#fff2bd;font-weight:900;background:rgba(240,210,122,.10)}
        .hmf-big-add{width:100%;margin-top:20px;padding:16px;border:0;border-radius:16px;background:linear-gradient(135deg,#f0d27a,#d4af52);font-weight:950;color:#111;cursor:pointer}
        @media(max-width:850px){.hmf-big-preview-box{grid-template-columns:1fr;height:94vh}.hmf-big-preview-img{height:48vh}}
      </style>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".hmf-big-preview-close").onclick = () => modal.remove();
    modal.querySelector(".hmf-big-preview-bg").addEventListener("click", (e) => {
      if(e.target.classList.contains("hmf-big-preview-bg")) modal.remove();
    });

    const colorSel = modal.querySelector("#hmfBigPreviewColor");
    if(colorSel){
      colorSel.addEventListener("change", () => {
        const found = variants.find(v => String(v.color) === colorSel.value);
        if(found && found.image) modal.querySelector("#hmfBigPreviewImg").src = found.image;
      });
    }

    modal.querySelector(".hmf-big-add").onclick = () => {
      const addButton = Array.from(card.querySelectorAll("button, .btn")).find(b => /add to cart/i.test(b.textContent || ""));
      if(addButton) addButton.click();
      modal.remove();
    };
  }

  function isInteractive(el){
    return !!(el.closest("button,a,select,input,textarea,label,.btn"));
  }

  function tryOpen(card){
    const p = findProductFromCard(card);
    if(!p) return false;

    if(typeof window.openProductPreview === "function"){ window.openProductPreview(p); return true; }
    if(typeof window.showProductPreview === "function"){ window.showProductPreview(p); return true; }
    if(typeof window.hmfOpenPreview === "function"){ window.hmfOpenPreview(p); return true; }

    openFallbackPreview(p, card);
    return true;
  }

  if(!window.__HMF_RESTORE_BIG_PREVIEW_ONLY__){
    window.__HMF_RESTORE_BIG_PREVIEW_ONLY__ = true;

    document.addEventListener("click", function(e){
      if(isInteractive(e.target)) return;

      const card = e.target.closest(".hmf-admin-card, .product-card, [data-product-id]");
      if(!card) return;

      if(tryOpen(card)){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    document.addEventListener("click", function(e){
      if(isInteractive(e.target)) return;

      const photo = e.target.closest(".hmf-card-photo, .product-photo, .click-preview, img");
      if(!photo) return;

      const card = photo.closest(".hmf-admin-card, .product-card, [data-product-id]");
      if(!card) return;

      if(tryOpen(card)){
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
})();

