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
  query,
  setDoc, 
  serverTimestamp,
  where
} from "firebase/firestore";
import { auth, googleProvider, db } from "../services/firebase";

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
      body: JSON.stringify({ phone }),
    });

    const result = await response.json();
    console.log("Sanity sync response:", result);
    if (!response.ok) {
      throw new Error(result.details || result.error || `Student profile sync failed with status ${response.status}.`);
    }
  } catch (err) {
    console.error("Sanity sync error:", err);
    throw err;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firestore se profile fetch karna
  const fetchUserProfile = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile(snap.data());
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // User collection check aur initial document create/sync
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const newProfile = {
          uid: user.uid,
          name: user.displayName || "Student",
          email: user.email || "",
          photoURL: user.photoURL || "",
          phone: "",
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(snap.data());
      }
      const profile = snap.exists() ? snap.data() : { phone: "" };
      try {
        await syncStudentProfile(user, profile.phone || "");
      } catch (error) {
        console.error("Unable to sync the signed-in student profile to Sanity:", error);
      }
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
        const error = new Error("This mobile number is already registered with another account.");
        error.code = "PHONE_ALREADY_REGISTERED";
        throw error;
      }

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { phone: phoneNumber }, { merge: true });
      setUserProfile((prev) => ({ ...prev, phone: phoneNumber }));
      try {
        await syncStudentProfile(currentUser, phoneNumber);
      } catch (error) {
        console.error("Unable to sync the updated student phone number to Sanity:", error);
      }
    } catch (error) {
      console.error("Error updating phone:", error);
      throw error;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        updatePhoneNumber,
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