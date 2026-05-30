import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const CLASSIFY_URL = `${API_BASE_URL}/api/v1/classify`;
const HISTORY_URL = `${API_BASE_URL}/api/v1/history`;
const LOGIN_URL = `${API_BASE_URL}/api/v1/auth/login`;
const REGISTER_URL = `${API_BASE_URL}/api/v1/auth/register`;

const categoryMeta = {
  Organik: {
    tone: "green",
    advice: "Pisahkan dari sampah kering, lalu olah menjadi kompos rumah tangga.",
  },
  Anorganik: {
    tone: "blue",
    advice: "Bersihkan, keringkan, lalu bawa ke bank sampah atau pusat daur ulang.",
  },
  B3: {
    tone: "orange",
    advice: "Jangan dicampur dengan sampah lain. Serahkan ke titik pengumpulan limbah B3.",
  },
  Kertas: {
    tone: "brown",
    advice: "Pastikan tidak basah atau berminyak agar mudah didaur ulang.",
  },
  Residu: {
    tone: "gray",
    advice: "Masukkan ke wadah residu karena sulit didaur ulang secara mandiri.",
  },
};

const navItems = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "history", label: "Riwayat", icon: "history" },
  { id: "scan", label: "Scan", icon: "scanner" },
  { id: "community", label: "Komunitas", icon: "people" },
  { id: "profile", label: "Akun", icon: "user" },
];

const triviaCards = [
  {
    title: "Fakta Daur Ulang",
    text: "Botol plastik PET sebaiknya dicuci, dikeringkan, lalu disetor ke bank sampah.",
    thumbnail: createSvgThumb("plastic"),
    alt: "Ilustrasi botol plastik untuk edukasi daur ulang",
  },
  {
    title: "Sampah Organik",
    text: "Sisa sayur dan buah bisa diolah menjadi kompos untuk mengurangi sampah rumah.",
    thumbnail: createSvgThumb("organic"),
    alt: "Ilustrasi kompos dan sampah organik",
  },
];

const educationCards = [
  {
    icon: "recycle",
    title: "Pisahkan dari sumber",
    text: "Gunakan wadah berbeda untuk organik, anorganik, B3, kertas, dan residu.",
  },
  {
    icon: "spark",
    title: "Bersihkan kemasan",
    text: "Bilas botol atau kaleng agar tidak berbau dan lebih mudah diterima bank sampah.",
  },
  {
    icon: "leaf",
    title: "Olah sampah organik",
    text: "Sisa sayur, buah, dan daun kering bisa menjadi kompos untuk tanaman.",
  },
];

const fallbackHistoryItems = [
  { name: "Botol Plastik PET", category: "Anorganik", confidence: 96, time: "Hari ini" },
  { name: "Sisa Makanan", category: "Organik", confidence: 91, time: "Kemarin" },
  { name: "Kertas Kemasan", category: "Kertas", confidence: 88, time: "2 hari lalu" },
];

const posts = [
  {
    author: "Nadia",
    badge: "Eco Mentor",
    title: "Tips memilah sampah dapur",
    body: "Pisahkan kulit buah dan sisa sayur sejak awal. Wadah kecil di dekat meja masak bikin kebiasaan ini lebih gampang.",
    stat: "128 suka",
  },
  {
    author: "Bima",
    badge: "Bank Sampah",
    title: "Jadwal setor plastik minggu ini",
    body: "Cuci dan keringkan botol plastik sebelum disetor supaya nilainya lebih tinggi.",
    stat: "34 komentar",
  },
];

const communityTips = [
  {
    title: "Mulai dari 3 kategori",
    text: "Untuk pemula, pisahkan organik, anorganik, dan residu lebih dulu agar rutinitasnya mudah dijaga.",
    tag: "Pemilahan",
  },
  {
    title: "Keringkan plastik sebelum disetor",
    text: "Kemasan yang kering dan bersih memiliki nilai jual lebih baik di bank sampah.",
    tag: "Daur ulang",
  },
  {
    title: "Simpan limbah B3 terpisah",
    text: "Baterai, lampu, dan obat kedaluwarsa jangan dicampur dengan sampah rumah tangga.",
    tag: "Keamanan",
  },
];

