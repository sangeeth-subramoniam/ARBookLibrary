import React from "react";
import { useNavigate } from "react-router-dom";
import '../App.css';

const Homepage = () => {
  const navigate = useNavigate();

  const handleBookScan = () => {
    navigate("/scanner"); // Navigates to the ARBookScanner component
  };

  const handleShelfScan = () => {
    alert("本棚をスキャン 機能は準備中です");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        className="homepage_container"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "20px",
            padding: "30px"
          }}
        >

          <h2 style={{ margin: 0 }}>📸LiCS-Re2 ARショールーム</h2>
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
          }}
        >
          <button
            onClick={handleBookScan}
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "15px 30px",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            📚 本をスキャン
          </button>
          <button
            onClick={handleShelfScan}
            style={{
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "15px 30px",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            📖 本棚をスキャン
          </button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
