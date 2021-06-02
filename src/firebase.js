// Firebase App (the core Firebase SDK) is always required and must be listed first
import firebase from "firebase/app";

// If you enabled Analytics in your project, add the Firebase SDK for Analytics
// import "firebase/analytics";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEWpF3Wnrw_sjn_4_MbxU6wq7SRFWIHr4",
  authDomain: "countries-dc990.firebaseapp.com",
  projectId: "countries-dc990",
  storageBucket: "countries-dc990.appspot.com",
  messagingSenderId: "960283810675",
  appId: "1:960283810675:web:d1c0d482483f58a6024306",
  measurementId: "G-RPJ285YLVJ",
};

firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();

export default {
  auth() {
    return auth;
  },
  db() {
    return db;
  },
  login() {
    const provider = new firebase.auth.GoogleAuthProvider()
    return firebase.auth().signInWithPopup(provider)
  },
  logout() {
    firebase.auth().signOut()
        .then(function() {})
        .catch(function(error) {
          console.log(error)});
  },
}
