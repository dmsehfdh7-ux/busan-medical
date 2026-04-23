/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Activity, Search, Plus, Edit2, Trash2, X, AlertCircle, 
  CheckCircle2, Clock, HeartPulse, GraduationCap, Plane, Thermometer, 
  UserPlus, FileText, PieChart, Download, Printer
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- Firebase 초기화 및 로컬 실행 대응 ---
let app, auth, db;
let isFirebaseReady = false;

// appId에 슬래시(/)가 포함될 경우 Firestore 세그먼트 오류가 발생하므로 치환 처리합니다.
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'busan-ipark-medical-official';
const appId = rawAppId.replace(/\//g, '_');

try {
  const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  
  if (configStr && configStr !== '{}') {
    const firebaseConfig = JSON.parse(configStr);
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      isFirebaseReady = true;
    }
  } else {
    console.warn("데이터베이스 설정값이 없습니다. 현재는 보기 모드로 작동하거나 설정이 필요합니다.");
  }
} catch (error) { 
  console.error("Firebase 초기화 중 오류 발생:", error); 
}

const COLLECTION_NAME = 'youth_players_v1';

// --- 기본 데이터 ---
const MOCK_DATA = [
  { id: '1', name: '예시 선수', team: 'U18', position: 'FW', status: '정상 훈련', details: '', expectedReturn: '', history: [] }
];

const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];

// 아이콘을 컴포넌트 자체로 저장하여 렌더링 오류를 방지합니다.
const STATUS_OPTIONS = [
  { value: '정상 훈련', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  { value: '부분 참여', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Activity },
  { value: '재활', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
  { value: '훈련 제외', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle }
];

const ABSENCE_REASONS = [
  { value: 'injury', label: '부상', icon: HeartPulse },
  { value: 'sick', label: '질병/컨디션', icon: Thermometer },
  { value: 'national', label: '대표팀 차출', icon: Plane },
  { value: 'school', label: '학사 일정', icon: GraduationCap },
  { value: 'other', label: '기타 사유', icon: FileText },
];

const calculateDDay = (targetDateStr) => {
  if (!targetDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return { text: `D-${diffDays}`, status: 'upcoming' };
  if (diffDays === 0) return { text: `D-Day`, status: 'today' };
  return { text: `D+${Math.abs(diffDays)}`, status: 'overdue' };
};

export default function App() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState(MOCK_DATA);
  const [loading, setLoading] = useState(isFirebaseReady);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [activeTab, setActiveTab] = useState('전체 대시보드');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('전체');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    team: 'U18', name: '', position: 'MF', status: '정상 훈련',
    absenceCategory: 'injury', details: '', expectedReturn: '', history: []
  });

  // 1. 인증 처리
  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("인증 에러:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 데이터 동기화
  useEffect(() => {
    if (!isFirebaseReady || !user || !db) return;
    // 경로 세그먼트를 명확히 하여 5개의 세그먼트가 되도록 합니다.
    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersData = [];
      snapshot.forEach((doc) => playersData.push({ id: doc.id, ...doc.data() }));
      playersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setPlayers(playersData.length > 0 ? playersData : MOCK_DATA);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 실패:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const list = activeTab === '전체 대시보드' ? players : players.filter(p => p.team === activeTab);
    return list.filter(player => {
      const matchesSearch = (player.name || '').includes(searchTerm);
      const matchesPosition = filterPosition === '전체' || player.position === filterPosition;
      return matchesSearch && matchesPosition;
    });
  }, [players, activeTab, searchTerm, filterPosition]);

  const globalStats = useMemo(() => {
    const absent = players.filter(p => p.status !== '정상 훈련');
    const stats = { total: absent.length, categories: {} };
    ABSENCE_REASONS.forEach(r => stats.categories[r.value] = 0);
    absent.forEach(p => { if (stats.categories[p.absenceCategory] !== undefined) stats.categories[p.absenceCategory]++; });
    return stats;
  }, [players]);

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!isFirebaseReady) {
      alert("현재는 미리보기 모드입니다. 데이터베이스 설정이 필요합니다.");
      return;
    }
    try {
      const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME));
      await setDoc(docRef, { ...formData, lastUpdatedAt: new Date().toISOString() });
      setIsModalOpen(false);
    } catch (error) { alert("저장 실패: " + error.message); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#C8102E]">연결 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {!isFirebaseReady && (
        <div className="bg-yellow-500 text-white text-[10px] font-bold text-center py-1">
          ⚠️ 현재 미리보기 모드입니다. (데이터베이스가 연결되지 않음)
        </div>
      )}
      <header className="bg-[#C8102E] text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <h1 className="text-xl font-black">부산아이파크 메디컬</h1>
          </div>
          <p className="text-xs font-bold">{currentTime.toLocaleTimeString()}</p>
        </div>
        <div className="max-w-7xl mx-auto flex gap-4 mt-6 overflow-x-auto no-scrollbar">
          {['전체 대시보드', ...TEAMS].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg font-bold text-sm whitespace-nowrap ${activeTab === tab ? 'bg-gray-50 text-[#C8102E]' : 'text-white/60'}`}>{tab}</button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {activeTab === '전체 대시보드' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
              <h3 className="text-lg font-black mb-4 flex items-center"><PieChart className="mr-2 text-[#C8102E] w-5 h-5" /> 유스 전체 참여 현황</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-bold text-emerald-600 mb-1">정상 훈련</p>
                  <p className="text-2xl font-black text-emerald-700">{players.filter(p => p.status === '정상 훈련').length}명</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                  <p className="text-[10px] font-bold text-red-600 mb-1">결장/재활</p>
                  <p className="text-2xl font-black text-red-700">{globalStats.total}명</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black mb-4 uppercase text-xs text-gray-400 tracking-wider">결장 사유 요약</h3>
              <div className="space-y-2">
                {ABSENCE_REASONS.map(r => {
                  const IconComp = r.icon;
                  return (
                    <div key={r.value} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">{r.label}</span>
                      </div>
                      <span className="text-red-600 font-black text-sm">{globalStats.categories[r.value] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-300" />
            <input type="text" placeholder="선수 검색..." className="pl-10 pr-4 py-2 bg-gray-50 rounded-xl w-full text-sm outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#C8102E] text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2"><Plus className="w-4 h-4" /> 선수 추가</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map(player => (
            <div key={player.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-400 uppercase tracking-tighter">{player.position}</span>
                  <h4 className="text-xl font-black text-gray-900 mt-1">{player.name}</h4>
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase">{player.team}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black ${player.status === '정상 훈련' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{player.status}</div>
                {player.status !== '정상 훈련' && calculateDDay(player.expectedReturn) && (
                  <div className="bg-gray-800 text-white text-[9px] px-2 py-1 rounded font-black">{calculateDDay(player.expectedReturn).text}</div>
                )}
              </div>
              {player.details && <p className="text-xs font-bold text-gray-500 line-clamp-2">{player.details}</p>}
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 space-y-6">
            <h2 className="text-xl font-black">선수 등록</h2>
            <div className="space-y-4">
              <input type="text" placeholder="이름" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="flex gap-2">
                <select className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                <select className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select>
              </div>
            </div>
            <button onClick={savePlayer} className="w-full py-5 bg-[#C8102E] text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-transform active:scale-[0.98]">저장하기</button>
          </div>
        </div>
      )}
    </div>
  );
}