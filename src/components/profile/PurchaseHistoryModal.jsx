import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

export default function PurchaseHistoryModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const fetchPurchases = async () => {
      setLoading(true);
      try {
        // Query purchases matching current user's UID or Email
        const purchasesRef = collection(db, "purchases");
        const q = query(
          purchasesRef,
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort newest first
        items.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setPurchases(items);
      } catch (err) {
        console.error("Error fetching purchases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

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
        padding: "24px",
        maxWidth: "550px",
        width: "100%",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
              My Purchases
            </h2>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
              All your purchased books and materials
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#6b7280"
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: "14px" }}>
              Loading your purchases...
            </div>
          ) : purchases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>📚</div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", margin: "0 0 4px 0" }}>
                No purchases yet
              </h3>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                Books you purchase will automatically show up here with direct access.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {purchases.map((item) => {
                const dateStr = item.createdAt?.toDate 
                  ? item.createdAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : (item.purchaseDate || "Recent");

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={item.title || "Book"}
                          style={{ width: "45px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      ) : (
                        <div style={{ width: "45px", height: "60px", background: "#e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                          📖
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" }}>
                          {item.title || item.bookTitle || "Study Material"}
                        </h4>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          <span>Date: {dateStr}</span>
                          {item.amount && <span style={{ marginLeft: "10px" }}>• ₹{item.amount}</span>}
                        </div>
                      </div>
                    </div>

                    {(item.downloadUrl || item.viewUrl) && (
                      <a
                        href={item.downloadUrl || item.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "8px 14px",
                          borderRadius: "6px",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Read / View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}