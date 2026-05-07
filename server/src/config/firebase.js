import admin from "firebase-admin";
import { env } from "./env.js";

let firebaseAdmin = null;

if (env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey) {
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey
    })
  });
}

export { admin, firebaseAdmin };
