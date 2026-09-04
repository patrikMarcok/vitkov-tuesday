import { FIREBASE_CONFIG, IS_FIREBASE_CONFIGURED } from "./config";

// Local-only fallback store, used until Firebase is configured (see
// README.md). Lets you try the app immediately; attendance just won't be
// shared between devices yet.
const LOCAL_KEY = "training-schedule:attendance";

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

let firestoreApi = null;

async function getFirestoreApi() {
  if (!IS_FIREBASE_CONFIGURED) return null;
  if (firestoreApi) return firestoreApi;

  const { initializeApp } = await import("firebase/app");
  const { getFirestore, collection, doc, onSnapshot, setDoc, deleteField } =
    await import("firebase/firestore");

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  firestoreApi = { db, collection, doc, onSnapshot, setDoc, deleteField };
  return firestoreApi;
}

// Subscribes to attendance changes. Calls onData with a map of
// { [dateKey]: { [playerId]: true } } whenever it changes (true = marked
// as "can't make it"). Returns an unsubscribe function.
export async function subscribeAttendance(onData) {
  const api = await getFirestoreApi();

  if (!api) {
    onData(readLocal());
    // Poll localStorage for changes made in other tabs on this device.
    const handler = (e) => {
      if (e.key === LOCAL_KEY) onData(readLocal());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const { db, collection, onSnapshot } = api;
  const unsub = onSnapshot(collection(db, "attendance"), (snap) => {
    const data = {};
    snap.forEach((docSnap) => {
      data[docSnap.id] = docSnap.data();
    });
    onData(data);
  });
  return unsub;
}

// Toggles whether `playerId` is marked out for `dateKey`.
export async function setOut(dateKey, playerId, isOut) {
  const api = await getFirestoreApi();

  if (!api) {
    const data = readLocal();
    data[dateKey] = { ...data[dateKey] };
    if (isOut) {
      data[dateKey][playerId] = true;
    } else {
      delete data[dateKey][playerId];
    }
    writeLocal(data);
    return;
  }

  const { db, doc, setDoc, deleteField } = api;
  await setDoc(
    doc(db, "attendance", dateKey),
    { [playerId]: isOut ? true : deleteField() },
    { merge: true }
  );
}