const leaderboardItems = [
  { rank: 1, name: "Raka", scans: 48, points: 320 },
  { rank: 2, name: "Nadia", scans: 41, points: 286 },
  { rank: 3, name: "Bima", scans: 36, points: 244 },
  { rank: 4, name: "Sari", scans: 29, points: 198 },
];

function mapHistoryItem(item) {
  const confidence =
    typeof item.confidence === "number"
      ? item.confidence <= 1
        ? Math.round(item.confidence * 100)
        : Math.round(item.confidence)
      : 0;

  return {
    id: item.id,
    name: item.specific_class || item.predicted_class || item.filename || "Scan sampah",
    category: item.category || item.predicted_class || "Anorganik",
    confidence,
    time: formatRelativeTime(item.created_at),
  };
}

function formatRelativeTime(value) {
  if (!value) {
    return "Baru saja";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Baru saja";
  }

  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("ecoscan_user");
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("ecoscan_user");
      return null;
    }
  });
  const [activePage, setActivePage] = useState("home");
  const [scanMode, setScanMode] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState(fallbackHistoryItems);
  const [historyError, setHistoryError] = useState("");
  const isAuthenticated = Boolean(currentUser);

  const predictionTone = useMemo(() => {
    return categoryMeta[prediction?.category || prediction?.predicted_class]?.tone || "green";
  }, [prediction]);

  const confidenceValue =
    typeof prediction?.confidence === "number"
      ? Number((prediction.confidence * 100).toFixed(2))
      : 0;

  const handleAuthenticate = async ({ email, name, password, mode }) => {
    const response = await fetch(mode === "register" ? REGISTER_URL : LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail || "Autentikasi gagal.");
    }

    localStorage.setItem("ecoscan_user", JSON.stringify(data.user));
    setCurrentUser(data.user);
    setActivePage("home");
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(HISTORY_URL);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Riwayat belum bisa dimuat.");
      }

      const items = Array.isArray(data?.items) ? data.items.map(mapHistoryItem) : [];
      setHistoryItems(items);
      setHistoryError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Riwayat belum bisa dimuat.";
      setHistoryError(message === "Failed to fetch" ? "Backend belum terhubung untuk riwayat." : message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setPrediction(null);
    setError("");

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setPreviewUrl("");
      setError("File yang dipilih harus berupa gambar.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePredict = async (fileToPredict = selectedFile) => {
    if (!fileToPredict) {
      setError("Pilih atau ambil gambar sampah terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToPredict);

    setIsLoading(true);
    setPrediction(null);
    setError("");

    try {
      const response = await fetch(CLASSIFY_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Server gagal memproses gambar.");
      }

      setPrediction(data);
      await loadHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";

      setError(
        message === "Failed to fetch"
          ? `Gagal terhubung ke server AI. Pastikan FastAPI berjalan di ${API_BASE_URL}.`
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetScan = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setPrediction(null);
    setError("");
  };

  useEffect(() => {
    if (selectedFile) {
      handlePredict(selectedFile);
    }
  }, [selectedFile]);

  if (!isAuthenticated) {
    return <LoginPage onAuthenticate={handleAuthenticate} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("ecoscan_user");
    setCurrentUser(null);
    setActivePage("home");
  };

  return (
    <div className="app-shell">
      <main className="phone-stage">
        {activePage === "home" && <HomePage onNavigate={setActivePage} user={currentUser} />}
        {activePage === "history" && (
          <HistoryPage historyError={historyError} historyItems={historyItems} onRefresh={loadHistory} />
        )}
        {activePage === "scan" && (
          <ScanPage
            confidenceValue={confidenceValue}
            error={error}
            isLoading={isLoading}
            onImageChange={handleImageChange}
            onPredict={handlePredict}
            onReset={resetScan}
            prediction={prediction}
            predictionTone={predictionTone}
            previewUrl={previewUrl}
            scanMode={scanMode}
            selectedFile={selectedFile}
            setScanMode={setScanMode}
          />
        )}
        {activePage === "community" && <CommunityPage />}
        {activePage === "profile" && (
          <ProfilePage historyItems={historyItems} onLogout={handleLogout} user={currentUser} />
        )}
      </main>

      <BottomNavigation activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}

function LoginPage({ onAuthenticate }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    try {
      await onAuthenticate({ email, name, password, mode });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Autentikasi gagal.";
      setAuthError(message === "Failed to fetch" ? `Gagal terhubung ke ${API_BASE_URL}.` : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setAuthError("");
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandLogo />
        <p>{isRegister ? "Buat akun EcoScan dan mulai catat aksi hijaumu." : "Ayo mulai langkah kecilmu untuk Bumi."}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="input-group">
              <Icon name="user" />
              <input
                type="text"
                placeholder="Nama"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}
          <label className="input-group">
            <Icon name="mail" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="input-group">
            <Icon name="lock" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Icon name="eye" />
            </button>
          </label>

          {authError && <div className="status-card error-card auth-error">{authError}</div>}

          <button className="primary-action" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
          </button>
        </form>

        <p className="signup-copy">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button type="button" onClick={switchMode}>
            {isRegister ? "Masuk" : "Daftar"}
          </button>
        </p>
      </section>
    </main>
  );
}

function BrandLogo() {
  return (
    <div className="brand-logo" aria-label="Logo Eco Scan" role="img">
      <span className="brand-logo-mark">
        <Icon name="leaf" />
      </span>
      <strong>Eco</strong>
      <span>Scan</span>
    </div>
  );
}

function HomePage({ onNavigate, user }) {
  const firstName = user?.name?.split(" ")[0] || "Eco Warrior";

  return (
    <section className="page-content">
      <TopBar title={`Halo, ${firstName}!`} subtitle="Selamat datang kembali" user={user} />

      <section className="hero-card">
        <p>Selamat Datang di Eco Scan</p>
        <div className="hero-stats">
          <StatBlock value="15" label="Scan Minggu Ini" />
          <StatBlock value="120" label="Poin Eco" />
          <StatBlock value="5" label="Hari Streak" />
        </div>
      </section>

      <button className="scan-cta" type="button" onClick={() => onNavigate("scan")}>
        <Icon name="scanner" /> Mulai Scan Sampah
      </button>

      <section className="section-block">
        <div className="section-title">
          <h2>Aksi Cepat</h2>
        </div>
        <div className="quick-grid">
          <QuickAction icon="scanner" label="Scan" onClick={() => onNavigate("scan")} />
          <QuickAction icon="history" label="Riwayat" onClick={() => onNavigate("history")} />
          <QuickAction icon="people" label="Komunitas" onClick={() => onNavigate("community")} />
          <QuickAction icon="user" label="Akun" onClick={() => onNavigate("profile")} />
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>Eco Trivia</h2>
        </div>
        <div className="trivia-grid">
          {triviaCards.map((card) => (
            <article className="trivia-card" key={card.title}>
              <img className="trivia-thumb" src={card.thumbnail} alt={card.alt} />
              <div>
                <span>{card.title}</span>
                <strong>{card.text}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="education-stack" aria-label="Panduan edukasi sampah">
        {educationCards.map((item) => (
          <article className="education-card" key={item.title}>
            <span>
              <Icon name={item.icon} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function ScanPage({
  confidenceValue,
  error,
  isLoading,
  onImageChange,
  onPredict,
  onReset,
  prediction,
  predictionTone,
  previewUrl,
  scanMode,
  selectedFile,
  setScanMode,
}) {
  const cameraInputRef = useRef(null);
  const resultCategory = prediction?.category || prediction?.predicted_class;
  const specificClass = prediction?.specific_class || prediction?.predicted_class;
  const advice =
    prediction?.handling_advice ||
    categoryMeta[resultCategory]?.advice ||
    "Ikuti panduan pemilahan lokal dan simpan hasilnya ke riwayat.";

  const handleShutterClick = () => {
    if (selectedFile) {
      onPredict();
      return;
    }

    cameraInputRef.current?.click();
  };

  return (
    <section className="page-content scan-page">
      <TopBar title={prediction ? "Hasil Scan" : "Scan Sampah"} compact />

      <div className="segmented-control">
        <button
          className={scanMode === "camera" ? "active" : ""}
          type="button"
          onClick={() => setScanMode("camera")}
        >
          Kamera
        </button>
        <button
          className={scanMode === "upload" ? "active" : ""}
          type="button"
          onClick={() => setScanMode("upload")}
        >
          Upload
        </button>
      </div>

      <label className={`scanner-frame ${previewUrl ? "has-preview" : ""}`}>
        <input
          accept="image/*"
          capture={scanMode === "camera" ? "environment" : undefined}
          type="file"
          onChange={onImageChange}
          disabled={isLoading}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview sampah" />
        ) : (
          <div className="scanner-empty">
            <Icon name="scanner" />
            <strong>Pindai Sampah</strong>
            <small>
              {scanMode === "camera"
                ? "Ambil foto sampah langsung dari kamera."
                : "Pilih gambar sampah dari galeri."}
            </small>
          </div>
        )}
        <i className="corner top-left" />
        <i className="corner top-right" />
        <i className="corner bottom-left" />
        <i className="corner bottom-right" />
      </label>

      <p className="scan-helper">
        {selectedFile ? selectedFile.name : "Arahkan kamera atau unggah gambar sampah Anda."}
      </p>

      <div className="scan-actions" aria-label="Kontrol kamera">
        <input
          ref={cameraInputRef}
          className="camera-capture-input"
          accept="image/*"
          capture="environment"
          type="file"
          onChange={onImageChange}
        />
        <button className="round-tool" type="button" aria-label="Senter">
          <Icon name="flashlight" />
        </button>
        <button
          className="capture-button"
          type="button"
          onClick={handleShutterClick}
          disabled={isLoading}
          aria-label={selectedFile ? "Mulai prediksi" : "Ambil foto"}
        >
          <Icon name={isLoading ? "loader" : "camera"} />
        </button>
        <label className="round-tool" aria-label="Galeri">
          <Icon name="gallery" />
          <input accept="image/*" type="file" onChange={onImageChange} />
        </label>
      </div>

      {error && <div className="status-card error-card">{error}</div>}

      {prediction && (
        <section className="result-sheet">
          <div className="result-head">
            <span className={`category-badge ${predictionTone}`}>
              {resultCategory}
            </span>
            <strong>{confidenceValue.toFixed(2)}%</strong>
          </div>
          <div className="confidence-track">
            <span style={{ width: `${confidenceValue}%` }} />
          </div>
          <dl className="result-detail">
            <div>
              <dt>Label AI</dt>
              <dd>{specificClass}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{confidenceValue.toFixed(2)}%</dd>
            </div>
          </dl>
          <div className="advice-box">
            <strong>Cara Pengolahan</strong>
            <p>{advice}</p>
          </div>
          <div className="result-actions">
            <button className="primary-action" type="button" disabled>
              Tersimpan di Riwayat
            </button>
            <button className="secondary-action" type="button" onClick={onReset}>
              Scan Ulang
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function CommunityPage() {
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <section className="page-content">
      <TopBar title="Komunitas" subtitle="Belajar dan bergerak bersama" />

      <div className="search-box">Cari tips, pengguna, atau topik...</div>

      <div className="tabs">
        <button
          className={activeTab === "feed" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("feed")}
        >
          Feed
        </button>
        <button
          className={activeTab === "tips" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("tips")}
        >
          Tips
        </button>
        <button
          className={activeTab === "leaderboard" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === "feed" && <CommunityFeed />}
      {activeTab === "tips" && <CommunityTips />}
      {activeTab === "leaderboard" && <CommunityLeaderboard />}
    </section>
  );
}

function CommunityFeed() {
  return (
    <>
      <section className="challenge-card">
        <span>Tantangan Minggu Ini</span>
        <h2>Scan 10 sampah plastik</h2>
        <div className="confidence-track">
          <span style={{ width: "60%" }} />
        </div>
        <p>6/10 scan selesai</p>
      </section>

      <section className="post-list">
        {posts.map((post) => (
          <article className="post-card" key={post.title}>
            <div className="post-author">
              <div className="avatar small">{post.author[0]}</div>
              <div>
                <strong>{post.author}</strong>
                <span>{post.badge}</span>
              </div>
            </div>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <div className="post-actions">
              <span>{post.stat}</span>
              <button type="button">Simpan</button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function CommunityTips() {
  return (
    <section className="tips-list">
      {communityTips.map((tip) => (
        <article className="tip-card" key={tip.title}>
          <span>{tip.tag}</span>
          <h3>{tip.title}</h3>
          <p>{tip.text}</p>
        </article>
      ))}
    </section>
  );
}

function CommunityLeaderboard() {
  return (
    <section className="leaderboard-list">
      {leaderboardItems.map((item) => (
        <article className="leaderboard-item" key={item.name}>
          <strong className="rank-number">{item.rank}</strong>
          <div className="avatar small">{item.name[0]}</div>
          <div>
            <h3>{item.name}</h3>
            <p>{item.scans} scan minggu ini</p>
          </div>
          <strong>{item.points}</strong>
        </article>
      ))}
    </section>
  );
}

function ProfilePage({ historyItems, onLogout, user }) {
  const displayName = user?.name || "Eco Warrior";
  const displayEmail = user?.email || "user@ecoscan.local";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <section className="page-content profile-page">
      <TopBar title="Akun" compact user={user} />

      <section className="profile-card">
        <div className="avatar large">{initial}</div>
        <h1>{displayName}</h1>
        <p>{displayEmail}</p>
        <span>Eco Warrior Level 3</span>
      </section>

      <div className="profile-stats">
        <StatBlock value="48" label="Total Scan" />
        <StatBlock value="320" label="Poin" />
        <StatBlock value="7" label="Streak" />
      </div>

      <section className="section-block">
        <div className="section-title">
          <h2>Riwayat Scan</h2>
        </div>
        <HistoryList items={historyItems} />
      </section>

      <section className="settings-list">
        {["Edit Profile", "Notifikasi", "Bahasa Indonesia", "Tema Light", "Bantuan"].map(
          (item) => (
            <button type="button" key={item}>
              <span>{item}</span>
              <strong>&gt;</strong>
            </button>
          )
        )}
        <button className="logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </section>
    </section>
  );
}

function HistoryPage({ historyError, historyItems, onRefresh }) {
  return (
    <section className="page-content">
      <TopBar title="Riwayat" subtitle="Aktivitas scan terbaru" />
      {historyError && (
        <div className="status-card error-card">
          {historyError}
          <button className="inline-action" type="button" onClick={onRefresh}>
            Muat ulang
          </button>
        </div>
      )}
      <HistoryList items={historyItems} />
    </section>
  );
}

function HistoryList({ items }) {
  if (items.length === 0) {
    return <div className="status-card empty-card">Belum ada riwayat scan.</div>;
  }

  return (
    <div className="history-list">
      {items.map((item) => (
        <article className="history-item" key={item.id || `${item.name}-${item.time}`}>
          <div className="history-copy">
            <strong>{item.name}</strong>
            <span>{item.time}</span>
          </div>
          <div className="history-meta">
            <span className={`category-badge ${categoryMeta[item.category]?.tone}`}>
              {item.category}
            </span>
            <small>{item.confidence}%</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function BottomNavigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {navItems.map((item) => (
        <button
          className={`${activePage === item.id ? "active" : ""} ${
            item.id === "scan" ? "scan-nav" : ""
          }`}
          type="button"
          key={item.id}
          onClick={() => onNavigate(item.id)}
        >
          <Icon name={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function TopBar({ title, subtitle, compact = false, user = null }) {
  const initial = (user?.name || "E").charAt(0).toUpperCase();

  return (
    <header className={`top-bar ${compact ? "compact" : ""}`}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="top-actions">
        <div className="avatar">{initial}</div>
        <button type="button" aria-label="Notifikasi">
          <Icon name="bell" />
        </button>
      </div>
    </header>
  );
}

function StatBlock({ value, label }) {
  return (
    <div className="stat-block">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button className="quick-action" type="button" onClick={onClick}>
      <span>
        <Icon name={icon} />
      </span>
      {label}
    </button>
  );
}

function Icon({ name }) {
  const common = {
    className: "icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="m3 10.5 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "scanner":
      return (
        <svg {...common}>
          <path d="M7 3H5a2 2 0 0 0-2 2v2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M8 8h8v8H8z" />
          <path d="M11 11h2v2h-2z" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
          <circle cx="12" cy="8" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 4.1a4 4 0 0 1 0 7.8" />
          <path d="M2 21v-2a4 4 0 0 1 3-3.9" />
          <path d="M8 4.1a4 4 0 0 0 0 7.8" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "flashlight":
      return (
        <svg {...common}>
          <path d="M9 2h6" />
          <path d="M10 2v5l-2 3v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10l-2-3V2" />
          <path d="M10 10h4" />
          <path d="M12 14v4" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M14.5 5 13 3H9L7.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "gallery":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8" cy="10" r="1.5" />
          <path d="m21 16-5-5L5 19" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "loader":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-6.2-8.6" />
        </svg>
      );
    case "recycle":
      return (
        <svg {...common}>
          <path d="m7 19-2-3 2-3" />
          <path d="M5 16h8a4 4 0 0 0 3.4-6.1" />
          <path d="m17 5 2 3-2 3" />
          <path d="M19 8h-8a4 4 0 0 0-3.4 6.1" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 2v5" />
          <path d="M12 17v5" />
          <path d="m4.9 4.9 3.5 3.5" />
          <path d="m15.6 15.6 3.5 3.5" />
          <path d="M2 12h5" />
          <path d="M17 12h5" />
          <path d="m4.9 19.1 3.5-3.5" />
          <path d="m15.6 8.4 3.5-3.5" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M4 20c8-2 14-8 16-16-8 1-14 4-17 10 0 3 1 5 1 6z" />
          <path d="M4 20c3-5 7-8 12-10" />
        </svg>
      );
    default:
      return null;
  }
}

function createSvgThumb(type) {
  const svg =
    type === "plastic"
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#d9f7e6"/><stop offset="1" stop-color="#7ed7a3"/></linearGradient></defs><rect width="320" height="220" rx="28" fill="url(#g)"/><circle cx="250" cy="50" r="34" fill="#fff8ea" opacity=".65"/><path d="M141 46h38v20h-38z" fill="#2f80ed"/><path d="M132 66h56l-7 112c-1 15-12 25-28 25s-27-10-28-25z" fill="#dff4ff" stroke="#176dbd" stroke-width="8"/><path d="M140 101h41M139 129h43M137 157h45" stroke="#85c7ee" stroke-width="8" stroke-linecap="round"/><path d="M62 164c28-47 75-50 112-16 24 21 47 22 83 0" fill="none" stroke="#0b6b43" stroke-width="12" stroke-linecap="round"/><path d="M63 84h46v46H63z" fill="#18b86f" opacity=".22"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff3c4"/><stop offset="1" stop-color="#a4d96c"/></linearGradient></defs><rect width="320" height="220" rx="28" fill="url(#g)"/><circle cx="66" cy="52" r="38" fill="#ffffff" opacity=".55"/><path d="M83 160c26-54 70-85 139-78-8 67-50 105-119 100" fill="#24b46b"/><path d="M109 155c38-27 70-42 110-56" stroke="#0b6b43" stroke-width="9" stroke-linecap="round"/><path d="M66 169h188l-16 30H82z" fill="#8a653a"/><path d="M90 132c22-20 53-20 71 0-22 19-50 20-71 0z" fill="#0f8f55"/><path d="M212 130c-17-21-16-48 3-66 17 22 16 46-3 66z" fill="#2bc77a"/></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default App;
