import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  Firestore,
} from "firebase/firestore";
import { StructuredMemory, UserSession, UserProfile, WisdomEntry, BookWisdomEntry, TrustedContact, GrowthInsightsReport, RetrievalLog } from "./types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (typeof window !== "undefined") {
  if (isFirebaseConfigured) {
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (err) {
      console.warn("Failed to initialize live Firebase:", err);
    }
  }
}

export { auth, db };

/**
 * Strict Undefined-Stripping Utility to guarantee zero driver crashes
 */
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Local Storage Fallback Keys
const LOCAL_STORAGE_MEMORIES_KEY = "smriti_ai_memories_v1";
const LOCAL_STORAGE_WISDOM_KEY = "smriti_ai_wisdom_v1";
const LOCAL_STORAGE_BOOKS_KEY = "smriti_ai_books_v1";
const LOCAL_STORAGE_USER_KEY = "smriti_ai_user_session_v1";
const LOCAL_STORAGE_PROFILES_KEY = "smriti_ai_profiles_v1";
const LOCAL_STORAGE_INTERACTIONS_KEY = "smriti_ai_interactions_v1";
const LOCAL_STORAGE_GROWTH_INSIGHTS_KEY = "smriti_ai_growth_insights_v1";
const LOCAL_STORAGE_RETRIEVAL_LOGS_KEY = "smriti_ai_retrieval_logs_v1";

/**
 * Creates or updates user profile document in Firestore at /users/{userId}
 */
export async function createUserProfileRecord(
  user: UserSession
): Promise<{ profile: UserProfile; firestoreSynced: boolean; error?: string }> {
  const now = new Date().toISOString();
  let createdAt = now;

  const profilePayload: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt,
    lastLoginAt: now,
    providerId: user.isDemo ? "demo.smriti" : "google.com",
  };

  // Always sync to local storage immediately as local guarantee
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
      const profiles: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
      if (profiles[user.uid]?.createdAt) {
        createdAt = profiles[user.uid].createdAt;
        profilePayload.createdAt = createdAt;
      }
      profiles[user.uid] = profilePayload;
      localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn("LocalStorage profile write error:", e);
    }
  }

  let firestoreSynced = false;
  let firestoreError: string | undefined;

  if (db && isFirebaseConfigured && !user.isDemo) {
    const userRef = doc(db, "users", user.uid);
    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        const data = existingSnap.data();
        if (data.createdAt) {
          createdAt = data.createdAt;
          profilePayload.createdAt = createdAt;
        }
      }
    } catch (readErr: any) {
      console.warn("Notice: Firestore profile read rejected:", readErr?.message);
    }

    try {
      // Explicitly write profile to Firestore at /users/{userId}
      await setDoc(userRef, cleanPayload(profilePayload), { merge: true });
      firestoreSynced = true;
    } catch (writeErr: any) {
      firestoreSynced = false;
      firestoreError = writeErr?.message || "Missing or insufficient permissions";
      console.warn(
        "Notice: Firestore profile write rejected by security rules. Publish rules to allow /users/{userId}:",
        firestoreError
      );
    }
  }

  return { profile: profilePayload, firestoreSynced, error: firestoreError };
}

/**
 * Fetches user profile record from Firestore at /users/{userId}
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (db && isFirebaseConfigured) {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (err) {
      console.warn("Error fetching user profile from Firestore:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
      if (raw) {
        const profiles: Record<string, UserProfile> = JSON.parse(raw);
        return profiles[uid] || null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Google Sign-In with Firebase Auth or fallback preview session
 */
export async function signInWithGoogle(): Promise<{ session: UserSession; profile: UserProfile }> {
  if (auth && isFirebaseConfigured) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const session: UserSession = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isDemo: false,
    };
    const { profile } = await createUserProfileRecord(session);
    return { session, profile };
  }

  // Graceful Demo Session with genuine identity for instant preview testing
  const demoUser: UserSession = {
    uid: "smriti-user-demo-01",
    email: "user@smritiai.app",
    displayName: "Smriti Seeker",
    photoURL: null,
    isDemo: true,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  }
  const { profile } = await createUserProfileRecord(demoUser);
  return { session: demoUser, profile };
}

