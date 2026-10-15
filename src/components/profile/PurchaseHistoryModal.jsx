import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchUserLibrary, formatPurchaseDate } from "../../services/userLibrary";

export default function PurchaseHistoryModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchPurchases = async () => {
      if (!isOpen || !currentUser) {
        setPurchases([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      try {
        const libraryBooks = await fetchUserLibrary(currentUser);
        if (isCurrentRequest) setPurchases(libraryBooks);
      } catch (err) {
        console.error("Error fetching purchases:", err);
        if (isCurrentRequest) setLoadError('Your purchases could not be loaded. Please try again.');
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    void fetchPurchases();
    return () => {
      isCurrentRequest = false;
    };
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
          ) : loadError ? (
            <div role="alert" style={{ textAlign: "center", padding: "40px 16px", color: "#b91c1c", fontSize: "14px" }}>
              {loadError}
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
                const pdfUrl = item.fullPdfFile?.asset?.url;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={item.title || "Book"}
                          style={{ width: "45px", height: "60px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: "45px", height: "60px", background: "#e5e7eb", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                          📖
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" }}>
                          {item.title}
                        </h4>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          <span>Purchased {formatPurchaseDate(item.purchasedAt)}</span>
                          {item.amountPaid != null && <span style={{ marginLeft: "10px" }}>• ₹{item.amountPaid}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                      {pdfUrl ? (
                        <>
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 10px", borderRadius: "6px", background: "#1e3a8a", color: "#ffffff", fontSize: "11px", fontWeight: "600", textDecoration: "none", whiteSpace: "nowrap" }}>
                            Read Full Book
                          </a>
                          <a href={pdfUrl} download style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", color: "#1e3a8a", fontSize: "11px", fontWeight: "600", textDecoration: "none", textAlign: "center", whiteSpace: "nowrap" }}>
                            Download PDF
                          </a>
                        </>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>PDF unavailable</span>
                      )}
                    </div>
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