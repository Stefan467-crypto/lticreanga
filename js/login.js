import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { $, toast } from "./core.js";
const MSG = { "auth/invalid-credential": "Email sau parolă incorecte", "auth/operation-not-allowed": "Email/Password nu este activat în Firebase", "auth/user-disabled": "Cont dezactivat", "auth/too-many-requests": "Prea multe încercări, așteaptă puțin", "auth/network-request-failed": "Fără conexiune" };
$("#form").onsubmit = async e => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, $("#em").value.trim(), $("#pw").value); location.href = "index.html"; } catch (x) { toast(MSG[x.code] || "Eroare: " + x.code); } };
$("#reset").onclick = async () => { const em = $("#em").value.trim(); if (!em) return toast("Scrie emailul mai întâi"); try { await sendPasswordResetEmail(auth, em); toast("Email de resetare trimis"); } catch (x) { toast("Emailul nu a putut fi trimis"); } };
