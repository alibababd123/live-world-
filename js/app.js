import { auth, db, isFirebaseConfigured } from "./firebase.js";
import { watchAuth, registerUser, loginUser, logoutUser } from "./auth.js";
import { createRoom, listRooms, joinRoom, leaveRoom, watchMembers, getRoom } from "./rooms.js";
import { sendMessage, watchMessages } from "./chat.js";
import { RoomMedia } from "./webrtc.js";

const $ = id => document.getElementById(id);
let currentUser = null, authMode = "login", activeRoom = null, roomUnsubs = [], media = null, currentMembers = [], localMic = true, localCam = false, toastTimer;
$("year").textContent = new Date().getFullYear();

function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2800); }
function showModal(id) { $(id).classList.remove("hidden"); }
function hideModal(id) { $(id).classList.add("hidden"); }
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hideModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m && m.id!=="room-modal") hideModal(m.id)}));

function setAuthMode(mode) {
  authMode=mode;
  document.querySelectorAll("[data-auth-mode]").forEach(b=>b.classList.toggle("active",b.dataset.authMode===mode));
  $("name-wrap").classList.toggle("hidden",mode!=="signup");
  $("auth-submit").textContent=mode==="signup"?"অ্যাকাউন্ট তৈরি":"লগইন";
  $("password").autocomplete=mode==="signup"?"new-password":"current-password";
  $("auth-message").textContent="";
}
document.querySelectorAll("[data-auth-mode]").forEach(b=>b.addEventListener("click",()=>setAuthMode(b.dataset.authMode)));
$("open-auth").addEventListener("click",()=>{setAuthMode("login");showModal("auth-modal")});
$("sign-out").addEventListener("click",async()=>{await logoutUser();toast("লগআউট হয়েছে")});

$("auth-form").addEventListener("submit",async e=>{
  e.preventDefault(); const email=$("email").value.trim(), password=$("password").value;
  $("auth-submit").disabled=true; $("auth-message").textContent="অপেক্ষা করো…";
  try {
    if(authMode==="signup") { const name=$("display-name").value.trim(); if(!name) throw new Error("তোমার নাম লিখো।"); await registerUser(name,email,password); }
    else await loginUser(email,password);
    hideModal("auth-modal"); $("auth-form").reset(); toast("স্বাগতম LiveWorld-এ!");
  } catch(err) { $("auth-message").textContent=translateError(err); }
  finally {$("auth-submit").disabled=false;}
});
function translateError(err) {
  const code=err?.code||"";
  const map={"auth/email-already-in-use":"এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে।","auth/invalid-email":"সঠিক ইমেইল দাও।","auth/weak-password":"আরও শক্তিশালী পাসওয়ার্ড দাও।","auth/invalid-credential":"ইমেইল বা পাসওয়ার্ড সঠিক নয়।","auth/network-request-failed":"ইন্টারনেট সংযোগ পরীক্ষা করো।","permission-denied":"Firebase Security Rules পরীক্ষা করতে হবে।"};
  return map[code]||err.message||"কাজটি সম্পন্ন হয়নি।";
}

async function refreshRooms() {
  if(!isFirebaseConfigured) return;
  try {
    const rooms=await listRooms(); $("room-count").textContent=rooms.length;
    $("room-list").innerHTML="";
    if(!rooms.length){$("room-list").innerHTML='<div class="empty-state">এখনো কোনো রুম নেই। প্রথম রুমটি তুমি তৈরি করতে পারো।</div>';return;}
    rooms.forEach(room=>{
      const card=document.createElement("article"); card.className="room-card";
      const top=document.createElement("div"); top.className="room-card-top";
      const cat=document.createElement("span");cat.className="category";cat.textContent=room.category||"সাধারণ";
      const live=document.createElement("span");live.className="room-live";live.textContent="● OPEN";top.append(cat,live);
      const h=document.createElement("h3");h.textContent=room.title;
      const p=document.createElement("p");p.textContent=room.description||"এই রুমে যোগ দিয়ে আলোচনায় অংশ নাও।";
      const bottom=document.createElement("div");bottom.className="room-card-bottom";
      const owner=document.createElement("span");owner.textContent="Host: "+(room.ownerName||"Member");
      const join=document.createElement("button");join.className="join-btn";join.textContent="যোগ দাও ↗";join.addEventListener("click",()=>enterRoom(room.id));
      bottom.append(owner,join);card.append(top,h,p,bottom);$("room-list").append(card);
    });
  } catch(err) { console.error(err); toast("রুম লোড হয়নি: "+translateError(err)); }
}
$("refresh-rooms").addEventListener("click",refreshRooms);
$("create-room").addEventListener("click",()=>{if(!currentUser){showModal("auth-modal");return;}showModal("create-modal")});
$("create-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!currentUser)return;
  try { const id=await createRoom(currentUser,$("room-title").value.trim(),$("room-category").value,$("room-description").value.trim()); hideModal("create-modal");$("create-form").reset();await refreshRooms();await enterRoom(id); }
  catch(err){$("create-message").textContent=translateError(err);}
});

