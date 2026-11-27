import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
export async function sendMessage(roomId, user, message) {
  const clean = message.trim();
  if (!clean || clean.length > 500) return;
  await addDoc(collection(db, "rooms", roomId, "messages"), {
    uid: user.uid, displayName: user.displayName || "Member",
    text: clean, createdAt: serverTimestamp()
  });
}
export function watchMessages(roomId, callback) {
  const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(100));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
