/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Search, Plus, Edit2, Trash2, X, AlertCircle, 
  CheckCircle2, Clock, HeartPulse, GraduationCap, Plane, Thermometer, 
  FileText, PieChart, Users, ClipboardCheck, Info, ChevronRight,
  History, Calendar, TrendingUp
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// --- Firebase 초기화 ---
let app, auth, db;
let isFirebaseReady = false;

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
  console.error("Firebase 초기화 에러"); 
}

const COLLECTION_NAME = 'youth_players_final_v6';
const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];
const BODY_PARTS = ['발목', '무릎', '허벅지', '서혜부', '종아리', '허리', '어깨', '기타'];

const STATUS_OPTIONS = [
  { value: '정상 훈련', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  { value: '부분 참여', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Activity },
  { value: '재활', color: 'bg-orange-50 text-orange-700 border-orange-100', icon: Clock },
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
  const [loading, setLoading] = useState(isFirebaseReady);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('전체 대시보드');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('전체');
  
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
    if (!isFirebaseReady || !auth) { setLoading(false); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
      } catch (error) { console.error("인증 실패"); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isFirebaseReady || !user || !db) return;
    const playersRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersData = [];
      snapshot.forEach((doc) => playersData.push({ id: doc.id, ...doc.data() }));
      playersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setPlayers(playersData);
      setLoading(false);
    }, (error) => { console.error("데이터 로드 실패"); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const list = activeTab === '전체 대시보드' ? players : players.filter(p => p.team === activeTab);
    return list.filter(player => (player.name || '').includes(searchTerm) && (filterPosition === '전체' || player.position === filterPosition));
  }, [players, activeTab, searchTerm, filterPosition]);

  const stats = useMemo(() => {
    const teamStats = {};
    TEAMS.forEach(team => {
      const teamPlayers = players.filter(p => p.team === team);
      const normal = teamPlayers.filter(p => p.status === '정상 훈련').length;
      teamStats[team] = { total: teamPlayers.length, normal };
    });

    const bodyPartStats = {};
    BODY_PARTS.forEach(part => bodyPartStats[part] = 0);
    players.filter(p => p.status !== '정상 훈련' && p.absenceCategory === 'injury').forEach(p => {
      if (bodyPartStats[p.bodyPart] !== undefined) bodyPartStats[p.bodyPart]++;
    });

    const returningSoon = players
      .filter(p => p.status !== '정상 훈련' && p.expectedReturn)
      .sort((a, b) => new Date(a.expectedReturn) - new Date(b.expectedReturn))
      .slice(0, 8);

    return { teamStats, bodyPartStats, returningSoon };
  }, [players]);

  const openModal = (player = null) => {
    if (player) {
      setEditingId(player.id);
      setFormData({ ...player, history: player.history || [] });
    } else {
      setEditingId(null);
      setFormData({ 
        team: activeTab !== '전체 대시보드' ? activeTab : 'U18', 
        name: '', position: 'MF', status: '정상 훈련', 
        absenceCategory: 'injury', bodyPart: '기타', details: '', expectedReturn: '',
        history: []
      });
    }
    setIsModalOpen(true);
  };

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!formData.name || !isFirebaseReady) return;
    try {
      const docRef = editingId ? doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, editingId) : doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME));
      
      let updatedHistory = [...(formData.history || [])];
      const timestamp = new Date().toLocaleDateString();
      
      if (editingId) {
        const oldPlayer = players.find(p => p.id === editingId);
        if (oldPlayer && oldPlayer.status !== formData.status) {
          updatedHistory.push({
            date: timestamp,
            from: oldPlayer.status,
            to: formData.status,
            note: formData.details || (formData.status === '정상 훈련' ? '복귀' : '상태변경')
          });
        }
      } else {
        updatedHistory.push({
          date: timestamp,
          from: '신규',
          to: formData.status,
          note: '최초등록'
        });
      }

      await setDoc(docRef, { 
        ...formData, 
        history: updatedHistory.slice(-10), 
        lastUpdatedAt: new Date().toISOString() 
      });
      setIsModalOpen(false);
    } catch (error) { alert("저장 실패"); }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !isFirebaseReady) return;
    setLoading(true);
    try {
      const lines = bulkText.split('\n');
      const batch = writeBatch(db);
      const targetTeam = activeTab !== '전체 대시보드' ? activeTab : 'U18';
      const timestamp = new Date().toLocaleDateString();

      lines.forEach(line => {
        const name = line.trim();
        if (name) {
          const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME));
          batch.set(newDocRef, { 
            name, team: targetTeam, position: 'MF', status: '정상 훈련', 
            absenceCategory: 'injury', bodyPart: '기타', details: '', expectedReturn: '', 
            history: [{ date: timestamp, from: '신규', to: '정상 훈련', note: '일괄등록' }],
            lastUpdatedAt: new Date().toISOString() 
          });
        }
      });
      await batch.commit();
      setIsBulkModalOpen(false);
      setBulkText('');
    } catch (error) { alert("일괄 등록 실패"); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, id)); } catch (error) { alert("삭제 실패"); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* 콤팩트 헤더 */}
      <header className="bg-[#C8102E] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">부산아이파크</h1>
          <p className="text-lg font-black tabular-nums opacity-90">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {['전체 대시보드', ...TEAMS].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-6 py-3 rounded-t-2xl font-black text-xs transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-50 text-[#C8102E]' : 'text-white/40 hover:text-white/80'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
        {/* 통계 섹션: 불필요한 공백 제거 및 효율적 배치 */}
        {activeTab === '전체 대시보드' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 연령별 참여 현황 */}
            <div className="lg:col-span-8 bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-base font-black mb-6 flex items-center gap-2 text-slate-800"><TrendingUp className="w-5 h-5 text-[#C8102E]" /> 연령별 훈련 참여 현황</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TEAMS.map(team => {
                  const { total, normal } = stats.teamStats[team];
                  const percent = total > 0 ? Math.round((normal / total) * 100) : 0;
                  return (
                    <div key={team} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-center space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">{team}</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">{normal}<span className="text-xs text-slate-300 ml-1">/ {total}</span></p>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#C8102E] h-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 부상 부위 퀵 뷰 */}
            <div className="lg:col-span-4 bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-4 italic">Injury Stats</h3>
              <div className="space-y-3">
                {Object.entries(stats.bodyPartStats).sort((a,b) => b[1] - a[1]).slice(0, 4).map(([part, count]) => (
                  <div key={part} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600">{part}</span>
                    <span className={`font-black ${count > 0 ? 'text-[#C8102E]' : 'text-slate-300'}`}>{count}명</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 복귀 예정 선수 명단 */}
            <div className="lg:col-span-12 bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-base font-black mb-5 flex items-center gap-2 text-slate-800"><Clock className="w-5 h-5 text-orange-500" /> 복귀 예정 선수</h3>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {stats.returningSoon.length > 0 ? stats.returningSoon.map(p => (
                  <div key={p.id} className="min-w-[200px] p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-800">{p.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{p.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-orange-600 uppercase">Return</p>
                      <p className="text-xs font-black text-slate-700">{p.expectedReturn}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs font-bold text-slate-300 italic py-2">복귀 예정 인원 없음</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 액션 패널 */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 gap-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#C8102E] transition-colors" />
            <input 
              type="text" 
              placeholder="이름 검색..." 
              className="pl-12 pr-6 py-3.5 bg-slate-50 rounded-2xl w-full text-sm font-bold outline-none border-none focus:ring-2 focus:ring-[#C8102E]/10" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsBulkModalOpen(true)} 
              className="flex-1 md:flex-none bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <ClipboardCheck className="w-4 h-4" /> 일괄 등록
            </button>
            <button 
              onClick={() => openModal()} 
              className="flex-1 md:flex-none bg-[#C8102E] text-white px-8 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-100 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" /> 선수 추가
            </button>
          </div>
        </div>

        {/* 선수 명단: 그리드 간격 최적화 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map(player => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === player.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusCfg.icon;
            const latestHistory = player.history && player.history.length > 0 ? player.history[player.history.length - 1] : null;
            
            return (
              <div key={player.id} className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-400">{player.position}</span>
                    <span className="text-[9px] font-black text-slate-300 tracking-widest">{player.team}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(player)} className="p-1.5 text-blue-500 bg-blue-50 rounded-lg"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(player.id)} className="p-1.5 text-rose-500 bg-rose-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>

                <h4 className="text-2xl font-black text-slate-800 mb-6 tracking-tighter">{player.name}</h4>

                <div className="space-y-4 pt-5 border-t border-slate-50">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black w-fit ${statusCfg.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {player.status}
                  </div>
                  
                  {/* 히스토리 섹션: 간결하고 가독성 좋게 */}
                  <div className="bg-slate-50 p-4 rounded-2xl relative">
                    <button 
                      onClick={() => { setSelectedPlayerForHistory(player); setIsHistoryModalOpen(true); }}
                      className="absolute right-3 top-3 p-1.5 bg-white rounded-lg border border-slate-100 text-[#C8102E] hover:bg-[#C8102E] hover:text-white transition-all shadow-sm"
                    >
                      <History className="w-3 h-3" />
                    </button>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Latest Log</p>
                    {latestHistory ? (
                      <div className="text-[10px] font-bold text-slate-500 leading-tight">
                        <span className="text-[#C8102E] mr-1.5">{latestHistory.date}</span>
                        {latestHistory.note}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic font-medium">기록 없음</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 부상 히스토리 전용 모달: 불필요한 디자인 배제 */}
      {isHistoryModalOpen && selectedPlayerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 relative z-10 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tighter">{selectedPlayerForHistory.name} <span className="text-sm font-bold text-slate-300 ml-2">History</span></h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              {(selectedPlayerForHistory.history || []).length > 0 ? (
                [...selectedPlayerForHistory.history].reverse().map((record, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#C8102E] mt-1.5"></div>
                      <div className="flex-1 w-px bg-slate-100 group-last:bg-transparent mt-2"></div>
                    </div>
                    <div className="pb-6">
                      <p className="text-[10px] font-black text-slate-400 mb-1">{record.date}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-400 line-through">{record.from}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[11px] font-black text-[#C8102E]">{record.to}</span>
                      </div>
                      {record.note && <p className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">{record.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-300 font-bold italic">기록이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 relative z-10 shadow-2xl space-y-6">
            <h2 className="text-2xl font-black">명단 일괄 등록</h2>
            <textarea 
              className="w-full h-80 p-6 bg-slate-50 rounded-[2.5rem] outline-none font-bold text-sm resize-none focus:ring-2 focus:ring-[#C8102E]/10" 
              placeholder="한 줄에 한 명씩 이름을 적으세요." 
              value={bulkText} 
              onChange={e => setBulkText(e.target.value)}
            ></textarea>
            <div className="flex gap-3">
              <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black text-slate-500">취소</button>
              <button onClick={handleBulkAdd} className="flex-[2] py-5 bg-[#C8102E] text-white rounded-2xl font-black shadow-xl shadow-red-100">등록 시작</button>
            </div>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-10 relative z-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto no-scrollbar">
            <h2 className="text-2xl font-black tracking-tight text-center">{editingId ? '선수 정보 수정' : '신규 선수 등록'}</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Team</label>
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Position</label>
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Name</label>
                <input type="text" placeholder="성명" className="w-full p-5 bg-slate-50 border-none rounded-2xl text-xl font-black" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFormData({...formData, status: opt.value})} className={`p-4 rounded-2xl text-xs font-black border transition-all ${formData.status === opt.value ? 'bg-slate-900 text-white' : 'bg-white text-gray-400 border-slate-100'}`}>{opt.value}</button>
                  ))}
                </div>
              </div>
              {formData.status !== '정상 훈련' && (
                <div className="p-6 bg-rose-50 rounded-[2.5rem] space-y-4 border border-rose-100">
                   <div className="grid grid-cols-2 gap-4">
                     <select className="w-full p-3 bg-white border-none rounded-xl font-bold text-xs" value={formData.absenceCategory} onChange={e => setFormData({...formData, absenceCategory: e.target.value})}>{ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                     <select className="w-full p-3 bg-white border-none rounded-xl font-bold text-xs" value={formData.bodyPart} onChange={e => setFormData({...formData, bodyPart: e.target.value})}>{BODY_PARTS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                   </div>
                   <textarea placeholder="상세 내용" className="w-full p-4 border-none rounded-xl text-xs font-bold resize-none bg-white" rows="2" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                   <input type="date" className="w-full p-4 border-none rounded-xl text-xs font-bold bg-white" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                </div>
              )}
            </div>
            <button onClick={savePlayer} className="w-full py-6 bg-[#C8102E] text-white rounded-[2rem] font-black text-lg active:scale-95 transition-all">저장 완료</button>
          </div>
        </div>
      )}
    </div>
  );
}