import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  collection,
  doc, 
  getDoc, 
  getDocs,
  arrayUnion,
  query,
  setDoc, 
  serverTimestamp,
  where
} from "firebase/firestore";
import {
  auth,
  googleProvider,
  db,
  ensureBrowserLocalPersistence
} from "../services/firebase";

const AuthContext = createContext(null);

const syncStudentProfile = async (user, phone = "") => {
  const userData = {
    _id: `student_${user.uid}`,
    _type: "studentUser",
    fullName: user.displayName || "Student",
    email: user.email || "",
    phone,
    firebaseUid: user.uid,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  };

  console.log("Syncing user to Sanity:", userData);
  try {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/sync-student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: user.uid,
        email: userData.email,
        phone: userData.phone,
        name: userData.fullName,
        firebaseApiKey: auth.app.options.apiKey,
      }),
    });

    const result = await response.json();
    console.log("Sanity sync response:", result);
    if (!response.ok) {
      throw new Error(result.details || result.error || `Student profile sync failed with status ${response.status}.`);
    }
    return true;
  } catch (err) {
    if (err?.name === "AbortError") return false;
    console.error("Sanity sync error:", err);
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      await ensureBrowserLocalPersistence();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // User collection check aur initial document create/sync
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      let profile;
      
      if (!snap.exists()) {
        profile = {
          uid: user.uid,
          name: user.displayName || "Student",
          email: user.email || "",
          photoURL: user.photoURL || "",
          phone: "",
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, profile);
      } else {
        profile = snap.data();
      }
      setUserProfile(profile);
      return user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  // WhatsApp / Mobile Number update function
  const updatePhoneNumber = async (phoneNumber) => {
    if (!currentUser) return;
    try {
      const phoneQuery = query(
        collection(db, "users"),
        where("phone", "==", phoneNumber)
      );
      const matchingUsers = await getDocs(phoneQuery);
      const phoneIsRegistered = matchingUsers.docs.some(
        (userDocument) => userDocument.id !== currentUser.uid
      );
      if (phoneIsRegistered) {
        const error = new Error("This mobile number is already linked to another account.");
        error.code = "PHONE_ALREADY_REGISTERED";
        throw error;
      }

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { phone: phoneNumber }, { merge: true });
      setUserProfile((prev) => ({ ...prev, phone: phoneNumber }));
      void syncStudentProfile(currentUser, phoneNumber);
    } catch (error) {
      console.error("Error updating phone:", error);
      throw error;
    }
  };

  const trackBookPurchase = async (book) => {
    if (!currentUser) {
      throw new Error("Sign in before starting checkout.");
    }
    if (!book?.sanityId) {
      throw new Error("This book is missing its Sanity ID and cannot be tracked.");
    }

    const idToken = await currentUser.getIdToken();
    const firestoreWrite = setDoc(
      doc(db, "users", currentUser.uid),
      { purchasedBookIds: arrayUnion(book.sanityId) },
      { merge: true }
    );
    const sanityWrite = fetch("/api/track-purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: currentUser.uid,
        bookId: book.sanityId,
        phone: userProfile?.phone || "",
        firebaseApiKey: auth.app.options.apiKey,
      }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Purchase tracking failed with status ${response.status}.`);
      }
      return result;
    });

    const results = await Promise.allSettled([firestoreWrite, sanityWrite]);
    const failedWrites = results.filter((result) => result.status === "rejected");
    failedWrites.forEach((result) => {
      console.error("Purchase tracking write failed:", result.reason);
    });
    if (failedWrites.length) {
      throw new Error("The checkout was opened, but purchase tracking could not be fully saved.");
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  useEffect(() => {
    let isActive = true;
    let unsubscribe;

    ensureBrowserLocalPersistence()
      .then(() => {
        if (!isActive) return;
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user) {
              const userRef = doc(db, "users", user.uid);
              const profileSnapshot = await getDoc(userRef);
              if (!isActive) return;
              const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
              setUserProfile(profile);
              setCurrentUser(user);
              void syncStudentProfile(user, profile?.phone || "");
            } else {
              setUserProfile(null);
              setCurrentUser(null);
            }
          } catch (error) {
            if (error?.name !== "AbortError") {
              console.error("Failed to restore the Firebase authentication session:", error);
            }
            if (isActive) {
              setUserProfile(null);
              setCurrentUser(user);
            }
          } finally {
            if (isActive) setLoading(false);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to enable Firebase browser-local persistence:", error);
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        updatePhoneNumber,
        trackBookPurchase,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};