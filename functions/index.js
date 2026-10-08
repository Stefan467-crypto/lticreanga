// Postează automat anunțurile (cu bifa "Facebook și Instagram") pe pagina de Facebook și contul de Instagram.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const TOKEN = defineSecret("META_PAGE_TOKEN");
const G = "https://graph.facebook.com/v21.0/";

exports.socialPost = onDocumentCreated({ document: "anunturi/{id}", secrets: [TOKEN], region: "europe-west1" }, async ev => {
  const d = ev.data.data(); if (!d.social) return;
  const FB = process.env.FB_PAGE_ID, IG = process.env.IG_USER_ID, tk = TOKEN.value();
  const msg = `${d.t}\n\n${d.b}`, st = {};
  const call = async (path, p) => {
    const r = await fetch(G + path, { method: "POST", body: new URLSearchParams({ ...p, access_token: tk }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || r.status); return j;
  };
  try { d.img ? await call(`${FB}/photos`, { url: d.img, caption: msg }) : await call(`${FB}/feed`, { message: msg }); st.facebook = "ok"; } catch (e) { st.facebook = e.message; }
  if (d.img) {
    try {
      const jpg = d.img.replace("/upload/", "/upload/f_jpg,q_auto/");
      const c = await call(`${IG}/media`, { image_url: jpg, caption: msg });
      await call(`${IG}/media_publish`, { creation_id: c.id }); st.instagram = "ok";
    } catch (e) { st.instagram = e.message; }
  } else st.instagram = "necesită imagine";
  await ev.data.ref.update({ socialStatus: st });
});
