// Small-room peer-to-peer WebRTC demo. STUN only: some networks require a TURN server.
// Mesh bandwidth grows quickly; this is NOT suitable for large public rooms.
import { db } from "./firebase.js";
import { collection, doc, setDoc, getDoc, onSnapshot, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];
export class RoomMedia {
  constructor(roomId, user, onStream) {
    this.roomId = roomId; this.user = user; this.onStream = onStream;
    this.localStream = null; this.peers = new Map(); this.unsub = [];
  }
  async startLocal({ audio = true, video = true } = {}) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio, video });
    this.onStream(this.user.uid, this.user.displayName || "You", this.localStream, true);
    return this.localStream;
  }
  async connectToMembers(members) {
    for (const member of members) {
      if (member.uid === this.user.uid || this.peers.has(member.uid)) continue;
      // Deterministic caller avoids duplicate offer creation.
      if (this.user.uid < member.uid) await this.makeOffer(member);
      else this.watchIncoming(member);
    }
  }
  path(peerUid) { const [a,b] = [this.user.uid, peerUid].sort(); return doc(db, "rooms", this.roomId, "calls", `${a}_${b}`); }
  async makeOffer(member) {
    const pc = this.createPeer(member);
    const callRef = this.path(member.uid);
    const callerCandidates = collection(callRef, "callerCandidates");
    pc.onicecandidate = e => { if (e.candidate) addDoc(callerCandidates, e.candidate.toJSON()).catch(console.error); };
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    await setDoc(callRef, { caller: this.user.uid, callee: member.uid, offer: { type: offer.type, sdp: offer.sdp } });
    const unsub = onSnapshot(callRef, async snap => {
      const data = snap.data();
      if (!data || !data.answer || pc.currentRemoteDescription) return;
      await pc.setRemoteDescription(data.answer);
    });
    this.unsub.push(unsub);
    this.watchCandidates(callRef, "receiverCandidates", pc);
  }
  watchIncoming(member) {
    const callRef = this.path(member.uid);
    const unsub = onSnapshot(callRef, async snap => {
      const data = snap.data();
      if (!data?.offer || data.callee !== this.user.uid || this.peers.has(member.uid + "_answered")) return;
      this.peers.set(member.uid + "_answered", true);
      const pc = this.createPeer(member);
      pc.onicecandidate = e => { if (e.candidate) addDoc(collection(callRef, "receiverCandidates"), e.candidate.toJSON()).catch(console.error); };
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      await setDoc(callRef, { ...data, answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
      this.watchCandidates(callRef, "callerCandidates", pc);
    });
    this.unsub.push(unsub);
  }
  createPeer(member) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.peers.set(member.uid, pc);
    this.localStream?.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    pc.ontrack = e => this.onStream(member.uid, member.displayName || "Member", e.streams[0], false);
    pc.onconnectionstatechange = () => { if (["failed","closed","disconnected"].includes(pc.connectionState)) this.removePeer(member.uid); };
    return pc;
  }
  watchCandidates(callRef, subName, pc) {
    const unsub = onSnapshot(collection(callRef, subName), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(console.warn);
      });
    });
    this.unsub.push(unsub);
  }
  async removePeer(uid) {
    const pc = this.peers.get(uid); if (pc) pc.close();
    this.peers.delete(uid); this.peers.delete(uid + "_answered");
  }
  async stop() {
    this.unsub.forEach(fn => fn()); this.unsub = [];
    for (const pc of this.peers.values()) if (pc instanceof RTCPeerConnection) pc.close();
    this.peers.clear();
    this.localStream?.getTracks().forEach(t => t.stop()); this.localStream = null;
  }
}
