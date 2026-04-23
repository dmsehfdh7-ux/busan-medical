<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부산아이파크 통합 관리 시스템</title>
    <!-- 외부 라이브러리 로드: 안정성을 위해 표준 버전 사용 -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Vanilla JS (에러 방지를 위해 가장 안정적임) -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- Firebase SDK (Compat 모드) -->
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; background-color: #f8fafc; margin: 0; letter-spacing: -0.025em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .timeline-container { position: relative; }
        .timeline-line::before {
            content: '';
            position: absolute;
            left: 7px;
            top: 10px;
            bottom: 0;
            width: 2px;
            background-color: #f1f5f9;
        }
        /* 아이콘 색상 강제 지정 */
        svg { stroke: currentColor; fill: none; }
        input:focus, select:focus, textarea:focus { outline: none; ring: 2px; ring-color: #C8102E; }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useMemo, useRef } = React;

        // --- Firebase 초기화 ---
        const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
        const firebaseConfig = JSON.parse(configStr);
        const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'busan-ipark-medical-v8';
        const appId = rawAppId.replace(/\//g, '_');

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const auth = firebase.auth();
        const db = firebase.firestore();

        const COLLECTION_NAME = 'youth_players_final_v9';
        const TEAMS = ['U18', 'U15', 'U12', 'WFC U15'];
        const POSITIONS = ['FW', 'MF', 'DF', 'GK'];

        const STATUS_OPTIONS = [
            { value: '정상 훈련', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: 'check-circle-2' },
            { value: '부분 참여', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'activity' },
            { value: '재활', color: 'bg-orange-50 text-orange-700 border-orange-100', icon: 'clock' },
            { value: '훈련 제외', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: 'alert-circle' }
        ];

        const ABSENCE_REASONS = [
            { value: 'injury', label: '부상', icon: 'heart-pulse' },
            { value: 'sick', label: '질병/컨디션', icon: 'thermometer' },
            { value: 'national', label: '대표팀 차출', icon: 'plane' },
            { value: 'school', label: '학사 일정', icon: 'graduation-cap' },
            { value: 'other', label: '기타 사유', icon: 'file-text' },
        ];

        // 리액트에서 Lucide 아이콘을 안전하게 사용하는 컴포넌트
        const LucideIcon = ({ name, className = "w-4 h-4", size = 16 }) => {
            const iconRef = useRef(null);
            useEffect(() => {
                if (iconRef.current) {
                    iconRef.current.innerHTML = '';
                    const icon = lucide.icons[name.toLowerCase()] || lucide.icons['help-circle'];
                    if (icon) {
                        const svg = icon.toSvg({
                            class: className,
                            width: size,
                            height: size,
                            'stroke-width': 2.5
                        });
                        iconRef.current.innerHTML = svg;
                    }
                }
            }, [name, className, size]);
            return <span ref={iconRef} className="inline-flex items-center justify-center"></span>;
        };

        function App() {
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

            useEffect(() => {
                const initAuth = async () => {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await auth.signInWithCustomToken(__initial_auth_token);
                        } else {
                            await auth.signInAnonymously();
                        }
                    } catch (e) { console.error("Auth Error", e); }
                };
                initAuth();
                return auth.onAuthStateChanged(setUser);
            }, []);

            useEffect(() => {
                if (!user) return;
                const playersRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTION_NAME);
                return playersRef.onSnapshot((snapshot) => {
                    const playersData = [];
                    snapshot.forEach((doc) => playersData.push({ id: doc.id, ...doc.data() }));
                    playersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    setPlayers(playersData);
                    setLoading(false);
                }, (err) => { console.error("Firestore Error", err); setLoading(false); });
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

            // 수정 모달 열기 함수 (수동 수정 지원)
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
                if (!formData.name) return;
                try {
                    const playersRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTION_NAME);
                    const docRef = editingId ? playersRef.doc(editingId) : playersRef.doc();
                    
                    let updatedHistory = [...(formData.history || [])];
                    const timestamp = new Date().toLocaleDateString();
                    
                    if (editingId) {
                        const oldPlayer = players.find(p => p.id === editingId);
                        if (oldPlayer && oldPlayer.status !== formData.status) {
                            updatedHistory.push({ 
                                date: timestamp, 
                                from: oldPlayer.status, 
                                to: formData.status, 
                                note: formData.details || (formData.status === '정상 훈련' ? '복귀 완료' : '상태 변경') 
                            });
                        }
                    } else {
                        updatedHistory.push({ date: timestamp, from: '신규 등록', to: formData.status, note: '최초 등록' });
                    }

                    await docRef.set({ 
                        ...formData, 
                        history: updatedHistory.slice(-15), 
                        lastUpdatedAt: new Date().toISOString() 
                    });
                    setIsModalOpen(false);
                    setEditingId(null);
                } catch (e) { alert("저장 중 오류가 발생했습니다."); }
            };

            const handleBulkAdd = async () => {
                if (!bulkText.trim()) return;
                setLoading(true);
                try {
                    const batch = db.batch();
                    const playersRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTION_NAME);
                    const lines = bulkText.split('\n');
                    const targetTeam = activeTab !== '전체 대시보드' ? activeTab : 'U18';
                    const timestamp = new Date().toLocaleDateString();

                    lines.forEach(line => {
                        const name = line.trim();
                        if (name) {
                            const newDocRef = playersRef.doc();
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
                } catch (e) { alert("일괄 등록 중 오류가 발생했습니다."); }
                setLoading(false);
            };

            const deletePlayer = async (id) => {
                if (!confirm("선수 정보를 삭제하시겠습니까?")) return;
                try {
                    await db.collection('artifacts').doc(appId).collection('public').doc('data').collection(COLLECTION_NAME).doc(id).delete();
                } catch (e) { alert("삭제 실패"); }
            };

            if (loading) return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                    <div className="w-10 h-10 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[#C8102E] font-black text-xs tracking-widest animate-pulse uppercase">Busan Ipark Medical Loading</p>
                </div>
            );

            return (
                <div className="min-h-screen">
                    <header className="bg-[#C8102E] text-white sticky top-0 z-40 shadow-xl">
                        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic">부산아이파크</h1>
                            <p className="text-lg font-black tabular-nums opacity-90">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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

                    <main className="max-w-7xl mx-auto p-6 space-y-6">
                        {/* 연령별 참여 현황: 와이드 배치 */}
                        {activeTab === '전체 대시보드' && (
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <h3 className="text-base font-black mb-8 flex items-center gap-2 text-slate-800">
                                        <LucideIcon name="trending-up" className="text-[#C8102E]" /> 연령별 훈련 참여 현황
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {TEAMS.map(team => {
                                            const { total, normal } = stats.teamStats[team] || {total: 0, normal: 0};
                                            const percent = total > 0 ? Math.round((normal / total) * 100) : 0;
                                            return (
                                                <div key={team} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center space-y-4">
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
                                
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <h3 className="text-base font-black mb-6 flex items-center gap-2 text-slate-800">
                                        <LucideIcon name="clock" className="text-orange-500" /> 복귀 예정 선수 명단
                                    </h3>
                                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                        {stats.returningSoon.length > 0 ? stats.returningSoon.map(p => (
                                            <div key={p.id} className="min-w-[240px] p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-slate-800 leading-none">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{p.team} · {p.position}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-orange-600 uppercase leading-none mb-1 tracking-tighter italic">Return</p>
                                                    <p className="text-xs font-black text-slate-700 leading-none">{p.expectedReturn}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs font-bold text-slate-300 italic py-2 px-2">현재 복귀 예정 인원이 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 검색 및 액션바 */}
                        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                            <div className="relative w-full md:w-96 group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><LucideIcon name="search" /></span>
                                <input 
                                    type="text" 
                                    placeholder="선수 이름으로 검색..." 
                                    className="pl-12 pr-6 py-4 bg-slate-50 rounded-3xl w-full text-sm font-bold outline-none border-none focus:ring-2 focus:ring-[#C8102E]/10 transition-all shadow-inner" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => setIsBulkModalOpen(true)} 
                                    className="flex-1 md:flex-none bg-slate-800 text-white px-8 py-4 rounded-3xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-lg"
                                >
                                    <LucideIcon name="clipboard-check" /> 일괄 등록
                                </button>
                                <button 
                                    onClick={() => { setEditingId(null); setFormData({ team: activeTab !== '전체 대시보드' ? activeTab : 'U18', name: '', position: 'MF', status: '정상 훈련', absenceCategory: 'injury', bodyPart: '', details: '', expectedReturn: '', history: [] }); setIsModalOpen(true); }} 
                                    className="flex-1 md:flex-none bg-[#C8102E] text-white px-10 py-4 rounded-3xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-100 hover:bg-red-800 transition-all active:scale-95"
                                >
                                    <LucideIcon name="plus" /> 선수 추가
                                </button>
                            </div>
                        </div>

                        {/* 선수 카드 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPlayers.map(player => {
                                const statusCfg = STATUS_OPTIONS.find(s => s.value === player.status) || STATUS_OPTIONS[0];
                                const latestLog = player.history && player.history.length > 0 ? player.history[player.history.length - 1] : null;
                                return (
                                    <div key={player.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative group transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex gap-2 items-center text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                <span className="bg-slate-100 px-2.5 py-1 rounded-lg">{player.position}</span>
                                                <span>{player.team}</span>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                {/* 수정 버튼만 표시, 삭제 버튼(빨간색) 제거 완료 */}
                                                <button 
                                                    onClick={() => openEditModal(player)} 
                                                    className="px-4 py-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-500 hover:text-white text-[11px] font-black transition-all"
                                                >
                                                    수정
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <h4 className="text-2xl font-black text-slate-800 mb-8 tracking-tighter leading-none group-hover:text-[#C8102E] transition-colors">{player.name}</h4>
                                        
                                        <div className="space-y-4 pt-6 border-t border-slate-50">
                                            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-black w-fit border shadow-sm ${statusCfg.color}`}>
                                                <LucideIcon name={statusCfg.icon} /> {player.status}
                                            </div>
                                            
                                            <div className="bg-slate-50 p-5 rounded-3xl relative overflow-hidden group/history">
                                                <button 
                                                    onClick={() => { setSelectedPlayerForHistory(player); setIsHistoryModalOpen(true); }} 
                                                    className="absolute right-3 top-3 p-1.5 bg-white rounded-xl border border-slate-100 text-[#C8102E] shadow-sm hover:bg-[#C8102E] hover:text-white transition-all"
                                                >
                                                    <LucideIcon name="history" size={14} />
                                                </button>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 leading-none italic">Last Log</p>
                                                {latestLog ? (
                                                    <div className="text-[10px] font-bold text-slate-600 flex items-center gap-2 leading-tight">
                                                        <span className="text-[#C8102E] font-black shrink-0">{latestLog.date}</span>
                                                        <span className="truncate">{latestLog.note}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-300 italic font-medium">활동 기록이 없습니다.</p>
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
                            <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 relative z-10 shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="flex justify-between items-center mb-8 shrink-0">
                                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{selectedPlayerForHistory.name} <span className="text-xs font-bold text-slate-300 ml-1 italic tracking-widest">Medical Logs</span></h2>
                                    <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shadow-inner"><LucideIcon name="x" size={20} className="text-slate-400" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-2 relative timeline-container">
                                    <div className="timeline-line"></div>
                                    {(selectedPlayerForHistory.history || []).length > 0 ? (
                                        [...selectedPlayerForHistory.history].reverse().map((record, i) => (
                                            <div key={i} className="flex gap-5 relative z-10">
                                                <div className="w-4 h-4 rounded-full bg-white border-4 border-[#C8102E] mt-1 shrink-0 shadow-sm"></div>
                                                <div className="pb-4">
                                                    <p className="text-[10px] font-black text-slate-400 mb-1 leading-none tracking-tight">{record.date}</p>
                                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold leading-none">
                                                        <span className="text-slate-400 line-through decoration-slate-100">{record.from}</span>
                                                        <LucideIcon name="chevron-right" size={12} className="text-slate-200" />
                                                        <span className="text-[#C8102E] font-black uppercase tracking-tight">{record.to}</span>
                                                    </div>
                                                    {record.note && <p className="text-xs font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">"{record.note}"</p>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-24 text-slate-200 font-bold italic tracking-widest uppercase">No Records Found</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 일괄 등록 모달 */}
                    {isBulkModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)}></div>
                            <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-12 relative z-10 shadow-2xl space-y-8">
                                <h2 className="text-2xl font-black tracking-tight leading-none text-slate-800 uppercase italic">명단 일괄 등록</h2>
                                <p className="text-xs font-bold text-[#C8102E] italic leading-none">이름만 한 줄에 한 명씩 입력해 주세요. (현재 선택된 연령대로 등록됩니다)</p>
                                <textarea 
                                    className="w-full h-80 p-8 bg-slate-50 rounded-[2.5rem] outline-none font-bold text-sm resize-none focus:ring-4 focus:ring-[#C8102E]/5 border-none transition-all shadow-inner" 
                                    placeholder="예:&#10;김부산&#10;이파크&#10;박축구" 
                                    value={bulkText} 
                                    onChange={e => setBulkText(e.target.value)}
                                ></textarea>
                                <div className="flex gap-4">
                                    <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-5 bg-slate-100 rounded-[1.5rem] font-black text-slate-500 hover:bg-slate-200 transition-colors">취소</button>
                                    <button onClick={handleBulkAdd} className="flex-[2] py-5 bg-[#C8102E] text-white rounded-[1.5rem] font-black shadow-xl shadow-red-200 hover:bg-red-800 transition-all active:scale-95 uppercase tracking-widest">일괄 등록 시작</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 개별 추가/수정 모달 */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingId(null); }}></div>
                            <div className="bg-white rounded-[4rem] w-full max-w-lg p-12 relative z-10 shadow-2xl space-y-10 max-h-[95vh] overflow-y-auto no-scrollbar">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-3xl font-black tracking-tight leading-none text-slate-800 uppercase italic leading-none">{editingId ? '선수 수정' : '신규 등록'}</h2>
                                    {editingId && (
                                        <button 
                                            onClick={() => deletePlayer(editingId)} 
                                            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            데이터 삭제
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Age Category</label>
                                            <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black focus:ring-2 focus:ring-[#C8102E]/10 outline-none shadow-inner" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Field Position</label>
                                            <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black focus:ring-2 focus:ring-[#C8102E]/10 outline-none shadow-inner" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>{POSITIONS.map(p => <option key={p}>{p}</option>)}</select>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Full Name</label>
                                        <input type="text" placeholder="선수 성명" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-2xl font-black focus:ring-2 focus:ring-[#C8102E]/10 outline-none shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-[0.2em] leading-none">Condition</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {STATUS_OPTIONS.map(opt => (
                                                <button 
                                                    key={opt.value} 
                                                    onClick={() => setFormData({...formData, status: opt.value})} 
                                                    className={`p-5 rounded-3xl text-xs font-black border transition-all ${formData.status === opt.value ? 'bg-slate-900 text-white border-transparent shadow-xl scale-[1.03]' : 'bg-white text-gray-400 border-slate-100 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <LucideIcon name={opt.icon} size={18} />
                                                        {opt.value}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {formData.status !== '정상 훈련' && (
                                        <div className="p-8 bg-rose-50 rounded-[3rem] space-y-6 border border-rose-100 animate-in slide-in-from-top-4 duration-300 shadow-sm">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter">결장 사유</label>
                                                    <select className="w-full p-4 bg-white border-none rounded-2xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-rose-200 outline-none" value={formData.absenceCategory} onChange={e => setFormData({...formData, absenceCategory: e.target.value})}>
                                                        {ABSENCE_REASONS.map(r => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* 부상 부위: 선택창에서 직접 입력(텍스트 필드)으로 변경 완료 */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter">부상 부위 (직접 입력)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="부위 입력 (예: 오른쪽 발목)" 
                                                        className="w-full p-4 bg-white border-none rounded-2xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-rose-200 outline-none" 
                                                        value={formData.bodyPart} 
                                                        onChange={e => setFormData({...formData, bodyPart: e.target.value})} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-rose-800 ml-2 uppercase tracking-tighter">상세 내용</label>
                                                <textarea placeholder="상세 사유 기록 (부상 정도 등)" className="w-full p-5 border-none rounded-2xl text-xs font-bold resize-none bg-white shadow-sm focus:ring-2 focus:ring-rose-200 outline-none" rows="2" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-rose-800 ml-2 uppercase tracking-tighter">복귀 예정일</label>
                                                <input type="date" className="w-full p-4 border-none rounded-2xl text-xs font-black bg-white shadow-sm focus:ring-2 focus:ring-rose-200 outline-none" value={formData.expectedReturn} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={savePlayer} className="w-full py-7 bg-[#C8102E] text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-red-800 transition-all active:scale-95 tracking-tighter uppercase leading-none">Save Records</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>