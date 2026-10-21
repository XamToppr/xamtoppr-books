import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "./AuthModal";

export default function UserButton() {
  const { currentUser, userProfile, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Check karein agar user logged in hai par phone missing hai to popup force open rahe
  const needsPhone = currentUser && !/^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || "");

  return (
    <>
      <div style={{ position: "relative", display: "inline-block" }}>
        {!currentUser ? (
          <button
            onClick={() => setShowAuthModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            <span>Login / Sign Up</span>
          </button>
        ) : (
          <div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "20px",
                cursor: "pointer"
              }}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="avatar"
                  style={{ width: "26px", height: "26px", borderRadius: "50%" }}
                />
              ) : (
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                </div>
              )}
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser.displayName?.split(" ")[0] || "Account"}
              </span>
              <span style={{ fontSize: "10px", color: "#6b7280" }}>▼</span>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "115%",
                  width: "190px",
                  background: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.15)",
                  border: "1px solid #e5e7eb",
                  padding: "6px 0",
                  zIndex: 1000
                }}
              >
                <div style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser.displayName || "Student"}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser.email}
                  </p>
                </div>

                <a
                  href="/my-library"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 14px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    fontSize: "13px",
                    color: "#374151",
                    textDecoration: "none",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span>📚 My Library &amp; Purchases</span>
                </a>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 14px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    fontSize: "13px",
                    color: "#dc2626",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#fee2e2")}
                  onMouseLeave={(e) => (e.target.style.background = "none")}
                >
                  <span>🚪 Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal (Login + Mobile prompt) */}
      <AuthModal
        isOpen={showAuthModal || needsPhone}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}