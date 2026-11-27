import { db } from "./firebase.js";
import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, setDoc, serverTimestamp, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function createRoom(user, title, category, description) {
  const ref = await addDoc(collection(db, "rooms"), {
    title, category, description, ownerUid: user.uid,
    ownerName: user.displayName || "Member", status: "open",
    createdAt: serverTimestamp(), memberCount: 0
  });
  return ref.id;
}
export async function listRooms() {
  const q = query(collection(db, "rooms"), where("status", "==", "open"), orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function joinRoom(roomId, user) {
  const memberRef = doc(db, "rooms", roomId, "members", user.uid);
  await setDoc(memberRef, { uid: user.uid, displayName: user.displayName || "Member", joinedAt: serverTimestamp() });
}
export async function leaveRoom(roomId, uid) {
  const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await deleteDoc(doc(db, "rooms", roomId, "members", uid));
}
export function watchMembers(roomId, callback) {
  return onSnapshot(collection(db, "rooms", roomId, "members"), snap => callback(snap.docs.map(d => d.data())));
}
export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
