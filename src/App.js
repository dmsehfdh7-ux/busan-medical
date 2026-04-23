/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Activity, Search, Plus, AlertCircle, 
  CheckCircle2, Clock, HeartPulse, GraduationCap, Plane, Thermometer, 
  FileText, PieChart, Edit2, Trash2, X
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- Firebase 초기화 및 보안 설정 ---
let app, auth, db;
let isFirebaseReady = false;

// appId 내 슬래시(/)를 언더바(_)로 치환하여 Firestore 세그먼트 오류 방지
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'busan-ipark-medical-official';
const appId = rawAppId.replace(/\//g, '_');

try {
  const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  if (configStr && configStr !== '{}' && configStr !== null) {
    const firebaseConfig = JSON.parse(configStr);
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      isFirebaseReady = true;
    }
  }
} catch (error) { 
  console.error("Firebase 초기화 중 오류 발생:", error); 
}

const COLLECTION_NAME = 'youth_players_v1';
const MOCK_DATA = [{ id: '1', name: '연결 확인용', team: 'U18', position: 'FW', status: '정상 훈련', details: '데이터베이스 연결 대기 중...', expectedReturn: '', history: [] }];
const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];

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

export default function App() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(isFirebaseReady);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('전체 대시보드');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    team: 'U18', name: '', position: 'MF', status: '정상 훈련', 
    absenceCategory: 'injury', details: '', expectedReturn: '' 
  });

  // 1. 인증 처리
  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setLoading(false);
      setPlayers(MOCK_DATA);
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

  // 2. 실시간 데이터 동기화
  useEffect(() => {
    if (!isFirebaseReady || !user || !db) return;
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
    return list.filter(player => 
      (player.name || '').includes(searchTerm) && 
      (filterPosition === '전체' || player.position === filterPosition)
    );
  }, [players, activeTab, searchTerm, filterPosition]);

  const globalStats = useMemo(() => {
    const absent = players.filter(p => p.status !== '정상 훈련');
    const stats = { total: absent.length, categories: {} };
    ABSENCE_REASONS.forEach(r => stats.categories[r.value] = 0);
    absent.forEach(p => { if (stats.categories[p.absenceCategory] !== undefined) stats.categories[p.absenceCategory]++; });
    return stats;
  }, [players]);

  const openModal = (player = null) => {
    if (player) {
      setEditingId(player.id);
      setFormData({ ...player });
    } else {
      setEditingId(null);
      setFormData({ 
        team: activeTab !== '전체 대시보드' ? activeTab : 'U18', 
        name: '', position: 'MF', status: '정상 훈련', 
        absenceCategory: 'injury', details: '', expectedReturn: '' 
      });
    }
    setIsModalOpen(true);
  };

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!isFirebaseReady) {
      alert("데이터베이스 연결 대기 중입니다.");
      return;
    }
    try {
      const docRef = editingId 
        ? doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, editingId)
        : doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME));
      
      await setDoc(docRef, { ...formData, lastUpdatedAt: new Date().toISOString() });
      setIsModalOpen(false);
    } catch (error) { alert("저장 실패: " + error.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, id));
    } catch (error) { alert("삭제 실패"); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Activity className="w-12 h-12 text-[#C8102E] animate-pulse mb-4" />
      <p className="font-black text-[#C8102E]">부산아이파크 메디컬 시스템 로딩 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="bg-[#C8102E] text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-black leading-none">부산아이파크 메디컬</h1>
              <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Youth Medical System</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{currentTime.toLocaleDateString()}</p>
            <p className="text-sm font-black">{currentTime.toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex gap-2 mt-6 overflow-x-auto no-scrollbar">
          {['전체 대시보드', ...TEAMS].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-t-xl font-black text-xs transition-all whitespace-nowrap ${activeTab === tab ? 'bg-gray-50 text-[#C8102E] shadow-sm' : 'text-white/60 hover:text-white'}`}>{tab}</button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {activeTab === '전체 대시보드' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 col-span-1 md:col-span-2">
              <h3 className="text-lg font-black mb-6 flex items-center"><PieChart className="mr-2 text-[#C8102E] w-5 h-5" /> 유스 전체 참여 현황</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-600 uppercase mb-1">정상 훈련</p>
                  <p className="text-3xl font-black text-emerald-700">{players.filter(p => p.status === '정상 훈련').length}<span className="text-sm ml-1">명</span></p>
                </div>
                <div className="bg-red-50 p-6 rounded-[1.5rem] border border-red-100">
                  <p className="text-[11px] font-black text-red-600 uppercase mb-1">결장/재활</p>
                  <p className="text-3xl font-black text-red-700">{globalStats.total}<span className="text-sm ml-1">명</span></p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">결장 사유 요약</h3>
              <div className="space-y-3">
                {ABSENCE_REASONS.map(r => {
                  const Icon = r.icon;
                  return (
                    <div key={r.value} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">{r.label}</span>
                      </div>
                      <span className="text-red-600 font-black text-base">{globalStats.categories[r.value] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-300" />
              <input type="text" placeholder="선수 이름을 검색하세요..." className="pl-12 pr-4 py-3 bg-gray-50 rounded-2xl w-full text-sm outline-none font-bold focus:ring-2 focus:ring-[#C8102E] transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="px-4 py-3 bg-gray-50 rounded-2xl text-xs font-black border-none outline-none focus:ring-2 focus:ring-[#C8102E]" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
              <option value="전체">전체 포지션</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={() => openModal()} className="w-full sm:w-auto bg-[#C8102E] text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100 hover:bg-red-800 transition-all active:scale-95"><Plus className="w-5 h-5" /> 선수 추가</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map(player => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === player.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusCfg.icon;
            return (
              <div key={player.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openModal(player)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(player.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-lg font-black text-gray-400 uppercase tracking-tight">{player.position}</span>
                    <h4 className="text-2xl font-black text-gray-900 mt-1">{player.name}</h4>
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase bg-gray-50 px-2 py-1 rounded-md">{player.team}</span>
                </div>
                <div className="space-y-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black border w-fit ${statusCfg.color}`}>
                    <StatusIcon className="w-4 h-4" /> {player.status}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-[1.2rem] min-h-[80px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">관리 메모</p>
                    <p className="text-xs font-bold text-gray-600 leading-relaxed">{player.details || '특이사항 없음'}</p>
                    {player.status !== '정상 훈련' && player.expectedReturn && (
                      <div className="mt-3 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-black text-red-600">{player.expectedReturn} 복귀 예정</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 relative z-10 space-y-6 shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-black text-gray-900">{editingId ? '선수 정보 수정' : '신규 선수 등록'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">소속 팀</label>
                <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#C8102E]" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>
                  {TEAMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">포지션</label>
                <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-[#C8102E]" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">성명</label>
              <input type="text" placeholder="이름 입력" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-xl font-black focus:ring-2 focus:ring-[#C8102E]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">현재 상태</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setFormData({...formData, status: opt.value})} className={`p-4 rounded-2xl text-xs font-black border transition-all ${formData.status === opt.value ? 'bg-gray-900 text-white border-transparent shadow-lg scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>{opt.value}</button>
                ))}
              </div>
            </div>

            {formData.status !== '정상 훈련' && (
              <div className="p-6 bg-red-50 rounded-[2rem] space-y-4 animate-in slide-in-from-top-2 duration-300 border border-red-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-800 uppercase ml-1">상세 사유</label>
                  <textarea placeholder="부상 부위, 치료 단계 등 상세 내용 입력" className="w-full p-4 border-none rounded-2xl resize-none text-sm font-bold focus:ring-2 focus:ring-red-600" rows="3" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-800 uppercase ml-1">복귀 예정일</label>
                  <input type="date" className="w-full p-4 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-600" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-200 transition-all">취소</button>
              <button onClick={savePlayer} className="flex-[2] py-5 bg-[#C8102E] text-white rounded-[1.5rem] font-black shadow-xl shadow-red-200 hover:bg-red-800 transition-all active:scale-95">정보 저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}