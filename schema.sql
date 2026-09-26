-- ============================================================
-- To-Let Map Database Schema
-- Single table architecture for Hostinger MySQL (InnoDB, utf8mb4)
-- ============================================================

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  bhk VARCHAR(20) NOT NULL,           -- '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4+ BHK'
  rent INT DEFAULT NULL,              -- monthly ₹, nullable
  deposit INT DEFAULT NULL,           -- ₹, nullable
  area VARCHAR(120) DEFAULT NULL,     -- free text, e.g. "Sector 14"
  house_no VARCHAR(60) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  photo_url VARCHAR(255) DEFAULT NULL,-- 'uploads/xxxx.jpg' or NULL
  status ENUM('available','taken','removed') DEFAULT 'available',
  source ENUM('rider','owner') DEFAULT 'rider',
  owner_verified TINYINT(1) DEFAULT 0,
  last_seen_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_seen (status, last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
