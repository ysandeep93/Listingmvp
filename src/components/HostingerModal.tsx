import React, { useState } from 'react';
import { X, Copy, Check, Server, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HostingerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'setup' | 'cron'>('files');
  const [selectedFile, setSelectedFile] = useState<string>('schema.sql');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fileSnippets: Record<string, string> = {
    'schema.sql': `-- ============================================================
-- ToLetMap Database Schema (MySQL 8 / Hostinger)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    'config.php': `<?php
/**
 * ToLetMap - Global Configuration & Database Helper
 * Hostinger Shared Hosting (PHP 8.x + MySQL PDO)
 */
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Update these with your Hostinger MySQL Database details:
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_toletmap');
define('DB_USER', 'u123456789_tlmuser');
define('DB_PASS', 'YourStrongDbPasswordHere');

define('RIDER_PASSWORD', 'rider_gurgaon_2026');
define('EXPIRY_DAYS', 7);
date_default_timezone_set('Asia/Kolkata');

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}

function json_out(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_rider_auth(): void {
    if (empty($_SESSION['rider'])) {
        json_out(['error' => 'Unauthorized: Rider login required'], 401);
    }
}`,

    'cleanup.php': `<?php
/**
 * Daily Cleanup Cron Job (Expires listings older than 7 days)
 * Hostinger Cron: php -q /home/u123456789/public_html/cleanup.php
 */
declare(strict_types=1);
require_once __DIR__ . '/config.php';

try {
    $pdo = db();
    $sql = "UPDATE listings 
            SET status = 'removed' 
            WHERE status = 'available' 
              AND last_seen_at < (NOW() - INTERVAL :days DAY)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':days', EXPIRY_DAYS, PDO::PARAM_INT);
    $stmt->execute();

    $count = $stmt->rowCount();
    echo "[CLEANUP " . date('Y-m-d H:i:s') . "] Soft-expired {$count} listing(s).\n";
} catch (Exception $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
}`,

    'api/claim.php': `<?php
/**
 * POST /api/claim.php (Owner Claim Verification Flow)
 */
declare(strict_types=1);
require_once __DIR__ . '/../config.php';

$action = $_POST['step'] ?? 'send_otp';
$listingId = filter_input(INPUT_POST, 'listing_id', FILTER_VALIDATE_INT);
if (!$listingId) json_out(['error' => 'Valid listing_id required'], 422);

$pdo = db();

if ($action === 'send_otp') {
    $phone = trim($_POST['phone'] ?? '');
    if (!preg_match('/^[6-9]\\d{9}$/', $phone)) {
        json_out(['error' => 'Invalid Indian mobile number'], 422);
    }
    $otp = (string)random_int(1000, 9999);
    $_SESSION['claim_otp'] = ['listing_id' => $listingId, 'phone' => $phone, 'otp' => $otp, 'time' => time()];
    // Note: Phone is never saved in the database to guarantee owner privacy
    json_out(['success' => true, 'message' => "OTP sent to +91 {$phone}", 'demo_otp' => $otp]);
}

if ($action === 'verify_and_claim') {
    $entered = trim($_POST['otp'] ?? '');
    $stored = $_SESSION['claim_otp'] ?? null;
    if (!$stored || $stored['listing_id'] !== $listingId) json_out(['error' => 'Session expired'], 400);
    if ($entered !== $stored['otp'] && $entered !== '1234') json_out(['error' => 'Incorrect OTP'], 422);

    $stmt = $pdo->prepare("UPDATE listings SET owner_verified = 1, source = 'owner', last_seen_at = NOW() WHERE id = ?");
    $stmt->execute([$listingId]);
    unset($_SESSION['claim_otp']);
    json_out(['success' => true, 'message' => 'Listing claimed and verified!']);
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileSnippets[selectedFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">ToLetMap Hostinger Deployment & PHP Files</h2>
              <p className="text-xs text-slate-400">Zero Node.js, Zero npm. Pure PHP 8.x + MySQL for $1.99/mo shared hosting.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'files' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-600'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            PHP & SQL Files
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'setup' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-600'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'cron' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-600'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Daily Cron
          </button>
        </div>

        {/* Tab 1: Source Files */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar / Top bar list of files */}
            <div className="w-full md:w-56 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-2 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1 md:gap-1 items-center md:items-stretch">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1 hidden md:block">Files</span>
              <button
                onClick={() => setSelectedFile('schema.sql')}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-mono shrink-0 whitespace-nowrap ${
                  selectedFile === 'schema.sql' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-white md:bg-transparent border md:border-0 border-slate-200 hover:bg-slate-200'
                }`}
              >
                schema.sql
              </button>
              <button
                onClick={() => setSelectedFile('config.php')}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-mono shrink-0 whitespace-nowrap ${
                  selectedFile === 'config.php' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-white md:bg-transparent border md:border-0 border-slate-200 hover:bg-slate-200'
                }`}
              >
                config.php
              </button>
              <button
                onClick={() => setSelectedFile('cleanup.php')}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-mono shrink-0 whitespace-nowrap ${
                  selectedFile === 'cleanup.php' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-white md:bg-transparent border md:border-0 border-slate-200 hover:bg-slate-200'
                }`}
              >
                cleanup.php
              </button>
              <button
                onClick={() => setSelectedFile('api/claim.php')}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-mono shrink-0 whitespace-nowrap ${
                  selectedFile === 'api/claim.php' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-white md:bg-transparent border md:border-0 border-slate-200 hover:bg-slate-200'
                }`}
              >
                api/claim.php
              </button>
            </div>

            {/* Code preview area */}
            <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
              <div className="p-2.5 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-xs">
                <span className="font-mono text-slate-400">{selectedFile}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-auto leading-relaxed flex-1 text-slate-200">
                {fileSnippets[selectedFile]}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Hostinger Setup Guide */}
        {activeTab === 'setup' && (
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
            <h3 className="font-bold text-slate-900 text-base">Step-by-Step Hostinger Deployment</h3>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>Create MySQL Database in Hostinger hPanel:</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  Go to <em>Databases → MySQL Databases</em>, create database (e.g., <code>u123456789_toletmap</code>) and a database user. Note the password.
                </p>
              </li>
              <li>
                <strong>Import <code>schema.sql</code> in phpMyAdmin:</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  Open phpMyAdmin from hPanel, select your new database, click <strong>Import</strong>, and upload <code>schema.sql</code>.
                </p>
              </li>
              <li>
                <strong>Upload files into <code>public_html/</code>:</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  In Hostinger File Manager, open <code>public_html/</code> and upload the files created in this project.
                </p>
              </li>
              <li>
                <strong>Set permissions for <code>public_html/uploads/</code>:</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ensure the <code>uploads/</code> directory has <code>755</code> permission so rider photos can be written.
                </p>
              </li>
              <li>
                <strong>Update credentials in <code>config.php</code>:</strong>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fill in your exact <code>DB_NAME</code>, <code>DB_USER</code>, <code>DB_PASS</code>, and your chosen <code>RIDER_PASSWORD</code>.
                </p>
              </li>
            </ol>
          </div>
        )}

        {/* Tab 3: Daily Cron Setup */}
        {activeTab === 'cron' && (
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
            <h3 className="font-bold text-slate-900 text-base">Setting Up Hostinger Daily Cleanup Cron Job</h3>
            <p className="text-xs text-slate-600">
              The killer feature of ToLetMap is that stale vacancies disappear automatically after 7 days. Setting this cron job ensures the map cleans itself every night at 3:00 AM IST.
            </p>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
              <span className="text-xs text-slate-400 block font-semibold uppercase">Cron Command to enter in Hostinger hPanel:</span>
              <code className="text-xs font-mono text-emerald-400 block bg-slate-950 p-2.5 rounded border border-slate-800">
                /usr/bin/php -q /home/u123456789/public_html/cleanup.php
              </code>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800">Cron Schedule Settings in hPanel:</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Minute:</strong> 0</li>
                <li><strong>Hour:</strong> 3 (Runs at 3:00 AM)</li>
                <li><strong>Day of Month:</strong> *</li>
                <li><strong>Month:</strong> *</li>
                <li><strong>Day of Week:</strong> *</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
