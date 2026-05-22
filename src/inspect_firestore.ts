import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";

// Load configuration from local config if it exists
let firebaseConfig: any = {};
try {
  const fileContent = readFileSync("firebase-applet-config.json", "utf-8");
  firebaseConfig = JSON.parse(fileContent);
} catch (e) {
  console.error("No firebase-applet-config.json found");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("Fetching projects from Firestore...");
  const snap = await getDocs(collection(db, "projects"));
  snap.forEach(doc => {
    console.log(`Document [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
  });
}

main().catch(console.error);
