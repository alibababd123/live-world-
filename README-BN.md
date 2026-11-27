# LiveWorld — বাংলা সেটআপ গাইড

বন্ধু, এটি LiveWorld-এর প্রথম পরীক্ষামূলক ওয়েব অ্যাপ (MVP)। এটি এখনো পূর্ণাঙ্গ বাণিজ্যিক অ্যাপ নয়। আগে ছোট পরিসরে পরীক্ষা করতে হবে।

## ১. কী আছে
- ইমেইল/পাসওয়ার্ড রেজিস্ট্রেশন ও লগইন (Firebase Authentication)
- Firebase Firestore-এ ব্যবহারকারী, রুম, সদস্য ও চ্যাট
- রুম তৈরি ও যোগদান
- WebRTC peer-to-peer অডিও/ভিডিওর প্রাথমিক ব্যবস্থা
- মোবাইল-ফ্রেন্ডলি ওয়েব ডিজাইন এবং PWA manifest
- Firestore security rules

## ২. আগে যা লাগবে
1. একটি Google account
2. একটি GitHub account
3. Firebase Console-এ একটি project
4. Firebase project-এ **Authentication > Sign-in method > Email/Password** চালু করা
5. **Firestore Database** তৈরি করা

শুরুতে Firebase Spark (no-cost) plan ব্যবহার করো। Firebase-এর বিনামূল্যের ব্যবহারসীমা আছে; ব্যবহার বাড়লে সীমা বা খরচ হতে পারে। কোনো পেইড প্ল্যানে আপগ্রেড করার আগে খরচ যাচাই করবে।

## ৩. Firebase config বসানো
1. https://console.firebase.google.com/ খোলো।
2. নতুন project তৈরি করো, নাম দাও `liveworld` (নামটি আগে ব্যবহৃত হলে অন্য নাম দাও)।
3. Project Overview > Web app (</>) যোগ করো।
4. Firebase যে config দেখাবে, `js/firebase.js` ফাইলে `firebaseConfig`-এর placeholder মানগুলোর জায়গায় হুবহু বসাও।
5. Authentication-এ Email/Password চালু করো।
6. Firestore Database তৈরি করো।
7. Firestore > Rules-এ এই প্রকল্পের `firestore.rules` ফাইলের সম্পূর্ণ নিয়ম কপি করে Publish করো।

**গুরুত্বপূর্ণ:** Firebase web config সাধারণত ওয়েব অ্যাপে ব্যবহারের জন্য; নিরাপত্তা Firestore Rules ও Authentication দিয়ে করতে হবে। Admin SDK/private service account key কখনো GitHub-এ দেবে না।

## ৪. GitHub-এ আপলোড
1. আগের `live-world-` repository-র পুরোনো ফাইল মুছে ফেলার আগে ব্যাকআপ নাও।
2. ZIP extract করো।
3. ZIP-এর ভেতরের ফাইল ও ফোল্ডারগুলো repository-র root-এ upload করো। `LiveWorld` নামের অতিরিক্ত parent folder যেন না থাকে।
4. GitHub Pages দিয়ে চালাতে চাইলে Settings > Pages > Deploy from a branch > `main` > `/ (root)` বেছে Save করো।
5. Pages URL-এ HTTPS দিয়ে সাইট খোলো। Camera/microphone-এর জন্য secure context (HTTPS বা localhost) দরকার।

**Firebase Authentication authorized domains:** Firebase Console > Authentication > Settings > Authorized domains-এ তোমার GitHub Pages domain যোগ করো (যেমন `username.github.io`)।

## ৫. Firestore index
রুমের query-তে `status` এবং `createdAt` একসঙ্গে ব্যবহৃত হয়েছে। Firestore প্রথমবার composite index চাইলে error message-এ দেওয়া link খুলে index তৈরি করো। অথবা Firebase Console > Firestore > Indexes-এ `rooms`: `status` Ascending, `createdAt` Descending index যোগ করো।

## ৬. লাইভ ভিডিও সম্পর্কে জরুরি সীমাবদ্ধতা
- বর্তমান কোডে WebRTC mesh এবং Google public STUN server ব্যবহৃত হয়েছে।
- STUN server TURN-এর বিকল্প নয়। কিছু মোবাইল নেটওয়ার্ক/কঠোর NAT-এ ভিডিও সংযোগ ব্যর্থ হতে পারে।
- Mesh-এ প্রত্যেক অংশগ্রহণকারী অন্য সবার সঙ্গে আলাদা সংযোগ করে। তাই কেবল ২–৪ জনের পরীক্ষামূলক রুমে পরীক্ষা করো; বড় রুমের জন্য SFU/media server এবং TURN দরকার হবে, যা সাধারণত খরচ তৈরি করে।
- ব্রাউজার camera/microphone permission দিতে হবে।
- ভিডিও ফিচার ব্যবহারকারীর সম্মতি ছাড়া চালু করো না।

## ৭. বর্তমান সংস্করণে যা নেই
- Admin role/management panel (UI placeholder বা পূর্ণ admin controls নেই)
- রিপোর্ট, ব্লক, moderation, age controls
- শক্তিশালী anti-spam/rate limiting
- TURN/SFU production media infrastructure
- Payments, tokens, gifts, ads
- privacy policy, terms, data deletion workflow
- push notifications এবং native Android/iOS apps

## ৮. নিরাপত্তা ও প্রকাশের আগে
এটি একটি prototype। বাস্তব ব্যবহারকারীর কাছে প্রচারের আগে security rules পরীক্ষা, moderation/report/block, privacy policy, data deletion, abuse prevention, backup, monitoring এবং ভিডিও infrastructure পর্যালোচনা করতে হবে। শিশুদের জন্য উন্মুক্ত করার আগে বিশেষ সুরক্ষা ও আইনগত পর্যালোচনা প্রয়োজন।

## ৯. সমস্যা হলে
- “Firebase সেটআপ বাকি” দেখালে `js/firebase.js` config বসানো হয়নি।
- Permission denied হলে Firestore Rules publish হয়েছে কি না এবং user login করেছে কি না দেখো।
- Email login না হলে Firebase Authentication Email/Password provider চালু করো।
- Camera কাজ না করলে HTTPS, browser permission, অন্য অ্যাপ camera ব্যবহার করছে কি না দেখো।
- Index error হলে error-এর link দিয়ে composite index তৈরি করো।

শুরুতে কোনো পেইড সার্ভিস চালু করবে না। Firebase Console-এ billing account যুক্ত করার prompt এলে এখনই যুক্ত করার প্রয়োজন নেই; আগে বিনামূল্যের সীমার মধ্যে পরীক্ষা করো।
