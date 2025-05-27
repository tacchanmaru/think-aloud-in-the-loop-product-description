// src/lib/firebaseAdmin.ts (変更なし・確認用)
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID, // Admin SDK用はNEXT_PUBLIC_を付けない
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized.');
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization error', e.stack);
  }
}

export const firestoreDb = admin.firestore();
export default admin;