import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Activity,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  HeartPulse,
  GraduationCap,
  Plane,
  Thermometer,
  UserPlus,
  FileText,
  ChevronRight,
  Download,
  Printer,
  Filter,
  PieChart,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// --- Firebase Initialization ---
let app, auth, db;
try {
  const firebaseConfig = JSON.parse(
    typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
  );
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase error:", error);
}

const appId =
  typeof __app_id !== "undefined" ? __app_id : "busan-ipark-medical-official";
const COLLECTION_NAME = "youth_players_v1";

const TEAMS = ["U18", "U15", "U12", "WFC U15"];
const POSITIONS = ["FW", "MF", "DF", "GK"];

const STATUS_OPTIONS = [
  {
    value: "정상 훈련",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />,
  },
  {
    value: "부분 참여",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Activity className="w-4 h-4 mr-1.5" />,
  },
  {
    value: "재활",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <Clock className="w-4 h-4 mr-1.5" />,
  },
  {
    value: "훈련 제외",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertCircle className="w-4 h-4 mr-1.5" />,
  },
];

const ABSENCE_REASONS = [
  {
    value: "injury",
    label: "부상",
    icon: <HeartPulse className="w-4 h-4 mr-1" />,
  },
  {
    value: "sick",
    label: "질병/컨디션",
    icon: <Thermometer className="w-4 h-4 mr-1" />,
  },
  {
    value: "national",
    label: "대표팀 차출",
    icon: <Plane className="w-4 h-4 mr-1" />,
  },
  {
    value: "school",
    label: "학사 일정",
    icon: <GraduationCap className="w-4 h-4 mr-1" />,
  },
  {
    value: "other",
    label: "기타 사유",
    icon: <FileText className="w-4 h-4 mr-1" />,
  },
];

const SEVERITY_OPTIONS = [
  { level: "low", label: "경미 (1~2주 내)", colorCode: "#FBBF24" },
  { level: "medium", label: "중등도 (3~6주)", colorCode: "#F97316" },
  { level: "high", label: "심각 (장기 재활)", colorCode: "#DC2626" },
];

const calculateDDay = (targetDateStr) => {
  if (!targetDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0)
    return { text: `D-${diffDays}`, status: "upcoming", days: diffDays };
  if (diffDays === 0) return { text: `D-Day`, status: "today", days: 0 };
  return {
    text: `D+${Math.abs(diffDays)} (지연)`,
    status: "overdue",
    days: diffDays,
  };
};

