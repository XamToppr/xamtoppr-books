import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthModal({ isOpen, onClose }) {
  const { currentUser, userProfile, signInWithGoogle, updatePhoneNumber } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check karein ki user login hai lekin phone number missing hai ya nahi
  const needsPhone = currentUser && !/^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || "");
  if (!isOpen || (currentUser && !needsPhone)) return null;

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setSubmitting(true);
      await signInWithGoogle();
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    try {
      setError("");
      setSubmitting(true);
      await updatePhoneNumber(cleanPhone);
      onClose();
    } catch (err) {
      setError(err.code === "PHONE_ALREADY_REGISTERED"
        ? "This mobile number is already linked to another account."
        : "Failed to save mobile number. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "16px",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "28px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
        position: "relative"
      }}>
        {/* Close Button (sirf tab jab phone mandatory onboarding me na ho) */}
        {!needsPhone && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#6b7280"
            }}
          >
            ✕
          </button>
        )}

        {!currentUser ? (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#111827", textAlign: "center" }}>
              Welcome to XamToppr
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px", textAlign: "center" }}>
              Login to access your purchases, study materials and notes.
            </p>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={submitting}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#ffffff",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: "600",
                color: "#374151",
                fontSize: "15px"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {submitting ? "Signing in..." : "Continue with Google"}
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#111827", textAlign: "center" }}>
              Almost Done! 🎉
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px", textAlign: "center" }}>
              Please provide your WhatsApp / Mobile number for order receipts & updates.
            </p>

            {error && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                  Mobile / WhatsApp Number
                </label>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
                  <span style={{ padding: "10px 12px", background: "#f3f4f6", color: "#4b5563", fontSize: "14px", fontWeight: "600", borderRight: "1px solid #d1d5db" }}>
                    +91
                  </span>
                  <input
  type="tel"
  maxLength={10}
  placeholder="Enter 10-digit number"
  value={phone}
  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
  style={{
    flex: 1,
    padding: "10px 12px",
    border: "none",
    outline: "none",
    fontSize: "15px",
    color: "#111827",
    backgroundColor: "#ffffff",
    caretColor: "#111827"
  }}
  autoFocus
/>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || phone.length !== 10}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: phone.length === 10 ? "#2563eb" : "#93c5fd",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "15px",
                  border: "none",
                  cursor: phone.length === 10 ? "pointer" : "not-allowed"
                }}
              >
                {submitting ? "Saving..." : "Continue"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}