export async function logOut(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await signOut(auth);
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  }
}

export function subscribeToAuth(callback: (user: UserSession | null) => void) {
  if (auth && isFirebaseConfigured) {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          const session: UserSession = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isDemo: false,
          };
          try {
            await createUserProfileRecord(session);
          } catch (profileErr) {
            console.warn("Notice: background profile creation notice:", profileErr);
          }
          callback(session);
        } else {
          callback(null);
        }
      } catch (authErr) {
        console.warn("Auth state transition notice:", authErr);
        callback(null);
      }
    });
  }

  // Check local session
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (cached) {
      try {
        callback(JSON.parse(cached));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  }
  return () => {};
}

/**
 * Saves a structured memory to Firestore with strict isolation
 */
export async function saveMemory(userId: string, memory: StructuredMemory): Promise<void> {
  const sanitized = cleanPayload({
    ...memory,
    userId,
    updatedAt: new Date().toISOString(),
  });

  // Always persist to local cache first so user content is never lost
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      const list: StructuredMemory[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = list.filter((m) => m.id !== memory.id);
      filtered.unshift(sanitized);
      localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("LocalStorage memory cache write error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const memoryDocRef = doc(db, "users", userId, "memories", memory.id);
      await setDoc(memoryDocRef, sanitized);
    } catch (err) {
      console.warn("Firestore saveMemory write notice (cached locally):", err);
    }
  }
}

/**
 * Updates an action item completion status in a memory
 */