export default function App() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [authError, setAuthError] = useState(null);

  const [activeTab, setActiveTab] = useState("전체 대시보드");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("전체");
  const [filterCategory, setFilterCategory] = useState("전체");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [newHistoryRecord, setNewHistoryRecord] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "injury",
    details: "",
  });

  const [formData, setFormData] = useState({
    team: "U18",
    name: "",
    position: "MF",
    status: "정상 훈련",
    absenceCategory: "injury",
    severity: "low",
    details: "",
    expectedReturn: "",
    notes: "",
    history: [],
  });

  // 1. Auth Init - MUST happen first
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthError(error.message);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching - ONLY happens after auth
  useEffect(() => {
    if (!user || !db) return;

    // STRICT FIREBASE RULE 1: Must use exactly this path structure
    const playersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      COLLECTION_NAME
    );

    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playersData = [];
        snapshot.forEach((doc) =>
          playersData.push({ id: doc.id, ...doc.data() })
        );

        // Sorting in memory (Rule 2: No complex queries)
        playersData.sort((a, b) => {
          if (a.status !== "정상 훈련" && b.status === "정상 훈련") return -1;
          if (a.status === "정상 훈련" && b.status !== "정상 훈련") return 1;
          return a.name.localeCompare(b.name);
        });

        setPlayers(playersData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTeamPlayers = useMemo(
    () =>
      activeTab === "전체 대시보드"
        ? players
        : players.filter((p) => p.team === activeTab),
    [players, activeTab]
  );

  const filteredPlayers = useMemo(() => {
    return currentTeamPlayers.filter((player) => {
      const matchesSearch =
        player.name.includes(searchTerm) ||
        (player.details && player.details.includes(searchTerm));
      const matchesPosition =
        filterPosition === "전체" || player.position === filterPosition;
      let matchesCategory = true;
      if (filterCategory !== "전체") {
        matchesCategory =
          filterCategory === "정상 훈련"
            ? player.status === "정상 훈련"
            : player.status !== "정상 훈련" &&
              player.absenceCategory === filterCategory;
      }
      return matchesSearch && matchesPosition && matchesCategory;
    });
  }, [currentTeamPlayers, searchTerm, filterPosition, filterCategory]);

  const globalStats = useMemo(() => {
    const absent = players.filter((p) => p.status !== "정상 훈련");
    const stats = { total: absent.length, categories: {} };
    ABSENCE_REASONS.forEach((r) => (stats.categories[r.value] = 0));
    absent.forEach((p) => {
      if (stats.categories[p.absenceCategory] !== undefined)
        stats.categories[p.absenceCategory]++;
    });
    return stats;
  }, [players]);

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddHistory = () => {
    if (!newHistoryRecord.details) return;
    const record = {
      id: crypto.randomUUID(),
      date: newHistoryRecord.date || new Date().toISOString(),
      category: newHistoryRecord.category,
      details: newHistoryRecord.details,
    };
    setFormData((prev) => ({
      ...prev,
      history: [record, ...(prev.history || [])],
    }));
    setShowHistoryForm(false);
    setNewHistoryRecord({
      date: new Date().toISOString().split("T")[0],
      category: "injury",
      details: "",
    });
  };

  const removeHistory = (id) =>
    setFormData((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.id !== id),
    }));

  const openModal = (player = null) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        team: player.team || TEAMS[0],
        name: player.name,
        position: player.position || "MF",
        status: player.status,
        absenceCategory: player.absenceCategory || "injury",
        severity: player.severity || "low",
        details: player.details || "",
        expectedReturn: player.expectedReturn || "",
        notes: player.notes || "",
        history: player.history || [],
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        team: activeTab !== "전체 대시보드" ? activeTab : TEAMS[0],
        name: "",
        position: "MF",
        status: "정상 훈련",
        absenceCategory: "injury",
        severity: "low",
        details: "",
        expectedReturn: "",
        notes: "",
        history: [],
      });
    }
    setShowHistoryForm(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;
    try {
      const docRef = editingPlayer
        ? doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            COLLECTION_NAME,
            editingPlayer.id
          )
        : doc(
            collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              COLLECTION_NAME
            )
          );
      await setDoc(docRef, {
        ...formData,
        lastUpdatedAt: new Date().toISOString(),
      });
      closeModal();
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const deletePlayer = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", COLLECTION_NAME, id)
      );
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const toggleStatus = async (player) => {
    if (!user) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        COLLECTION_NAME,
        player.id
      );
      if (player.status === "정상 훈련")
        openModal({ ...player, status: "훈련 제외" });
      else {
        const newHistoryItem = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          category: player.absenceCategory || "injury",
          details: player.details || "복귀 기록",
        };
        const updatedHistory = [newHistoryItem, ...(player.history || [])];
        await setDoc(docRef, {
          ...player,
          status: "정상 훈련",
          absenceCategory: "injury",
          details: "",
          expectedReturn: "",
          history: updatedHistory,
          lastUpdatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleBulkAdd = async () => {
    if (!user || !bulkText.trim()) return;
    const names = bulkText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n);
    try {
      const promises = names.map((name) => {
        const docRef = doc(
          collection(db, "artifacts", appId, "public", "data", COLLECTION_NAME)
        );
        return setDoc(docRef, {
          team: activeTab,
          name: name,
          position: "MF",
          status: "정상 훈련",
          absenceCategory: "injury",
          severity: "low",
          details: "",
          expectedReturn: "",
          notes: "",
          history: [],
          lastUpdatedAt: new Date().toISOString(),
        });
      });
      await Promise.all(promises);
      setBulkText("");
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error("Bulk add error:", error);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "소속 팀",
      "선수명",
      "포지션",
      "현재 상태",
      "결장 사유",
      "상세 내역",
      "복귀 예정일",
    ];
    const csvData = players.map((p) => [
      p.team,
      p.name,
      p.position,
      p.status,
      p.status === "정상 훈련"
        ? "-"
        : ABSENCE_REASONS.find((r) => r.value === p.absenceCategory)?.label ||
          "-",
      p.details || "-",
      p.expectedReturn || "-",
    ]);
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `부산아이파크_메디컬리포트_${currentTime.toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStyle = (statusName) =>
    STATUS_OPTIONS.find((s) => s.value === statusName) || STATUS_OPTIONS[0];
  const getCategoryStyle = (catValue) =>
    ABSENCE_REASONS.find((c) => c.value === catValue) || ABSENCE_REASONS[0];

  // Error State Display
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          인증 오류가 발생했습니다
        </h2>
        <p className="text-gray-600 mb-4">{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          새로고침
        </button>
      </div>
    );
  }

  // Loading State Display
  if (loading && !players.length)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <HeartPulse className="w-16 h-16 text-[#C8102E] animate-pulse mb-6" />
        <p className="text-gray-600 font-bold text-lg tracking-wide">
          부산아이파크 시스템 연동 중...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-800 font-sans pb-20 print:bg-white print:pb-0">
      <header className="bg-gradient-to-r from-[#8A0A1F] via-[#C8102E] to-[#E2231A] text-white shadow-lg sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-md w-12 h-12 flex items-center justify-center shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Busan_IPark_logo.svg/300px-Busan_IPark_logo.svg.png"
                alt="부산아이파크 로고"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                  e.target.parentNode.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8102E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
                }}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-md">
                부산아이파크 메디컬 시스템
              </h1>
              <p className="text-[10px] sm:text-xs font-medium text-red-100 opacity-90 tracking-widest mt-0.5 uppercase">
                Medical Dashboard
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right border-r border-white/20 pr-4">
              <p className="text-sm font-bold tracking-wide">
                {currentTime.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>
              <p className="text-xs text-red-100 font-medium">
                {currentTime.toLocaleTimeString("ko-KR", { hour12: false })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg border border-white/20 transition-all"
              >
                <Printer className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={exportToCSV}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg border border-white/20 transition-all"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto pt-2">
          {["전체 대시보드", ...TEAMS].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[#F3F4F6] text-[#C8102E] shadow-t-md"
                  : "text-white opacity-80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === "전체 대시보드" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-extrabold text-gray-800 flex items-center">
                  <PieChart className="w-6 h-6 mr-2 text-[#C8102E]" /> 유스 전체
                  현황
                </h3>
                <div className="flex gap-3">
                  <div className="bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-emerald-600 mb-0.5">
                      정상
                    </p>
                    <p className="text-xl font-black text-emerald-700">
                      {players.filter((p) => p.status === "정상 훈련").length}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl px-4 py-2 border border-red-100 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-red-600 mb-0.5">
                      결장
                    </p>
                    <p className="text-xl font-black text-red-700">
                      {globalStats.total}
                    </p>
                  </div>
                </div>
              </div>
              {globalStats.total === 0 ? (
                <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 font-bold text-lg">
                    현재 결장 중인 선수가 없습니다. 모든 선수가 정상 훈련
                    중입니다.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-600">
                          구분 (결장 사유)
                        </th>
                        {TEAMS.map((team) => (
                          <th
                            key={team}
                            className="px-4 py-4 text-center text-xs font-black text-gray-600 border-l border-gray-200"
                          >
                            {team}
                          </th>
                        ))}
                        <th className="px-6 py-4 text-center text-xs font-black text-[#C8102E] border-l border-gray-200 bg-red-50/50">
                          총계
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {ABSENCE_REASONS.map((reason) => {
                        const rowTotal = globalStats.categories[reason.value];
                        if (rowTotal === 0) return null;
                        return (
                          <tr key={reason.value}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold flex items-center">
                              {reason.icon}{" "}
                              <span className="ml-2">{reason.label}</span>
                            </td>
                            {TEAMS.map((team) => {
                              const count = players.filter(
                                (p) =>
                                  p.status !== "정상 훈련" &&
                                  p.absenceCategory === reason.value &&
                                  p.team === team
                              ).length;
                              return (
                                <td
                                  key={team}
                                  className="px-4 py-4 text-center border-l border-gray-100"
                                >
                                  {count > 0 ? (
                                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded font-black text-xs">
                                      {count}명
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 text-center text-base font-black text-[#C8102E] border-l border-gray-200 bg-red-50/20">
                              {rowTotal}명
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 font-extrabold text-gray-800">
                미참여 선수 리포트
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr className="text-left text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">팀 / 이름</th>
                      <th className="px-6 py-3">사유</th>
                      <th className="px-6 py-3">상세 내용</th>
                      <th className="px-6 py-3">복귀 예정</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {players
                      .filter((p) => p.status !== "정상 훈련")
                      .map((p) => {
                        const dDay = calculateDDay(p.expectedReturn);
                        return (
                          <tr key={p.id}>
                            <td className="px-6 py-4">
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-1 rounded mr-2">
                                {p.team}
                              </span>
                              {p.name}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold">
                              {getCategoryStyle(p.absenceCategory).label}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {p.details || "-"}
                            </td>
                            <td className="px-6 py-4">
                              {dDay ? (
                                <span className="bg-orange-100 text-orange-700 text-xs font-black px-2 py-1 rounded">
                                  {dDay.text}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "전체 대시보드" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="선수명 검색..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl focus:ring-2 focus:ring-[#C8102E] text-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-[#C8102E] text-sm font-bold min-w-[140px]"
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                  >
                    <option value="전체">전체 포지션</option>
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    className="px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-[#C8102E] text-sm font-bold min-w-[150px]"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="전체">모든 상태</option>
                    <option value="정상 훈련">🟢 정상 훈련</option>
                    {ABSENCE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        🔴 결장: {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="flex-1 lg:flex-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-extrabold bg-white hover:bg-gray-50"
                >
                  <UserPlus className="inline w-4 h-4 mr-2" /> 명단 추가
                </button>
                <button
                  onClick={() => openModal()}
                  className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-sm font-extrabold text-white bg-[#C8102E] hover:bg-red-800 shadow-md"
                >
                  <Plus className="inline w-4 h-4 mr-1.5" /> 선수 개별 등록
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayers.map((player) => {
                const statusStyle = getStatusStyle(player.status);
                const isNormal = player.status === "정상 훈련";
                const dDay = calculateDDay(player.expectedReturn);
                return (
                  <div
                    key={player.id}
                    className={`bg-white rounded-3xl shadow-sm border ${
                      !isNormal ? "border-red-200" : "border-gray-100"
                    } overflow-hidden flex flex-col`}
                  >
                    <div className="px-5 py-4 flex justify-between items-start border-b border-gray-50">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded mr-2">
                          {player.position}
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900 inline">
                          {player.name}
                        </h3>
                        <div className="mt-1.5 flex gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border ${statusStyle.color}`}
                          >
                            {player.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex bg-gray-50 rounded-lg p-1">
                        <button
                          onClick={() => openModal(player)}
                          className="p-1.5 text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      {isNormal ? (
                        <div className="text-center py-6 opacity-40">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                          <p className="font-bold text-gray-500 text-sm">
                            정상 훈련
                          </p>
                          <button
                            onClick={() => toggleStatus(player)}
                            className="mt-4 text-xs font-bold text-red-500 border border-red-100 rounded-lg px-3 py-1.5 hover:bg-red-50"
                          >
                            훈련 제외
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            {player.details || "사유 없음"}
                          </p>
                          {dDay && (
                            <div className="text-[10px] font-black bg-orange-500 text-white px-2 py-1 rounded inline-block">
                              {dDay.text} ({player.expectedReturn})
                            </div>
                          )}
                          <button
                            onClick={() => toggleStatus(player)}
                            className="w-full mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg py-2 hover:bg-emerald-100"
                          >
                            훈련 복귀
                          </button>
                        </div>
                      )}
                      {player.history && player.history.length > 0 && (
                        <div className="mt-4 pt-3 border-t text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" /> 히스토리{" "}
                          <strong className="text-gray-700">
                            {player.history.length}
                          </strong>
                          건
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
            onClick={() => setIsBulkModalOpen(false)}
          ></div>
          <div className="relative bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-extrabold mb-4 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-[#C8102E]" /> {activeTab}{" "}
              명단 일괄 추가
            </h3>
            <textarea
              className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#C8102E] resize-none"
              placeholder="김부산, 박축구, 이유스 (쉼표나 줄바꿈으로 구분)"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            ></textarea>
            <button
              onClick={handleBulkAdd}
              className="w-full mt-4 py-3.5 bg-gray-900 text-white rounded-xl font-extrabold hover:bg-black"
            >
              등록하기
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
            onClick={closeModal}
          ></div>
          <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="flex-1 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-extrabold">
                  {editingPlayer ? "선수 상태 수정" : "신규 선수 등록"}
                </h3>
                <button onClick={closeModal}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">팀</label>
                  <select
                    name="team"
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-bold"
                    value={formData.team}
                    onChange={handleInputChange}
                  >
                    {TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">
                    포지션
                  </label>
                  <select
                    name="position"
                    className="w-full bg-gray-50 border rounded-xl p-2.5 font-bold"
                    value={formData.position}
                    onChange={handleInputChange}
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">이름</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full bg-gray-50 border rounded-xl p-2.5 font-bold"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">상태</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, status: opt.value })
                      }
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.status === opt.value
                          ? "bg-gray-800 text-white"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
              {formData.status !== "정상 훈련" && (
                <div className="p-4 bg-red-50 rounded-2xl space-y-4">
                  <div>
                    <label className="text-xs font-bold text-red-700">
                      사유
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ABSENCE_REASONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              absenceCategory: opt.value,
                            })
                          }
                          className={`px-3 py-2 text-xs font-bold rounded-lg border ${
                            formData.absenceCategory === opt.value
                              ? "bg-red-600 text-white"
                              : "bg-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-red-700">
                      상세내용
                    </label>
                    <textarea
                      name="details"
                      className="w-full border rounded-xl p-2.5 text-xs font-medium resize-none"
                      rows="2"
                      value={formData.details}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-red-700">
                      복귀 예정일
                    </label>
                    <input
                      type="date"
                      name="expectedReturn"
                      className="w-full border rounded-xl p-2.5 text-xs"
                      value={formData.expectedReturn}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-gray-100 font-bold rounded-xl"
                >
                  취소
                </button>
                <button
                  onClick={savePlayer}
                  className="px-8 py-2.5 bg-[#C8102E] text-white font-extrabold rounded-xl shadow-md"
                >
                  저장
                </button>
              </div>
            </div>
            <div className="w-full md:w-80 bg-gray-50 p-6 border-l overflow-y-auto max-h-[500px] md:max-h-none">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-extrabold text-gray-600 flex items-center">
                  <FileText className="w-4 h-4 mr-1 text-[#C8102E]" /> 과거 이력
                </h4>
                <button
                  type="button"
                  onClick={() => setShowHistoryForm(!showHistoryForm)}
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"
                >
                  + 추가
                </button>
              </div>
              {showHistoryForm && (
                <div className="bg-white p-3 rounded-xl border border-blue-200 mb-4 space-y-2">
                  <input
                    type="date"
                    value={newHistoryRecord.date}
                    onChange={(e) =>
                      setNewHistoryRecord({
                        ...newHistoryRecord,
                        date: e.target.value,
                      })
                    }
                    className="w-full text-[10px] p-2 border rounded"
                  />
                  <textarea
                    placeholder="상세 사유"
                    value={newHistoryRecord.details}
                    onChange={(e) =>
                      setNewHistoryRecord({
                        ...newHistoryRecord,
                        details: e.target.value,
                      })
                    }
                    className="w-full text-[10px] p-2 border rounded resize-none"
                    rows="2"
                  ></textarea>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setShowHistoryForm(false)}
                      className="text-[10px] px-2 py-1 bg-gray-100 rounded"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleAddHistory}
                      className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {formData.history && formData.history.length > 0 ? (
                  formData.history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-xl border shadow-sm relative group"
                    >
                      <button
                        type="button"
                        onClick={() => removeHistory(item.id)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 hidden group-hover:block"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="text-[10px] font-bold text-gray-400 mb-1">
                        {item.date.split("T")[0]}
                      </div>
                      <p className="text-xs font-medium text-gray-700">
                        {item.details}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-10 text-xs font-bold">
                    기록된 이력이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
