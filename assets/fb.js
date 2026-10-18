/* Firebase connection for the Gramin Seva Centre website.
   - Live notices (Cloud Firestore, Mumbai asia-south1): anyone can read, only staff on the admins list can write.
   - Staff sign-in (Firebase Authentication, email and password).
   - App Check with reCAPTCHA Enterprise: checks that database requests come from this website.
   Exposes window.GSCFB and fires the "gsc:fb-ready" event. Loaded as an ES module. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app-check.js";
import { getFirestore, collection, doc, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const CONFIG = {
  apiKey: "AIzaSyDaKAgDRYlvfWQORABw7esuTwaIYK7HPVQ",
  authDomain: "gramin-seva-centre.firebaseapp.com",
  projectId: "gramin-seva-centre",
  storageBucket: "gramin-seva-centre.firebasestorage.app",
  messagingSenderId: "718997887326",
  appId: "1:718997887326:web:21cd34327247c82a0957cf"
};
const RECAPTCHA_SITE_KEY = "6Le2SvUtAAAAAARP9CdfZr-gG_W8EbzxCYoxkuc1";

const app = initializeApp(CONFIG);

/* App Check (reCAPTCHA Enterprise / Fraud Defense). Tokens are attached to Firestore and Function calls. */
try {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
} catch (e) { /* the site keeps working; enforcement is switched on separately in the console */ }

const db = getFirestore(app);
const auth = getAuth(app);

function iso(ts) {
  if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  return "";
}
function toNotice(id, d) {
  return {
    id: id,
    text: String(d.text || ""),
    textBn: String(d.textBn || ""),
    level: d.level === "urgent" ? "urgent" : "info",
    until: String(d.until || ""),
    active: d.active !== false,
    createdAt: iso(d.createdAt) || new Date().toISOString()
  };
}
function toRequest(id, d) {
  return {
    id: id, kind: String(d.kind || ""), name: String(d.name || ""), phone: String(d.phone || ""),
    service: String(d.service || ""), bestTime: String(d.bestTime || ""), message: String(d.message || ""),
    rating: d.rating || null, createdAt: iso(d.createdAt)
  };
}

const GSCFB = {
  /* Calls back with the live list of notices, or null if the service cannot be reached. Returns an unsubscribe function. */
  subscribeNotices: function (cb) {
    return onSnapshot(
      query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(100)),
      function (snap) { cb(snap.docs.map(function (d) { return toNotice(d.id, d.data()); })); },
      function () { cb(null); }
    );
  },
  addNotice: function (data) {
    return addDoc(collection(db, "notices"), Object.assign({}, data, { createdAt: serverTimestamp(), by: auth.currentUser.uid }));
  },
  updateNotice: function (id, data) { return updateDoc(doc(db, "notices", id), data); },
  deleteNotice: function (id) { return deleteDoc(doc(db, "notices", id)); },
  signIn: function (email, password) { return signInWithEmailAndPassword(auth, email, password); },
  signOut: function () { return signOut(auth); },
  onUser: function (cb) { return onAuthStateChanged(auth, cb); },
};

window.GSCFB = GSCFB;
window.dispatchEvent(new Event("gsc:fb-ready"));