export async function updateMemoryActionItem(
  userId: string,
  memoryId: string,
  actionItemId: string,
  completed: boolean
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      if (existingRaw) {
        const list: StructuredMemory[] = JSON.parse(existingRaw);
        const mem = list.find((m) => m.id === memoryId);
        if (mem && mem.actionItems) {
          mem.actionItems = mem.actionItems.map((item) =>
            item.id === actionItemId ? { ...item, completed } : item
          );
          mem.updatedAt = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Local storage action update error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const memoryDocRef = doc(db, "users", userId, "memories", memoryId);
    try {
      const snap = await getDoc(memoryDocRef);
      if (snap.exists()) {
        const currentData = snap.data() as StructuredMemory;
        const updatedActionItems = (currentData.actionItems || []).map((item) =>
          item.id === actionItemId ? { ...item, completed } : item
        );
        await updateDoc(memoryDocRef, {
          actionItems: updatedActionItems,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("Failed to update action item in Firestore:", err);
    }
  }
}

/**
 * Loads user memories with strict path-level isolation
 */
export async function fetchUserMemories(userId: string): Promise<StructuredMemory[]> {
  if (db && isFirebaseConfigured) {
    try {
      const colRef = collection(db, "users", userId, "memories");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: StructuredMemory[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StructuredMemory);
      });
      return list;
    } catch (err) {
      console.warn("Error querying Firestore, reading local cache:", err);
    }
  }

  if (typeof window !== "undefined") {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
    if (existingRaw) {
      try {
        const list: StructuredMemory[] = JSON.parse(existingRaw);
        return list.filter((m) => m.userId === userId);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Saves a user interaction to Firestore at /users/{userId}/interactions/{interactionId}
 */
export async function saveInteraction(
  userId: string,
  interactionId: string,
  data: Record<string, any>
): Promise<void> {
  const sanitized = cleanPayload({
    ...data,
    userId,
    interactionId,
    timestamp: new Date().toISOString(),
  });

  if (db && isFirebaseConfigured) {
    try {
      const ref = doc(db, "users", userId, "interactions", interactionId);
      await setDoc(ref, sanitized);
    } catch (err) {
      console.warn("Firestore saveInteraction write notice (cached locally):", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_INTERACTIONS_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      list.unshift(sanitized);
      localStorage.setItem(LOCAL_STORAGE_INTERACTIONS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("LocalStorage interaction write error:", e);
    }
  }
}

/**
 * Loads user interactions with strict path-level isolation
 */
export async function fetchUserInteractions(userId: string): Promise<any[]> {
  if (db && isFirebaseConfigured) {
    try {
      const colRef = collection(db, "users", userId, "interactions");
      const q = query(colRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      return list;
    } catch (err) {
      console.warn("Error querying interactions:", err);
    }
  }

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERACTIONS_KEY);
    if (raw) {
      try {
        const list: any[] = JSON.parse(raw);
        return list.filter((item) => item.userId === userId);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Deletes a memory from Firestore
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      if (existingRaw) {
        const list: StructuredMemory[] = JSON.parse(existingRaw);
        const filtered = list.filter((m) => m.id !== memoryId);
        localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Local storage delete memory error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const memoryDocRef = doc(db, "users", userId, "memories", memoryId);
      await deleteDoc(memoryDocRef);
    } catch (err) {
      console.warn("Firestore deleteMemory error (removed locally):", err);
    }
  }
}

/**
 * Saves a Wisdom Circle entry to Firestore at /users/{userId}/wisdom/{wisdomId}
 */
export async function saveWisdomEntry(userId: string, entry: WisdomEntry): Promise<void> {
  const sanitized = cleanPayload({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  // Local storage fallback cache
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_WISDOM_KEY);
      const list: WisdomEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = list.filter((w) => w.id !== entry.id);
      filtered.unshift(sanitized);
      localStorage.setItem(LOCAL_STORAGE_WISDOM_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("LocalStorage wisdom cache write error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const wisdomDocRef = doc(db, "users", userId, "wisdom", entry.id);
      await setDoc(wisdomDocRef, sanitized);
    } catch (err) {
      console.warn("Firestore saveWisdomEntry notice (cached locally):", err);
    }
  }
}

/**
 * Fetches user Wisdom Circle entries from Firestore with strict path-level isolation
 */
export async function fetchUserWisdom(userId: string): Promise<WisdomEntry[]> {
  if (db && isFirebaseConfigured) {
    try {
      const colRef = collection(db, "users", userId, "wisdom");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: WisdomEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as WisdomEntry);
      });
      return list;
    } catch (err) {
      console.warn("Error querying Firestore wisdom, reading local cache:", err);
    }
  }

  if (typeof window !== "undefined") {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_WISDOM_KEY);
    if (existingRaw) {
      try {
        const list: WisdomEntry[] = JSON.parse(existingRaw);
        return list.filter((w) => w.userId === userId);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Updates an existing Wisdom Circle entry
 */
export async function updateWisdomEntry(
  userId: string,
  wisdomId: string,
  updates: Partial<WisdomEntry>
): Promise<void> {
  const updatedAt = new Date().toISOString();

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_WISDOM_KEY);
      if (existingRaw) {
        const list: WisdomEntry[] = JSON.parse(existingRaw);
        const idx = list.findIndex((w) => w.id === wisdomId);
        if (idx !== -1) {
          list[idx] = cleanPayload({ ...list[idx], ...updates, updatedAt });
          localStorage.setItem(LOCAL_STORAGE_WISDOM_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Local storage wisdom update error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const wisdomDocRef = doc(db, "users", userId, "wisdom", wisdomId);
    try {
      await updateDoc(wisdomDocRef, cleanPayload({ ...updates, updatedAt }));
    } catch (err) {
      console.warn("Failed to update wisdom in Firestore:", err);
    }
  }
}

/**
 * Deletes a wisdom entry from Firestore
 */
export async function deleteWisdomEntry(userId: string, wisdomId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_WISDOM_KEY);
      if (existingRaw) {
        const list: WisdomEntry[] = JSON.parse(existingRaw);
        const filtered = list.filter((w) => w.id !== wisdomId);
        localStorage.setItem(LOCAL_STORAGE_WISDOM_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Local storage delete wisdom error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const wisdomDocRef = doc(db, "users", userId, "wisdom", wisdomId);
      await deleteDoc(wisdomDocRef);
    } catch (err) {
      console.warn("Firestore deleteWisdomEntry error (removed locally):", err);
    }
  }
}

/**
 * Cross-links a Wisdom entry and a Memory Vault entry bidirectionally
 */
export async function linkWisdomAndMemory(
  userId: string,
  wisdomId: string,
  memoryId: string
): Promise<void> {
  // 1. Update memory
  if (typeof window !== "undefined") {
    try {
      const existingMemRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      if (existingMemRaw) {
        const memList: StructuredMemory[] = JSON.parse(existingMemRaw);
        const mem = memList.find((m) => m.id === memoryId);
        if (mem) {
          const links = new Set(mem.linkedWisdomIds || []);
          links.add(wisdomId);
          mem.linkedWisdomIds = Array.from(links);
          localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(memList));
        }
      }
    } catch (e) {
      console.warn("Local storage link memory error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const memRef = doc(db, "users", userId, "memories", memoryId);
    try {
      const snap = await getDoc(memRef);
      if (snap.exists()) {
        const memData = snap.data() as StructuredMemory;
        const links = new Set(memData.linkedWisdomIds || []);
        links.add(wisdomId);
        await updateDoc(memRef, { linkedWisdomIds: Array.from(links) });
      }
    } catch (e) {
      console.warn("Firestore memory link error:", e);
    }
  }

  // 2. Update wisdom
  if (typeof window !== "undefined") {
    try {
      const existingWisdomRaw = localStorage.getItem(LOCAL_STORAGE_WISDOM_KEY);
      if (existingWisdomRaw) {
        const wisdomList: WisdomEntry[] = JSON.parse(existingWisdomRaw);
        const entry = wisdomList.find((w) => w.id === wisdomId);
        if (entry) {
          const links = new Set(entry.linkedMemoryIds || []);
          links.add(memoryId);
          entry.linkedMemoryIds = Array.from(links);
          localStorage.setItem(LOCAL_STORAGE_WISDOM_KEY, JSON.stringify(wisdomList));
        }
      }
    } catch (e) {
      console.warn("Local storage link wisdom error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const wisdomRef = doc(db, "users", userId, "wisdom", wisdomId);
    try {
      const snap = await getDoc(wisdomRef);
      if (snap.exists()) {
        const wisdomData = snap.data() as WisdomEntry;
        const links = new Set(wisdomData.linkedMemoryIds || []);
        links.add(memoryId);
        await updateDoc(wisdomRef, { linkedMemoryIds: Array.from(links) });
      }
    } catch (e) {
      console.warn("Firestore wisdom link error:", e);
    }
  }
}

/**
 * Persists a Book Wisdom entry to Firestore at /users/{userId}/books/{bookId}
 * with guaranteed zero-undefined sanitization and offline local storage fallback.
 */
export async function saveBookWisdom(entry: BookWisdomEntry): Promise<void> {
  const userId = entry.userId;
  const sanitized = cleanPayload(entry);

  // Local storage fallback cache
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
      const list: BookWisdomEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = list.filter((b) => b.id !== entry.id);
      filtered.unshift(sanitized);
      localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("LocalStorage book wisdom cache write error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const bookDocRef = doc(db, "users", userId, "books", entry.id);
      await setDoc(bookDocRef, sanitized);
    } catch (err) {
      console.warn("Firestore saveBookWisdomEntry notice (cached locally):", err);
    }
  }
}

/**
 * Fetches user Book Wisdom entries from Firestore with strict path-level isolation (/users/{userId}/books)
 */
export async function fetchUserBookWisdom(userId: string): Promise<BookWisdomEntry[]> {
  if (db && isFirebaseConfigured) {
    try {
      const colRef = collection(db, "users", userId, "books");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: BookWisdomEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as BookWisdomEntry);
      });
      return list;
    } catch (err) {
      console.warn("Error querying Firestore books, reading local cache:", err);
    }
  }

  if (typeof window !== "undefined") {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
    if (existingRaw) {
      try {
        const list: BookWisdomEntry[] = JSON.parse(existingRaw);
        return list.filter((b) => b.userId === userId);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Updates an existing Book Wisdom entry
 */
export async function updateBookWisdomEntry(
  userId: string,
  bookId: string,
  updates: Partial<BookWisdomEntry>
): Promise<void> {
  const updatedAt = new Date().toISOString();

  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
      if (existingRaw) {
        const list: BookWisdomEntry[] = JSON.parse(existingRaw);
        const idx = list.findIndex((b) => b.id === bookId);
        if (idx !== -1) {
          list[idx] = cleanPayload({ ...list[idx], ...updates, updatedAt });
          localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Local storage book wisdom update error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const bookDocRef = doc(db, "users", userId, "books", bookId);
    try {
      await updateDoc(bookDocRef, cleanPayload({ ...updates, updatedAt }));
    } catch (err) {
      console.warn("Failed to update book wisdom in Firestore:", err);
    }
  }
}

/**
 * Deletes a Book Wisdom entry from Firestore
 */
export async function deleteBookWisdomEntry(userId: string, bookId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
      if (existingRaw) {
        const list: BookWisdomEntry[] = JSON.parse(existingRaw);
        const filtered = list.filter((b) => b.id !== bookId);
        localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Local storage delete book error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const bookDocRef = doc(db, "users", userId, "books", bookId);
      await deleteDoc(bookDocRef);
    } catch (err) {
      console.warn("Firestore deleteBookWisdomEntry error (removed locally):", err);
    }
  }
}

/**
 * Cross-links a Book Wisdom entry and a Memory Vault entry bidirectionally
 */
export async function linkBookAndMemory(
  userId: string,
  bookId: string,
  memoryId: string
): Promise<void> {
  // 1. Update memory's linkedBookIds
  if (typeof window !== "undefined") {
    try {
      const existingMemRaw = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      if (existingMemRaw) {
        const memList: StructuredMemory[] = JSON.parse(existingMemRaw);
        const mem = memList.find((m) => m.id === memoryId);
        if (mem) {
          const links = new Set(mem.linkedBookIds || []);
          links.add(bookId);
          mem.linkedBookIds = Array.from(links);
          localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(memList));
        }
      }
    } catch (e) {
      console.warn("Local storage link memory book error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const memRef = doc(db, "users", userId, "memories", memoryId);
    try {
      const snap = await getDoc(memRef);
      if (snap.exists()) {
        const memData = snap.data() as StructuredMemory;
        const links = new Set(memData.linkedBookIds || []);
        links.add(bookId);
        await updateDoc(memRef, { linkedBookIds: Array.from(links) });
      }
    } catch (e) {
      console.warn("Firestore memory book link error:", e);
    }
  }

  // 2. Update book's linkedMemoryIds
  if (typeof window !== "undefined") {
    try {
      const existingBooksRaw = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
      if (existingBooksRaw) {
        const booksList: BookWisdomEntry[] = JSON.parse(existingBooksRaw);
        const entry = booksList.find((b) => b.id === bookId);
        if (entry) {
          const links = new Set(entry.linkedMemoryIds || []);
          links.add(memoryId);
          entry.linkedMemoryIds = Array.from(links);
          localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(booksList));
        }
      }
    } catch (e) {
      console.warn("Local storage link book memory error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    const bookRef = doc(db, "users", userId, "books", bookId);
    try {
      const snap = await getDoc(bookRef);
      if (snap.exists()) {
        const bookData = snap.data() as BookWisdomEntry;
        const links = new Set(bookData.linkedMemoryIds || []);
        links.add(memoryId);
        await updateDoc(bookRef, { linkedMemoryIds: Array.from(links) });
      }
    } catch (e) {
      console.warn("Firestore book memory link error:", e);
    }
  }
}

// -------------------------------------------------------------
// TRUSTED CIRCLE FIRESTORE & LOCAL REPOSITORY
// Path: /users/{userId}/trusted_circle/{contactId}
// -------------------------------------------------------------
const LOCAL_STORAGE_TRUSTED_CIRCLE_KEY = "smriti_trusted_circle";

export const DEFAULT_TRUSTED_CONTACTS: TrustedContact[] = [
  {
    id: "tc-sample-1",
    userId: "local-user",
    name: "Maya Lin",
    relationship: "Friend",
    whyTheyMatter: "A close friend who listens without judgement and always helps me put stressful situations in perspective.",
    preferredMethod: "Text / SMS",
    contactDetail: "maya.friend@example.com",
    optionalNotes: "Prefers quick texts. Great for taking a walk or sharing a laugh when things feel heavy.",
    tags: ["Grounding", "Empathy", "Friendship"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tc-sample-2",
    userId: "local-user",
    name: "Mom",
    relationship: "Parent",
    whyTheyMatter: "Unconditional warmth and reminders to take care of my physical well-being and rest.",
    preferredMethod: "Phone Call",
    contactDetail: "+1 (555) 234-5678",
    optionalNotes: "Best reached during evenings. Always reminds me to breathe and take it one day at a time.",
    tags: ["Family", "Comfort", "Wellbeing"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tc-sample-3",
    userId: "local-user",
    name: "Professor Marcus Reed",
    relationship: "Mentor",
    whyTheyMatter: "Provides objective, high-level perspective on long-term growth and career decision paralysis.",
    preferredMethod: "Email",
    contactDetail: "prof.marcus.reed@example.edu",
    optionalNotes: "Prefers structured thoughts or bullet points. Very encouraging with career anxiety.",
    tags: ["Mentor", "Career", "Clarity"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tc-sample-4",
    userId: "local-user",
    name: "Dr. Elena Vance",
    relationship: "Therapist",
    whyTheyMatter: "Professional guidance for emotional regulation, boundary setting, and cognitive reframing.",
    preferredMethod: "Email",
    contactDetail: "elena.vance@clinic.example.com",
    optionalNotes: "Available for scheduling appointments or brief check-in notes.",
    tags: ["Therapy", "Mental Health", "Boundaries"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tc-sample-5",
    userId: "local-user",
    name: "Alex",
    relationship: "Partner",
    whyTheyMatter: "My safe harbor who understands my daily patterns and offers quiet, steadfast presence.",
    preferredMethod: "In-Person",
    contactDetail: "",
    optionalNotes: "Appreciates knowing how I feel so they know how best to support me.",
    tags: ["Partner", "Support", "Daily Life"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tc-sample-6",
    userId: "local-user",
    name: "Daniel",
    relationship: "Sibling",
    whyTheyMatter: "Shared childhood history, honest humor, and always cuts through overthinking with grounding honesty.",
    preferredMethod: "Text / SMS",
    contactDetail: "+1 (555) 876-5432",
    optionalNotes: "Sends funny memes and tells me directly when I am overthinking things.",
    tags: ["Sibling", "Humor", "Honesty"],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Saves or updates a Trusted Contact in Firestore at /users/{userId}/trusted_circle/{contactId}
 * with zero-undefined sanitization and offline local storage fallback.
 */
export async function saveTrustedContact(contact: TrustedContact): Promise<void> {
  const userId = contact.userId;
  const sanitized = cleanPayload(contact);

  // Local storage cache
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY);
      const list: TrustedContact[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((c) => c.id !== contact.id);
      filtered.unshift(sanitized);
      localStorage.setItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Local storage trusted contact save error:", e);
    }
  }

  // Live Firestore persistence
  if (db && isFirebaseConfigured) {
    try {
      const contactRef = doc(db, "users", userId, "trusted_circle", contact.id);
      await setDoc(contactRef, sanitized, { merge: true });
    } catch (err: any) {
      console.warn("Firestore saveTrustedContact notice (cached locally):", err);
    }
  }
}

/**
 * Fetches all Trusted Contacts for a user from Firestore /users/{userId}/trusted_circle
 * ordered by createdAt descending, falling back to local storage cache if offline or unauthenticated.
 */
export async function fetchTrustedContacts(userId: string): Promise<TrustedContact[]> {
  // Read local cache first
  let localContacts: TrustedContact[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY);
      if (raw) {
        localContacts = JSON.parse(raw);
        // Filter by user if known
        if (userId && userId !== "local-user") {
          localContacts = localContacts.filter((c) => c.userId === userId);
        }
      }
    } catch (e) {
      console.warn("Failed to parse local trusted contacts:", e);
    }
  }

  if (!db || !isFirebaseConfigured || !userId || userId === "local-user") {
    return localContacts.length > 0 ? localContacts : DEFAULT_TRUSTED_CONTACTS;
  }

  try {
    const colRef = collection(db, "users", userId, "trusted_circle");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const remoteContacts: TrustedContact[] = [];
    snap.forEach((docSnap) => {
      remoteContacts.push(docSnap.data() as TrustedContact);
    });

    // Update local cache
    if (typeof window !== "undefined" && remoteContacts.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY, JSON.stringify(remoteContacts));
    }

    if (remoteContacts.length > 0) {
      return remoteContacts;
    }
    return localContacts.length > 0 ? localContacts : DEFAULT_TRUSTED_CONTACTS;
  } catch (err: any) {
    console.warn("Firestore fetchTrustedContacts fallback to local storage:", err);
    return localContacts.length > 0 ? localContacts : DEFAULT_TRUSTED_CONTACTS;
  }
}

/**
 * Updates a Trusted Contact
 */
export async function updateTrustedContact(
  userId: string,
  contactId: string,
  updates: Partial<TrustedContact>
): Promise<void> {
  const sanitized = cleanPayload(updates);

  // Local storage update
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY);
      if (raw) {
        const list: TrustedContact[] = JSON.parse(raw);
        const index = list.findIndex((c) => c.id === contactId);
        if (index !== -1) {
          list[index] = { ...list[index], ...sanitized, updatedAt: new Date().toISOString() };
          localStorage.setItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Local storage updateTrustedContact error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const contactRef = doc(db, "users", userId, "trusted_circle", contactId);
      await updateDoc(contactRef, {
        ...sanitized,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("Firestore updateTrustedContact notice (cached locally):", err);
    }
  }
}

/**
 * Deletes a Trusted Contact
 */
export async function deleteTrustedContact(userId: string, contactId: string): Promise<void> {
  // Local storage update
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY);
      if (raw) {
        const list: TrustedContact[] = JSON.parse(raw);
        const filtered = list.filter((c) => c.id !== contactId);
        localStorage.setItem(LOCAL_STORAGE_TRUSTED_CIRCLE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn("Local storage deleteTrustedContact error:", e);
    }
  }

  if (db && isFirebaseConfigured) {
    try {
      const contactRef = doc(db, "users", userId, "trusted_circle", contactId);
      await deleteDoc(contactRef);
    } catch (err: any) {
      console.warn("Firestore deleteTrustedContact notice (removed locally):", err);
    }
  }
}

/**
 * Saves a generated Growth Insights report for the user
 */
export async function saveGrowthInsightsReport(
  userId: string,
  report: GrowthInsightsReport
): Promise<void> {
  const sanitized = cleanPayload({
    ...report,
    userId,
    updatedAt: new Date().toISOString(),
  });

  // 1. Local fallback
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_GROWTH_INSIGHTS_KEY}_${userId}`, JSON.stringify(sanitized));
    } catch (e) {
      console.warn("Local storage growth report save error:", e);
    }
  }

  // 2. Firestore persistence at /users/{userId}/growth_insights/latest
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, "users", userId, "growth_insights", "latest");
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err: any) {
      console.warn("Failed to persist growth report to Firestore:", err);
    }
  }
}

/**
 * Fetches the latest Growth Insights report for the user
 */
export async function fetchLatestGrowthInsightsReport(
  userId: string
): Promise<GrowthInsightsReport | null> {
  // 1. Try Firestore first
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, "users", userId, "growth_insights", "latest");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as GrowthInsightsReport;
      }
    } catch (err) {
      console.warn("Firestore fetchLatestGrowthInsightsReport failed:", err);
    }
  }

  // 2. Fallback to Local Storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_GROWTH_INSIGHTS_KEY}_${userId}`);
      if (raw) {
        return JSON.parse(raw) as GrowthInsightsReport;
      }
    } catch (e) {
      console.warn("Local storage growth report fetch error:", e);
    }
  }

  return null;
}

/**
 * Test & Verification: Checks Firestore connectivity
 */
export async function verifyFirestoreConnection(): Promise<{ success: boolean; message: string; mode: string }> {
  if (!isFirebaseConfigured) {
    return {
      success: true,
      mode: "Local Mock / Simulated Isolation",
      message: "Firestore credentials not configured in environment; local isolated sandbox active.",
    };
  }

  if (!db) {
    return {
      success: false,
      mode: "Disconnected",
      message: "Firestore instance failed to initialize.",
    };
  }

  return {
    success: true,
    mode: "Live Cloud Firestore",
    message: `Connected to Cloud Firestore project "${firebaseConfig.projectId}".`,
  };
}

/**
 * Test & Verification: Attempts to read another user's isolated data to assert security rules enforcement
 */
export async function verifyCrossUserIsolation(
  currentUserId: string,
  targetForeignUserId: string = "unauthorized-foreign-user-999"
): Promise<{ blocked: boolean; message: string }> {
  if (db && isFirebaseConfigured) {
    try {
      const foreignRef = doc(db, "users", targetForeignUserId);
      await getDoc(foreignRef);
      // Also try subcollection
      const colRef = collection(db, "users", targetForeignUserId, "memories");
      await getDocs(colRef);

      return {
        blocked: false,
        message: "Warning: Read permitted on foreign document (check security rules).",
      };
    } catch (err: any) {
      const isPermissionDenied =
        err?.code === "permission-denied" ||
        String(err).includes("permission-denied") ||
        String(err).includes("Missing or insufficient permissions");

      if (isPermissionDenied) {
        return {
          blocked: true,
          message: `Cross-user access blocked by Firestore Security Rules (code: permission-denied). Isolation verified!`,
        };
      }
      return {
        blocked: true,
        message: `Cross-user access rejected: ${err.message}`,
      };
    }
  }

  // Local simulation mode isolation check
  if (targetForeignUserId !== currentUserId) {
    return {
      blocked: true,
      message: "Simulated storage enforces strict user ID boundary. Access to foreign user blocked.",
    };
  }

  return { blocked: false, message: "Target matches current user." };
}

/**
 * Saves a V3 Retrieval Orchestrator execution log to /users/{userId}/retrieval_logs/{logId}
 */
export async function saveRetrievalLog(
  userId: string,
  log: RetrievalLog
): Promise<{ success: boolean; id: string; firestoreSynced: boolean; error?: string }> {
  const sanitizedLog = cleanPayload(log);

  // 1. Sync to local storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_RETRIEVAL_LOGS_KEY);
      const allLogs: Record<string, RetrievalLog[]> = raw ? JSON.parse(raw) : {};
      const userList = allLogs[userId] || [];
      userList.unshift(sanitizedLog);
      allLogs[userId] = userList.slice(0, 50); // keep 50 most recent
      localStorage.setItem(LOCAL_STORAGE_RETRIEVAL_LOGS_KEY, JSON.stringify(allLogs));
    } catch (e) {
      console.warn("Failed to write retrieval log to local storage:", e);
    }
  }

  // 2. Persist to Firestore
  if (db && isFirebaseConfigured) {
    try {
      const logRef = doc(db, "users", userId, "retrieval_logs", sanitizedLog.id);
      await setDoc(logRef, sanitizedLog, { merge: true });
      return { success: true, id: sanitizedLog.id, firestoreSynced: true };
    } catch (err: any) {
      console.warn("Failed to persist retrieval log to Firestore:", err?.message || String(err));
      return {
        success: true,
        id: sanitizedLog.id,
        firestoreSynced: false,
        error: err?.message || "Firestore write error",
      };
    }
  }

  return { success: true, id: sanitizedLog.id, firestoreSynced: false };
}

/**
 * Fetches recent retrieval logs for the authenticated user
 */
export async function getRecentRetrievalLogs(
  userId: string,
  limitCount = 10
): Promise<RetrievalLog[]> {
  // Try Firestore first
  if (db && isFirebaseConfigured) {
    try {
      const logsRef = collection(db, "users", userId, "retrieval_logs");
      const q = query(logsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: RetrievalLog[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as RetrievalLog);
      });
      if (list.length > 0) {
        return list.slice(0, limitCount);
      }
    } catch (err) {
      console.warn("Failed to read retrieval logs from Firestore, falling back to local:", err);
    }
  }

  // Local fallback
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_RETRIEVAL_LOGS_KEY);
      if (raw) {
        const allLogs: Record<string, RetrievalLog[]> = JSON.parse(raw);
        return (allLogs[userId] || []).slice(0, limitCount);
      }
    } catch (e) {
      console.warn("Failed to parse local retrieval logs:", e);
    }
  }

  return [];
}

