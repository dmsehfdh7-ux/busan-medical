/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, TrendingUp, Clock, Search, ClipboardCheck, 
  Plus, History, X, ChevronRight, CheckCircle2, 
  Activity, AlertCircle, HeartPulse, Thermometer, 
  Plane, GraduationCap, FileText
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query } from 'firebase/firestore';

// --- Firebase 초기화 및 전역 설정 ---
const configStr = typeof window !== 'undefined' && typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
const firebaseConfig = JSON.parse(configStr);

// RULE 1: appId 안정화 (슬래시를 언더바로 치환하여 Firestore 경로 세그먼트 오류 원천 차단)
const rawAppId = typeof window !== 'undefined' && typeof __app_id !== 'undefined' ? __app_id : 'busan-ipark-medical-v10';
const appId = String(rawAppId).split('/').join('_');

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

  // 1. 인증 프로세스 (RULE 3 준수: 인증 후 데이터 접근)
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const performAuth = async () => {
      try {
        const token = typeof window !== 'undefined' && typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
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

    // RULE 1: artifacts/{appId}/public/data/{collection} -> 총 5개 세그먼트 (홀수, 정상)
    try {
      const playersRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      const q = query(playersRef);
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          setPlayers(data);
          setLoading(false);
        },
        (err) => {
          console.error("Firestore Loading Error:", err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error("Collection Reference Construction Failed:", error);
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
      const docRef = editingId 
        ? doc(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME, editingId) 
        : doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME));
      
      let updatedHistory = [...(formData.history || [])];
      const timestamp = new Date().toLocaleDateString();
      
      if (editingId) {
        const oldPlayer = players.find(p => p.id === editingId);
        if (oldPlayer && String(oldPlayer.status) !== String(formData.status)) {
          updatedHistory.push({ 
            date: timestamp, 
            from: String(oldPlayer.status), 
            to: String(formData.status), 
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
      alert("선수 저장에 실패했습니다. 권한이나 네트워크 상태를 확인하세요.");
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
      console.error("Bulk Add Error:", e);
      alert("일괄 등록 중 오류가 발생했습니다.");
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
      alert("삭제 권한이 없거나 오류가 발생했습니다.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-[#C8102E] font-black text-lg tracking-widest animate-pulse uppercase italic">Busan Ipark Medical System</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans tracking-tight pb-20">
      <header className="bg-[#C8102E] text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-white/10 rounded-xl">
               <Shield size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">부산아이파크</h1>
               <p className="text-[10px] font-bold opacity-60 tracking-widest mt-1 uppercase text-white">Youth Medical Management</p>
             </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tabular-nums text-white tracking-tight">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
                  <div key={p.id} className="min-w-[280px] p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-black text-slate-800 leading-none">{String(p.name || '')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{String(p.team || '')} · {String(p.position || '')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-orange-600 uppercase mb-1 italic leading-none font-bold">Return</p>
                      <p className="text-sm font-black text-slate-700 leading-none tracking-tighter">{String(p.expectedReturn || '')}</p>
                    </div>
                  </div>
                )) : <p className="text-xs font-bold text-slate-300 italic py-10 w-full text-center">현재 복귀 예정 인원이 없습니다.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
          <div className="relative w-full md:w-96 group">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="선수 성명으로 검색..." 
              className="pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] w-full text-sm font-bold outline-none border-none focus:ring-4 focus:ring-[#C8102E]/5 transition-all shadow-inner" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none bg-slate-800 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-900 shadow-lg active:scale-95 transition-all uppercase tracking-widest"><ClipboardCheck size={18} /> 일괄 등록</button>
            <button onClick={() => { setEditingId(null); setFormData({ team: activeTab !== '전체 대시보드' ? activeTab : 'U18', name: '', position: 'MF', status: '정상 훈련', absenceCategory: 'injury', bodyPart: '', details: '', expectedReturn: '', history: [] }); setIsModalOpen(true); }} className="flex-1 md:flex-none bg-[#C8102E] text-white px-12 py-5 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-red-800 transition-all active:scale-95 uppercase tracking-widest"><Plus size={20} /> 선수 추가</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredPlayers.map(player => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === player.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusCfg.icon;
            const latestLog = player.history && player.history.length > 0 ? player.history[player.history.length - 1] : null;
            return (
              <div key={player.id} className="bg-white rounded-[3.5rem] p-8 shadow-sm border border-slate-100 relative group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#C8102E] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-10">
                  <div className="flex gap-2 items-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-bold">
                    <span className="bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500 font-black">{String(player.position || '')}</span>
                    <span className="font-black opacity-80">{String(player.team || '')}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => openEditModal(player)} 
                      className="px-5 py-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white text-[11px] font-black transition-all shadow-sm border border-blue-100 uppercase"
                    >
                      수정
                    </button>
                  </div>
                </div>
                <h4 className="text-3xl font-black text-slate-800 mb-12 tracking-tighter leading-none group-hover:text-[#C8102E] transition-colors">{String(player.name || '')}</h4>
                <div className="space-y-6 pt-10 border-t border-slate-50">
                  <div className={`flex items-center gap-3 px-6 py-3 rounded-full text-[11px] font-black w-fit border shadow-sm ${statusCfg.color} uppercase tracking-tight`}>
                    <StatusIcon size={18} /> {String(player.status || '')}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] relative overflow-hidden group/log border border-slate-100">
                    <button onClick={() => { setSelectedPlayerForHistory(player); setIsHistoryModalOpen(true); }} className="absolute right-5 top-5 p-2.5 bg-white rounded-xl border border-slate-100 text-[#C8102E] shadow-sm hover:bg-[#C8102E] hover:text-white transition-all"><History size={16} /></button>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em] mb-4 italic leading-none font-black">Latest Medical Record</p>
                    {latestLog ? (
                      <div className="text-[11px] font-bold text-slate-600 flex flex-col gap-2">
                        <span className="text-[#C8102E] font-black leading-none">{String(latestLog.date || '')}</span>
                        <span className="truncate opacity-90 leading-relaxed italic">"{String(latestLog.note || '')}"</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic font-bold">등록된 기록이 없습니다.</p>
                    )}
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
          <div className="bg-white rounded-[4rem] w-full max-w-lg p-14 relative z-10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-12 shrink-0">
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic text-slate-800">{String(selectedPlayerForHistory.name || '')} Medical Logs</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-4 bg-slate-50 rounded-full hover:bg-slate-200 transition-colors shadow-inner text-slate-400 hover:text-slate-600"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-10 pr-4 relative">
               <div className="absolute left-[9px] top-2 bottom-0 w-1 bg-slate-50"></div>
               {(selectedPlayerForHistory.history || []).length > 0 ? [...selectedPlayerForHistory.history].reverse().map((record, i) => (
                 <div key={i} className="flex gap-8 relative z-10">
                   <div className="w-5 h-5 rounded-full bg-white border-4 border-[#C8102E] mt-1 shrink-0 shadow-lg"></div>
                   <div className="pb-8 border-b border-slate-50 w-full last:border-none">
                     <p className="text-[11px] font-black text-slate-400 mb-3 leading-none tracking-tight">{String(record.date || '')}</p>
                     <div className="flex items-center gap-4 mb-4 text-xs font-black leading-none">
                       <span className="text-slate-300 line-through decoration-2 font-black">{String(record.from || '')}</span>
                       <ChevronRight size={16} className="text-slate-200" />
                       <span className="text-[#C8102E] font-black uppercase tracking-tight px-4 py-1.5 bg-rose-50 rounded-xl border border-rose-100">{String(record.to || '')}</span>
                     </div>
                     {record.note && <p className="text-[13px] font-bold text-slate-600 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 italic leading-relaxed shadow-inner">"{String(record.note || '')}"</p>}
                   </div>
                 </div>
               )) : <div className="text-center py-24 text-slate-200 font-black italic tracking-[0.2em] uppercase">No Records Available</div>}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 (크기 대폭 확대: max-w-3xl) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)}></div>
          <div className="bg-white rounded-[4rem] w-full max-w-3xl p-14 relative z-10 shadow-2xl space-y-10">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-slate-800">명단 일괄 등록</h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={48} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-base font-black text-[#C8102E] italic leading-none border-l-4 border-[#C8102E] pl-4">이름만 한 줄에 한 명씩 입력해 주세요.</p>
              <p className="text-sm font-bold text-slate-400 pl-4 uppercase tracking-widest">Target Team: {activeTab === '전체 대시보드' ? 'U18' : activeTab}</p>
            </div>
            <textarea 
              className="w-full h-[550px] p-12 bg-slate-50 rounded-[3.5rem] outline-none font-black text-2xl resize-none focus:ring-8 focus:ring-[#C8102E]/5 border-none transition-all shadow-inner placeholder:text-slate-200" 
              placeholder="예:&#10;홍길동&#10;김축구&#10;이파크" 
              value={bulkText} 
              onChange={e => setBulkText(e.target.value)}
            ></textarea>
            <div className="flex gap-8">
              <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-8 bg-slate-100 rounded-[2.5rem] font-black text-slate-400 shadow-inner hover:bg-slate-200 transition-colors text-xl uppercase tracking-widest">Cancel</button>
              <button onClick={handleBulkAdd} className="flex-[2] py-8 bg-[#C8102E] text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-red-800 transition-all active:scale-95 uppercase tracking-[0.2em] italic">Process Bulk Import</button>
            </div>
          </div>
        </div>
      )}

      {/* 선수 추가/수정 모달 (크기 확대: max-w-2xl) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingId(null); }}></div>
          <div className="bg-white rounded-[5rem] w-full max-w-2xl p-16 relative z-10 shadow-2xl space-y-12 max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center shrink-0">
              <h2 className="text-5xl font-black tracking-tighter leading-none text-slate-800 uppercase italic leading-none">{editingId ? 'Edit Player' : 'New Entry'}</h2>
              <div className="flex gap-4">
                {editingId && (
                  <button onClick={() => deletePlayer(editingId)} className="px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 uppercase tracking-widest">Delete</button>
                )}
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shadow-inner text-slate-400 hover:text-slate-600"><X size={40} /></button>
              </div>
            </div>
            <div className="space-y-14">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-5">
                  <label className="text-xs font-black text-slate-300 ml-4 uppercase tracking-[0.3em] leading-none">Age Team</label>
                  <select className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] font-black text-xl shadow-inner outline-none focus:ring-4 focus:ring-[#C8102E]/10" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div className="space-y-5">
                  <label className="text-xs font-black text-slate-300 ml-4 uppercase tracking-[0.3em] leading-none">Position</label>
                  <select className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] font-black text-xl shadow-inner outline-none focus:ring-4 focus:ring-[#C8102E]/10" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select>
                </div>
              </div>
              <div className="space-y-5">
                <label className="text-xs font-black text-slate-300 ml-4 uppercase tracking-[0.3em] leading-none">Player Name</label>
                <input type="text" placeholder="성명 입력" className="w-full p-10 bg-slate-50 border-none rounded-[3rem] text-5xl font-black shadow-inner outline-none focus:ring-4 focus:ring-[#C8102E]/10 transition-all placeholder:text-slate-100 tracking-tighter" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-8">
                <label className="text-xs font-black text-slate-300 ml-4 uppercase tracking-[0.3em] leading-none font-black">Training Status</label>
                <div className="grid grid-cols-2 gap-6">
                  {STATUS_OPTIONS.map(opt => {
                    const OptIcon = opt.icon;
                    return (
                      <button 
                        key={opt.value} 
                        onClick={() => setFormData({...formData, status: opt.value})} 
                        className={`p-10 rounded-[3rem] text-base font-black border transition-all duration-300 ${formData.status === opt.value ? 'bg-slate-900 text-white border-transparent shadow-2xl scale-[1.05]' : 'bg-white text-gray-300 border-slate-100 hover:bg-slate-50 shadow-sm'}`}
                      >
                        <div className="flex flex-col items-center gap-5">
                          <OptIcon size={32} />
                          {opt.value}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {formData.status !== '정상 훈련' && (
                <div className="p-12 bg-rose-50 rounded-[4.5rem] space-y-12 border border-rose-100 shadow-sm animate-in slide-in-from-top-10 duration-500">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-rose-800 ml-4 uppercase tracking-tighter leading-none font-black">결장 사유</label>
                      <select className="w-full p-6 bg-white border-none rounded-2xl font-black text-base shadow-sm focus:ring-4 focus:ring-rose-200 outline-none transition-all" value={formData.absenceCategory} onChange={e => setFormData({...formData, absenceCategory: e.target.value})}>{ABSENCE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-rose-800 ml-4 uppercase tracking-tighter leading-none font-black">부상 부위 (직접 입력)</label>
                      <input 
                        type="text" 
                        placeholder="예: 오른쪽 무릎" 
                        className="w-full p-6 bg-white border-none rounded-2xl font-black text-base shadow-sm focus:ring-4 focus:ring-rose-200 outline-none transition-all" 
                        value={formData.bodyPart} 
                        onChange={e => setFormData({...formData, bodyPart: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[12px] font-black text-rose-800 ml-4 uppercase tracking-tighter leading-none font-black">상세 메모 (부상 정도 등)</label>
                    <textarea placeholder="메디컬 테스트 결과나 치료 현황을 상세히 기록하세요." className="w-full p-10 border-none rounded-[2.5rem] text-base font-bold resize-none bg-white shadow-sm focus:ring-4 focus:ring-rose-200 outline-none transition-all" rows="4" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-rose-800 ml-4 uppercase tracking-tighter leading-none font-black">복귀 예정일</label>
                    <input type="date" className="w-full p-6 border-none rounded-2xl text-base font-black bg-white shadow-sm focus:ring-4 focus:ring-rose-200 outline-none transition-all" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={savePlayer} className="w-full py-12 bg-[#C8102E] text-white rounded-[3.5rem] font-black text-3xl shadow-2xl hover:bg-red-800 transition-all active:scale-95 uppercase tracking-tight italic">Commit Medical Data</button>
          </div>
        </div>
      )}
    </div>
  );
}