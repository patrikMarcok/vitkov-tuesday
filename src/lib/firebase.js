import { FIREBASE_CONFIG, IS_FIREBASE_CONFIGURED } from "../config";

const LOCAL_KEY = "training-schedule:attendance";
const LOCAL_ROSTER_KEY = "training-schedule:players";
const LOCAL_FINANCE_KEY = "training-schedule:absence-fee";

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

function readLocalRoster() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROSTER_KEY) || "null");
  } catch {
    return null;
  }
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

export async function subscribeAttendance(onData) {
  const api = await getFirestoreApi();

  if (!api) {
    onData(readLocal());
    const handler = (event) => {
      if (event.key === LOCAL_KEY) onData(readLocal());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const { db, collection, onSnapshot } = api;
  return onSnapshot(collection(db, "attendance"), (snapshot) => {
    const data = {};
    snapshot.forEach((document) => {
      data[document.id] = document.data();
    });
    onData(data);
  });
}

export async function subscribeRoster(onData) {
  const api = await getFirestoreApi();

  if (!api) {
    onData(readLocalRoster());
    const handler = (event) => {
      if (event.key === LOCAL_ROSTER_KEY) onData(readLocalRoster());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const { db, doc, onSnapshot } = api;
  return onSnapshot(doc(db, "settings", "roster"), (snapshot) => {
    onData(snapshot.exists() ? snapshot.data().players : null);
  });
}

export async function saveRoster(players) {
  const api = await getFirestoreApi();
  localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(players));
  if (!api) return;

  const { db, doc, setDoc } = api;
  await setDoc(doc(db, "settings", "roster"), { players });
}

export async function subscribeFinance(onData) {
  const api = await getFirestoreApi();

  if (!api) {
    const fee = Number(localStorage.getItem(LOCAL_FINANCE_KEY));
    onData(Number.isFinite(fee) && fee >= 0 ? fee : 300);
    const handler = (event) => {
      if (event.key === LOCAL_FINANCE_KEY) onData(Number(event.newValue) || 300);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const { db, doc, onSnapshot } = api;
  return onSnapshot(doc(db, "settings", "finance"), (snapshot) => {
    const fee = snapshot.data()?.absenceFee;
    onData(Number.isFinite(fee) && fee >= 0 ? fee : 300);
  });
}

export async function saveAbsenceFee(fee) {
  const api = await getFirestoreApi();
  localStorage.setItem(LOCAL_FINANCE_KEY, String(fee));
  if (!api) return;

  const { db, doc, setDoc } = api;
  await setDoc(doc(db, "settings", "finance"), { absenceFee: fee }, { merge: true });
}

export async function setOut(dateKey, playerId, isOut) {
  const api = await getFirestoreApi();

  if (!api) {
    const data = readLocal();
    data[dateKey] = { ...data[dateKey] };
    if (isOut) data[dateKey][playerId] = true;
    else delete data[dateKey][playerId];
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