async function enterRoom(roomId) {
  if(!currentUser){showModal("auth-modal");toast("রুমে যোগ দিতে আগে লগইন করো");return;}
  try {
    const room=await getRoom(roomId); if(!room)throw new Error("রুমটি পাওয়া যায়নি।");
    await joinRoom(roomId,currentUser); activeRoom=roomId;
    $("active-room-title").textContent=room.title; $("active-room-meta").textContent=`${room.category||"সাধারণ আড্ডা"} · Host: ${room.ownerName||"Member"}`;
    $("chat-messages").innerHTML=""; $("video-grid").innerHTML='<div class="video-placeholder"><span>🎙️</span><b>রুমে স্বাগতম</b><small>ভিডিও চালু করতে নিচের বাটন চাপো</small></div>';
    showModal("room-modal");
    roomUnsubs.forEach(fn=>fn());roomUnsubs=[];
    roomUnsubs.push(watchMembers(roomId,members=>{ currentMembers=members; $("member-count").textContent=members.length; $("chat-count").textContent=members.length; $("member-list").textContent="সদস্য: "+members.map(m=>m.displayName).join(" · "); if(media)media.connectToMembers(members).catch(console.warn); }));
    roomUnsubs.push(watchMessages(roomId,messages=>renderMessages(messages)));
  } catch(err){toast(translateError(err));}
}
function renderMessages(messages) {
  const box=$("chat-messages");box.innerHTML="";
  messages.forEach(m=>{const item=document.createElement("div");item.className="message";const name=document.createElement("b");name.textContent=m.displayName||"Member";const p=document.createElement("p");p.textContent=m.text;const time=document.createElement("time");time.textContent=m.createdAt?.toDate?m.createdAt.toDate().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"এখন";item.append(name,p,time);box.append(item);});
  box.scrollTop=box.scrollHeight;
}
$("chat-form").addEventListener("submit",async e=>{e.preventDefault();const text=$("chat-input").value;if(!activeRoom||!currentUser)return;try{await sendMessage(activeRoom,currentUser,text);$("chat-input").value="";}catch(err){toast(translateError(err));}});

function showVideo(uid,name,stream,isLocal) {
  let tile=document.querySelector(`[data-video="${CSS.escape(uid)}"]`);
  if(!tile){tile=document.createElement("div");tile.className="video-tile";tile.dataset.video=uid;const video=document.createElement("video");video.autoplay=true;video.playsInline=true;video.muted=isLocal;const label=document.createElement("span");label.textContent=name+(isLocal?" (তুমি)":"");tile.append(video,label);$("video-grid").append(tile);if($("video-grid").querySelector(".video-placeholder"))$("video-grid").querySelector(".video-placeholder").remove();}
  const video=tile.querySelector("video");video.srcObject=stream;
}
$("toggle-mic").addEventListener("click",async()=>{
  try {
    if(!media){
      media=new RoomMedia(activeRoom,currentUser,showVideo);
      await media.startLocal({audio:true,video:false});
      localMic=true; localCam=false;
      await media.connectToMembers(currentMembers);
    } else {
      localMic=!localMic;
      media.localStream?.getAudioTracks().forEach(t=>t.enabled=localMic);
    }
    $("toggle-mic").textContent=localMic?"🎙️ মাইক বন্ধ করো":"🎙️ মাইক চালু";toast(localMic?"মাইক চালু":"মাইক বন্ধ");
  } catch(err){toast("মাইক ব্যবহার করা যায়নি: "+err.message);}
});
$("toggle-camera").addEventListener("click",async()=>{
  try {
    if(!media){media=new RoomMedia(activeRoom,currentUser,showVideo);await media.startLocal({audio:true,video:true});localMic=true;localCam=true;await media.connectToMembers(currentMembers);$("toggle-mic").textContent="🎙️ মাইক বন্ধ করো";}
    else if(!media.localStream?.getVideoTracks().length){const stream=await navigator.mediaDevices.getUserMedia({video:true});const track=stream.getVideoTracks()[0];media.localStream.addTrack(track);media.peers.forEach(pc=>pc.addTrack(track,media.localStream));showVideo(currentUser.uid,currentUser.displayName||"You",media.localStream,true);localCam=true;}
    else {localCam=!localCam;media.localStream.getVideoTracks().forEach(t=>t.enabled=localCam);}
    $("toggle-camera").textContent=localCam?"📷 ক্যামেরা বন্ধ করো":"📷 ক্যামেরা চালু";
    if(media){const members=await import("./rooms.js");const current=await members.getRoom(activeRoom);/* membership listener handles peers */}
  } catch(err){toast("ক্যামেরা ব্যবহার করা যায়নি: "+err.message);}
});
async function exitRoom() {
  if(media){await media.stop();media=null;}
  roomUnsubs.forEach(fn=>fn());roomUnsubs=[];
  if(activeRoom&&currentUser)try{await leaveRoom(activeRoom,currentUser.uid);}catch(e){console.warn(e);}
  document.querySelectorAll(".video-tile").forEach(el=>el.remove());
  activeRoom=null;hideModal("room-modal");refreshRooms();
}
$("leave-room").addEventListener("click",exitRoom);
$("room-modal").addEventListener("click",e=>{if(e.target===$("room-modal"))exitRoom();});
window.addEventListener("beforeunload",()=>{roomUnsubs.forEach(fn=>fn());if(media)media.stop();});

if(!isFirebaseConfigured){
  $("connection-status").textContent="Firebase সেটআপ বাকি";
  $("room-list").innerHTML='<div class="empty-state"><b>প্রথমে Firebase সংযোগ করতে হবে।</b><br>README-BN.md ফাইলের নির্দেশনা অনুসরণ করে js/firebase.js-এ config বসাও।</div>';
  $("room-count").textContent="0";
} else {
  $("connection-status").textContent="Firebase প্রস্তুত";
  watchAuth(user=>{
    currentUser=user;
    $("open-auth").classList.toggle("hidden",!!user);$("sign-out").classList.toggle("hidden",!user);
    $("open-auth").textContent=user?(user.displayName||"আমার অ্যাকাউন্ট"):"লগইন / যোগ দিন";
    refreshRooms();
  });
}
if("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.warn));
