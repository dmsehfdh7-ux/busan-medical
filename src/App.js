import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, TrendingUp, Clock, Search, ClipboardCheck, 
  Plus, History, X, ChevronRight, CheckCircle2, 
  Activity, AlertCircle, HeartPulse, Thermometer, 
  Plane, GraduationCap, FileText
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// --- Firebase 초기화 및 전역 설정 ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
// RULE 1: appId에서 슬래시(/)를 제거하여 Firestore 세그먼트 개수 오류 방지
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'busan-ipark-medical-v10';
const appId = rawAppId.replace(/\//g, '_');

let app, auth, db;
if (Object.keys(firebaseConfig).length > 0) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

const COLLECTION_NAME = 'youth_players_final_v10';
const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];

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
    absenceCategory: 'injury', bodyPart: '', details: '', expectedReturn: '',
    history: []
  });

  // 1. 인증 프로세스 (RULE 3 준수)
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const performAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth process failed:", err);
      }
    };

    performAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 데이터 실시간 로드 (인증된 사용자만 접근)
  useEffect(() => {
    if (!user || !db) return;

    // RULE 1 준수: artifacts/{appId}/public/data/{collectionName} (세그먼트 5개)
    try {
      const playersRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      
      const unsubscribe = onSnapshot(playersRef, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          setPlayers(data);
          setLoading(false);
        },
        (err) => {
          console.error("Firestore loading error:", err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error("Invalid Firestore Reference:", error);
      setLoading(false);
    }
  }, [user]);

  // 3. 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredPlayers = useMemo(() => {
    const list = activeTab === '전체 대시보드' ? players : players.filter(p => p.team === activeTab);
    return list.filter(p => String(p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [players, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const teamStats = {};
    TEAMS.forEach(team => {
      const teamPlayers = players.filter(p => p.team === team);
      const normal = teamPlayers.filter(p => p.status === '정상 훈련').length;
      teamStats[team] = { total: teamPlayers.length, normal };
    });
    const returningSoon = players
      .filter(p => p.status !== '정상 훈련' && p.expectedReturn)
      .sort((a, b) => new Date(a.expectedReturn) - new Date(b.expectedReturn))
      .slice(0, 8);
    return { teamStats, returningSoon };
  }, [players]);

  const openEditModal = (player) => {
    setEditingId(player.id);
    setFormData({
      team: player.team || 'U18',
      name: player.name || '',
      position: player.position || 'MF',
      status: player.status || '정상 훈련',
      absenceCategory: player.absenceCategory || 'injury',
      bodyPart: player.bodyPart || '',
      details: player.details || '',
      expectedReturn: player.expectedReturn || '',
      history: player.history || []
    });
    setIsModalOpen(true);
  };

  const savePlayer = async (e) => {
    e.preventDefault();
    if (!formData.name || !db || !user) return;
    try {
      const colPath = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      const docRef = editingId ? doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, editingId) : doc(colPath);
      
      let updatedHistory = [...(formData.history || [])];
      const timestamp = new Date().toLocaleDateString();
      
      if (editingId) {
        const oldPlayer = players.find(p => p.id === editingId);
        if (oldPlayer && oldPlayer.status !== formData.status) {
          updatedHistory.push({ 
            date: timestamp, 
            from: oldPlayer.status, 
            to: formData.status, 
            note: String(formData.details || (formData.status === '정상 훈련' ? '복귀 완료' : '상태 변경'))
          });
        }
      } else {
        updatedHistory.push({ date: timestamp, from: '신규 등록', to: formData.status, note: '최초 등록' });
      }

      await setDoc(docRef, { 
        ...formData, 
        history: updatedHistory.slice(-15), 
        lastUpdatedAt: new Date().toISOString() 
      });
      setIsModalOpen(false);
      setEditingId(null);
    } catch (e) {
      alert("데이터 저장 권한이 부족하거나 오류가 발생했습니다.");
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !db || !user) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const colPath = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      const lines = bulkText.split('\n');
      const targetTeam = activeTab !== '전체 대시보드' ? activeTab : 'U18';
      const timestamp = new Date().toLocaleDateString();

      lines.forEach(line => {
        const name = line.trim();
        if (name) {
          const newDocRef = doc(colPath);
          batch.set(newDocRef, { 
            name, team: targetTeam, position: 'MF', status: '정상 훈련', 
            absenceCategory: 'injury', bodyPart: '', details: '', expectedReturn: '', 
            history: [{ date: timestamp, from: '신규 등록', to: '정상 훈련', note: '일괄 등록' }],
            lastUpdatedAt: new Date().toISOString() 
          });
        }
      });
      await batch.commit();
      setIsBulkModalOpen(false);
      setBulkText('');
    } catch (e) {
      alert("데이터 일괄 등록 권한이 부족합니다.");
    }
    setLoading(false);
  };

  const deletePlayer = async (id) => {
    if (!window.confirm("선수 정보를 영구 삭제하시겠습니까?")) return;
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, id));
      setIsModalOpen(false);
      setEditingId(null);
    } catch (e) {
      alert("삭제 권한이 없습니다.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[#C8102E] font-black text-xs tracking-widest animate-pulse uppercase italic">Busan Ipark Medical System</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans tracking-tight">
      <header className="bg-[#C8102E] text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-white/10 rounded-xl">
               <Shield size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">부산아이파크</h1>
               <p className="text-[10px] font-bold opacity-60 tracking-widest mt-1 uppercase">Youth Medical Management</p>
             </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tabular-nums">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {['전체 대시보드', ...TEAMS].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-8 py-4 rounded-t-3xl font-black text-xs transition-all whitespace-nowrap tracking-tight ${activeTab === tab ? 'bg-slate-50 text-[#C8102E] shadow-sm' : 'text-white/40 hover:text-white/80'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        {activeTab === '전체 대시보드' && (
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-slate-800">
                <TrendingUp size={20} className="text-[#C8102E]" /> 연령별 훈련 참여 현황
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {TEAMS.map(team => {
                  const { total, normal } = stats.teamStats[team] || {total: 0, normal: 0};
                  const percent = total > 0 ? Math.round((normal / total) * 100) : 0;
                  return (
                    <div key={team} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-center space-y-4 hover:bg-white hover:shadow-lg transition-all group">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{team}</p>
                      <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{normal}<span className="text-sm text-slate-300 ml-1 font-bold">/ {total}</span></p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#C8102E] h-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-base font-black mb-6 flex items-center gap-2 text-slate-800">
                <Clock size={20} className="text-orange-500" /> 복귀 예정 선수 명단
              </h3>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {stats.returningSoon.length > 0 ? stats.returningSoon.map(p => (
                  <div key={p.id} className="min-w-[260px] p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-black text-slate-800 leading-none">{String(p.name || '')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{String(p.team || '')} · {String(p.position || '')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-orange-600 uppercase mb-1 italic leading-none">Return</p>
                      <p className="text-sm font-black text-slate-700 leading-none">{String(p.expectedReturn || '')}</p>
                    </div>
                  </div>
                )) : <p className="text-xs font-bold text-slate-300 italic py-10 w-full text-center">복귀 예정 인원이 없습니다.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
          <div className="relative w-full md:w-96 group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="선수 성명으로 검색..." 
              className="pl-14 pr-6 py-4.5 bg-slate-50 rounded-[1.5rem] w-full text-sm font-bold outline-none border-none focus:ring-4 focus:ring-[#C8102E]/5 transition-all shadow-inner" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none bg-slate-800 text-white px-8 py-4.5 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-900 shadow-lg active:scale-95 transition-all"><ClipboardCheck size={16} /> 일괄 등록</button>
            <button onClick={() => { setEditingId(null); setFormData({ team: activeTab !== '전체 대시보드' ? activeTab : 'U18', name: '', position: 'MF', status: '정상 훈련', absenceCategory: 'injury', bodyPart: '', details: '', expectedReturn: '', history: [] }); setIsModalOpen(true); }} className="flex-1 md:flex-none bg-[#C8102E] text-white px-10 py-4.5 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-red-800 transition-all active:scale-95"><Plus size={18} /> 선수 추가</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredPlayers.map(player => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === player.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusCfg.icon;
            const latestLog = player.history && player.history.length > 0 ? player.history[player.history.length - 1] : null;
            return (
              <div key={player.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 relative group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#C8102E] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-2 items-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">{String(player.position || '')}</span>
                    <span>{String(player.team || '')}</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => openEditModal(player)} 
                      className="px-4 py-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-500 hover:text-white text-[11px] font-black transition-all shadow-sm"
                    >
                      수정
                    </button>
                  </div>
                </div>
                <h4 className="text-3xl font-black text-slate-800 mb-10 tracking-tighter leading-none group-hover:text-[#C8102E] transition-colors">{String(player.name || '')}</h4>
                <div className="space-y-5 pt-8 border-t border-slate-50">
                  <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[11px] font-black w-fit border shadow-sm ${statusCfg.color}`}>
                    <StatusIcon size={16} /> {String(player.status || '')}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] relative overflow-hidden group/log">
                    <button onClick={() => { setSelectedPlayerForHistory(player); setIsHistoryModalOpen(true); }} className="absolute right-4 top-4 p-2 bg-white rounded-xl border border-slate-100 text-[#C8102E] shadow-sm hover:bg-[#C8102E] hover:text-white transition-all"><History size={14} /></button>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3 italic font-bold">Latest Medical Record</p>
                    {latestLog ? <div className="text-[10px] font-bold text-slate-600 flex flex-col gap-1"><span className="text-[#C8102E] font-black">{String(latestLog.date || '')}</span><span className="truncate opacity-80">{String(latestLog.note || '')}</span></div> : <p className="text-[10px] text-slate-300 italic">기록 없음</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 히스토리 모달 */}
      {isHistoryModalOpen && selectedPlayerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)}></div>
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-12 relative z-10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{String(selectedPlayerForHistory.name || '')} History</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shadow-inner"><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2 relative">
               <div className="absolute left-[7px] top-2 bottom-0 w-0.5 bg-slate-100"></div>
               {(selectedPlayerForHistory.history || []).length > 0 ? [...selectedPlayerForHistory.history].reverse().map((record, i) => (
                 <div key={i} className="flex gap-6 relative z-10">
                   <div className="w-4 h-4 rounded-full bg-white border-4 border-[#C8102E] mt-1 shrink-0 shadow-md"></div>
                   <div className="pb-6">
                     <p className="text-[11px] font-black text-slate-400 mb-2 leading-none">{String(record.date || '')}</p>
                     <div className="flex items-center gap-3 mb-3 text-xs font-bold leading-none">
                       <span className="text-slate-300 line-through font-medium">{String(record.from || '')}</span>
                       <ChevronRight size={14} className="text-slate-200" />
                       <span className="text-[#C8102E] font-black uppercase tracking-tight px-3 py-1 bg-rose-50 rounded-lg">{String(record.to || '')}</span>
                     </div>
                     {record.note && <p className="text-xs font-bold text-slate-600 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 italic leading-relaxed">"{String(record.note || '')}"</p>}
                   </div>
                 </div>
               )) : <div className="text-center py-20 text-slate-200 font-bold italic tracking-widest uppercase">No Records Found</div>}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)}></div>
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-12 relative z-10 shadow-2xl space-y-8">
            <h2 className="text-2xl font-black uppercase italic leading-none">명단 일괄 등록</h2>
            <p className="text-xs font-bold text-[#C8102E] italic leading-none">이름만 한 줄에 한 명씩 입력해 주세요.</p>
            <textarea className="w-full h-80 p-8 bg-slate-50 rounded-[2.5rem] outline-none font-bold text-sm resize-none focus:ring-4 focus:ring-[#C8102E]/5 border-none transition-all shadow-inner" placeholder="김부산&#10;이파크" value={bulkText} onChange={e => setBulkText(e.target.value)}></textarea>
            <div className="flex gap-4">
              <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-6 bg-slate-100 rounded-[1.5rem] font-black text-slate-500 shadow-inner transition-colors">취소</button>
              <button onClick={handleBulkAdd} className="flex-[2] py-6 bg-[#C8102E] text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-red-800 transition-all active:scale-95 uppercase tracking-widest">일괄 등록 시작</button>
            </div>
          </div>
        </div>
      )}

      {/* 선수 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingId(null); }}></div>
          <div className="bg-white rounded-[4rem] w-full max-w-lg p-12 relative z-10 shadow-2xl space-y-10 max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center shrink-0">
              <h2 className="text-3xl font-black tracking-tight leading-none text-slate-800 uppercase italic leading-none">{editingId ? '선수 수정' : '신규 등록'}</h2>
              <div className="flex gap-2">
                {editingId && (
                  <button onClick={() => deletePlayer(editingId)} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm">데이터 삭제</button>
                )}
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Age Category</label>
                  <select className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] font-black shadow-inner outline-none focus:ring-2 focus:ring-[#C8102E]/20" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Position</label>
                  <select className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] font-black shadow-inner outline-none focus:ring-2 focus:ring-[#C8102E]/20" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Full Name</label>
                <input type="text" placeholder="선수 성명 입력" className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] text-2xl font-black shadow-inner outline-none focus:ring-2 focus:ring-[#C8102E]/20 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-5">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Training Status</label>
                <div className="grid grid-cols-2 gap-4">
                  {STATUS_OPTIONS.map(opt => {
                    const OptIcon = opt.icon;
                    return (
                      <button 
                        key={opt.value} 
                        onClick={() => setFormData({...formData, status: opt.value})} 
                        className={`p-6 rounded-[2rem] text-xs font-black border transition-all ${formData.status === opt.value ? 'bg-slate-900 text-white border-transparent shadow-xl scale-[1.03]' : 'bg-white text-gray-400 border-slate-100 hover:bg-slate-50'}`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <OptIcon size={20} />
                          {opt.value}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {formData.status !== '정상 훈련' && (
                <div className="p-8 bg-rose-50 rounded-[3rem] space-y-8 border border-rose-100 shadow-sm animate-in slide-in-from-top-6 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter leading-none font-bold">결장 사유</label>
                      <select className="w-full p-4.5 bg-white border-none rounded-2xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-rose-200 outline-none transition-all" value={formData.absenceCategory} onChange={e => setFormData({...formData, absenceCategory: e.target.value})}>{ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter leading-none font-bold">부상 부위 (직접 입력)</label>
                      <input 
                        type="text" 
                        placeholder="예: 발목, 서혜부 등" 
                        className="w-full p-4.5 bg-white border-none rounded-2xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-rose-200 outline-none transition-all" 
                        value={formData.bodyPart} 
                        onChange={e => setFormData({...formData, bodyPart: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-800 ml-2 uppercase tracking-tighter leading-none font-bold">상세 메모</label>
                    <textarea placeholder="상세 내용을 기록하세요" className="w-full p-5 border-none rounded-2xl text-xs font-bold resize-none bg-white shadow-sm focus:ring-2 focus:ring-rose-200 outline-none transition-all" rows="2" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter leading-none font-bold">복귀 예정일</label>
                    <input type="date" className="w-full p-5 border-none rounded-2xl text-xs font-black bg-white shadow-sm focus:ring-2 focus:ring-rose-200 outline-none transition-all" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={savePlayer} className="w-full py-8 bg-[#C8102E] text-white rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-red-800 transition-all active:scale-95 uppercase leading-none tracking-tighter">Save Medical Records</button>
          </div>
        </div>
      )}
    </div>
  );
}