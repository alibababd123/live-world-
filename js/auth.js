import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function watchAuth(callback) { return onAuthStateChanged(auth, callback); }

export async function registerUser(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid, displayName: name, email,
    createdAt: serverTimestamp(), bio: "", country: ""
  });
  return credential.user;
}
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, "users", credential.user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) await setDoc(userRef, { uid: credential.user.uid, displayName: credential.user.displayName || "Member", email, createdAt: serverTimestamp(), bio: "", country: "" });
  return credential.user;
}
export async function logoutUser() { return signOut(auth); }
