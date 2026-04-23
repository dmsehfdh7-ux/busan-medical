import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Search, Plus, Edit2, Trash2, X, AlertCircle, 
  CheckCircle2, Clock, HeartPulse, GraduationCap, Plane, Thermometer, 
  FileText, Users, ClipboardCheck, Info, ChevronRight,
  History, Calendar, TrendingUp, Shield
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// 🔴 여기를 본인의 Firebase 설정값으로 채우세요!
const firebaseConfig = {
  apiKey: "부산아이파크_API_KEY",
  authDomain: "부산아이파크_PROJECT.firebaseapp.com",
  projectId: "부산아이파크_PROJECT_ID",
  storageBucket: "부산아이파크_PROJECT.appspot.com",
  messagingSenderId: "부산아이파크_SENDER_ID",
  appId: "부산아이파크_APP_ID"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = 'youth_players_final_v10';
const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];
const BODY_PARTS = ['발목', '무릎', '허벅지', '서혜부', '종아리', '허리', '어깨', '기타'];

const STATUS_OPTIONS = [
  { value: '정상 훈련', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  { value: '부분 참여', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Activity },
  { value: '재활', color: 'bg-orange-50 text-orange-800 border-orange-200', icon: Clock },
  { value: '훈련 제외', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: AlertCircle }
];

const ABSENCE_REASONS = [
  { value: 'injury', label: '부상', icon: HeartPulse },
  { value: 'sick', label: '질병/컨디션', icon: Thermometer },
  { value: 'national', label: '대표팀 차출', icon: Plane },
  { value: 'school', label: '학사 일정', icon: GraduationCap },
  { value: 'other', label: '기타 사유', icon: FileText },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('전체 대시보드');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    team: 'U18', name: '', position: 'MF', status: '정상 훈련', 
    absenceCategory: 'injury', bodyPart: '기타', details: '', expectedReturn: '',
    history: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setUser(user); } 
      else { signInAnonymously(auth).catch(err => console.error("인증 실패")); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const playersRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setPlayers(data);
      setLoading(false);
    }, (error) => { setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const list = activeTab === '전체 대시보드' ? players : players.filter(p => p.team === activeTab);
    return list.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [players, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const teamStats = {};
    TEAMS.forEach(team => {
      const tp = players.filter(p => p.team === team);
      teamStats[team] = { total: tp.length, normal: tp.filter(p => p.status === '정상 훈련').length };
    });
    const returningSoon = players.filter(p => p.status !== '정상 훈련' && p.expectedReturn)
      .sort((a, b) => new Date(a.expectedReturn) - new Date(b.expectedReturn)).slice(0, 10);
    return { teamStats, returningSoon };
  }, [players]);

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const docRef = editingId ? doc(db, COLLECTION_NAME, editingId) : doc(collection(db, COLLECTION_NAME));
      let history = [...(formData.history || [])];
      const date = new Date().toLocaleDateString();
      if (editingId) {
        const old = players.find(p => p.id === editingId);
        if (old && old.status !== formData.status) history.push({ date, from: old.status, to: formData.status, note: formData.details || '상태변경' });
      } else {
        history.push({ date, from: '신규', to: formData.status, note: '최초등록' });
      }
      await setDoc(docRef, { ...formData, history: history.slice(-15), lastUpdatedAt: new Date().toISOString() });
      setIsModalOpen(false);
    } catch (e) { alert("저장 실패"); }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText.split('\n');
    const batch = writeBatch(db);
    lines.forEach(name => {
      if (name.trim()) {
        const ref = doc(collection(db, COLLECTION_NAME));
        batch.set(ref, { 
          name: name.trim(), team: activeTab !== '전체 대시보드' ? activeTab : 'U18', position: 'MF', status: '정상 훈련',
          absenceCategory: 'injury', bodyPart: '기타', details: '', expectedReturn: '', 
          history: [{ date: new Date().toLocaleDateString(), from: '신규', to: '정상 훈련', note: '일괄등록' }],
          lastUpdatedAt: new Date().toISOString() 
        });
      }
    });
    await batch.commit();
    setIsBulkModalOpen(false);
    setBulkText('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-busan animate-pulse">BUSAN IPARK MEDICAL LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* 헤더 */}
      <header className="bg-[#C8102E] text-white p-6 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-black italic uppercase">부산아이파크</h1>
              <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Medical System</p>
            </div>
          </div>
          <p className="text-xl font-black">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {['전체 대시보드', ...TEAMS].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-t-2xl font-black text-xs transition-all ${activeTab === tab ? 'bg-slate-50 text-busan' : 'text-white/50'}`}>
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* 메인 화면 */}
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {activeTab === '전체 대시보드' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm">
              <h3 className="font-black mb-6 flex items-center gap-2"><TrendingUp className="text-busan" /> 연령별 참여 현황</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEAMS.map(team => {
                  const { total, normal } = stats.teamStats[team] || {total:0, normal:0};
                  return (
                    <div key={team} className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center">
                      <div><p className="text-xs font-bold text-slate-400">{team}</p><p className="text-2xl font-black">{normal}/{total}</p></div>
                      <div className="text-busan font-black">{total > 0 ? Math.round((normal/total)*100) : 0}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] shadow-sm">
              <h3 className="font-black mb-6 flex items-center gap-2"><Clock className="text-orange-500" /> 복귀 예정</h3>
              <div className="space-y-3">
                {stats.returningSoon.map(p => (
                  <div key={p.id} className="bg-slate-50 p-4 rounded-xl flex justify-between">
                    <div><p className="font-black text-sm">{p.name}</p><p className="text-[10px] text-slate-400">{p.team}</p></div>
                    <p className="text-xs font-black text-busan">{p.expectedReturn}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 검색 및 버튼 */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-[2rem] shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input type="text" placeholder="선수 검색..." className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsBulkModalOpen(true)} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-xs flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> 일괄 등록</button>
            <button onClick={() => {setEditingId(null); setIsModalOpen(true);}} className="px-6 py-3 bg-busan text-white rounded-xl font-black text-xs flex items-center gap-2"><Plus className="w-4 h-4" /> 선수 추가</button>
          </div>
        </div>

        {/* 선수 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-