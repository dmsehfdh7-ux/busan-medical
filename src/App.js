<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>부산아이파크 훈련참여현황</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
  * { font-family: 'Noto Sans KR', sans-serif; }
  .bebas { font-family: 'Bebas Neue', sans-serif; }
  :root {
    --red: #CC0000;
    --dark-red: #990000;
    --gold: #D4AF37;
    --light-gold: #F0D060;
  }

  /* ── 헤더 & 사이드바 상단 빨강, 콘텐츠 흰 배경 ── */
  body { background: #ffffff; }
  #app { min-height: 100vh; background: #ffffff; }

  /* 헤더 */
  .app-header {
    background: linear-gradient(135deg, var(--dark-red) 0%, var(--red) 60%, #EE2222 100%);
  }

  /* 사이드바 */
  .sidebar {
    background: linear-gradient(180deg, var(--dark-red) 0%, var(--red) 100%);
  }

  /* 콘텐츠 영역 */
  .main-content {
    background: #ffffff;
  }

  /* 카드 */
  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  }

  /* 통계 카드 */
  .stat-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(204,0,0,0.07);
  }

  /* 팀 배지 */
  .team-badge {
    background: var(--red);
    color: #fff;
    border-radius: 20px;
    padding: 2px 12px;
    font-size: 12px;
    font-weight: 700;
  }

  /* 상태 배지 */
  .status-normal { background:#dcfce7; color:#166534; }
  .status-injury { background:#fee2e2; color:#991b1b; }
  .status-rehab  { background:#fef9c3; color:#854d0e; }
  .status-national { background:#dbeafe; color:#1e40af; }
  .status-school { background:#f3e8ff; color:#6b21a8; }
  .status-personal { background:#ffedd5; color:#9a3412; }
  .status-sick   { background:#fce7f3; color:#9d174d; }
  .status-late   { background:#e0f2fe; color:#075985; }
  .status-early  { background:#f0fdf4; color:#14532d; }
  .status-excluded{ background:#f1f5f9; color:#475569; }
  .status-unknown { background:#f3f4f6; color:#374151; }

  /* 버튼 공통 */
  .btn-primary {
    background: var(--red);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:hover { background: var(--dark-red); }

  .btn-gold {
    background: var(--gold);
    color: #111;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-gold:hover { background: var(--light-gold); }

  .btn-outline {
    background: transparent;
    border: 2px solid var(--red);
    color: var(--red);
    border-radius: 8px;
    padding: 6px 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-outline:hover { background: var(--red); color: #fff; }

  /* 사이드바 네비 버튼 */
  .nav-btn {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 11px 16px;
    border-radius: 10px;
    border: none; cursor: pointer;
    font-size: 14px; font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: transparent;
    transition: all 0.2s;
    text-align: left;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .nav-btn.active { background: rgba(255,255,255,0.25); color: #fff; border-left: 3px solid var(--gold); }

  /* 선수 행 */
  .player-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
    background: #fff;
    margin-bottom: 6px;
    transition: box-shadow 0.15s;
  }
  .player-row:hover { box-shadow: 0 2px 10px rgba(204,0,0,0.1); }

  /* 참여율 바 */
  .progress-bar { background: #f0f0f0; border-radius: 99px; height: 8px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--red), var(--gold)); transition: width 0.5s; }

  /* 입력 폼 */
  .form-input {
    width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 9px 12px; font-size: 14px;
    outline: none; transition: border-color 0.2s; background: #fff;
  }
  .form-input:focus { border-color: var(--red); }

  /* 날짜 네비 */
  .date-nav-btn {
    background: #f3f4f6; border: none; border-radius: 8px;
    padding: 6px 12px; cursor: pointer; font-size: 18px;
    transition: background 0.2s;
  }
  .date-nav-btn:hover { background: #e5e7eb; }

  /* 모달 */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }
  .modal-box {
    background: #fff; border-radius: 16px; padding: 28px;
    width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  }

  /* 탭 */
  .tab-btn {
    padding: 7px 18px; border-radius: 8px; border: none;
    cursor: pointer; font-weight: 600; font-size: 14px;
    background: #f3f4f6; color: #6b7280; transition: all 0.2s;
  }
  .tab-btn.active { background: var(--red); color: #fff; }

  /* 스크롤바 */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #f1f1f1; }
  ::-webkit-scrollbar-thumb { background: var(--red); border-radius: 99px; }

  /* 통계 도넛 */
  .donut { position: relative; width: 80px; height: 80px; }

  /* 히스토리 날짜 칩 */
  .date-chip {
    display: inline-block; padding: 2px 10px; border-radius: 99px;
    font-size: 11px; font-weight: 600;
    background: #f3f4f6; color: #374151; margin-right: 6px;
  }

  /* 팀 카드 메인 */
  .team-card-main {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    border-top: 4px solid var(--red);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .team-card-main:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(204,0,0,0.12); }

  @media(max-width:768px){
    .sidebar { display: none; }
    .mobile-nav { display: flex !important; }
  }
  .mobile-nav { display: none; }
</style>
</head>
<body>
<div id="app">

<!-- 헤더 (빨강) -->
<header class="app-header shadow-lg" style="position:sticky;top:0;z-index:100;">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <!-- 로고 영역 -->
      <div style="width:44px;height:44px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
        <div style="width:32px;height:32px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:900;font-size:13px;font-family:'Bebas Neue',sans-serif;letter-spacing:0;">IP</span>
        </div>
      </div>
      <div>
        <div class="bebas" style="color:#fff;font-size:22px;letter-spacing:2px;line-height:1.1;">BUSAN IPARK</div>
        <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:500;letter-spacing:1px;">YOUTH ACADEMY</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div id="header-date" style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;"></div>
      <button class="btn-gold" onclick="openAddPlayerModal()" style="font-size:13px;padding:7px 14px;">+ 선수 등록</button>
    </div>
  </div>
  <!-- 모바일 네비 -->
  <div class="mobile-nav" style="overflow-x:auto;padding:0 16px 12px;gap:8px;">
    <button class="tab-btn active" onclick="mobileNav('dashboard')" id="mob-dashboard">전체</button>
    <button class="tab-btn" onclick="mobileNav('U18')" id="mob-U18">U18</button>
    <button class="tab-btn" onclick="mobileNav('U15')" id="mob-U15">U15</button>
    <button class="tab-btn" onclick="mobileNav('U12')" id="mob-U12">U12</button>
    <button class="tab-btn" onclick="mobileNav('WFC U15')" id="mob-WFC">WFC U15</button>
    <button class="tab-btn" onclick="mobileNav('stats')" id="mob-stats">통계</button>
  </div>
</header>

<div style="display:flex;min-height:calc(100vh - 70px);">

<!-- 사이드바 (빨강 그라디언트) -->
<aside class="sidebar" style="width:220px;min-width:220px;padding:20px 12px;display:flex;flex-direction:column;gap:4px;">
  <div style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;letter-spacing:2px;padding:0 8px 8px;">MENU</div>
  <button class="nav-btn active" id="nav-dashboard" onclick="navigate('dashboard')">
    <span style="font-size:16px;">&#9654;</span> 전체 현황
  </button>
  <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;letter-spacing:2px;padding:12px 8px 4px;">TEAMS</div>
  <button class="nav-btn" id="nav-U18" onclick="navigate('U18')">
    <span style="font-size:14px;background:rgba(255,255,255,0.2);border-radius:6px;padding:1px 7px;">U18</span> U18
  </button>
  <button class="nav-btn" id="nav-U15" onclick="navigate('U15')">
    <span style="font-size:14px;background:rgba(255,255,255,0.2);border-radius:6px;padding:1px 7px;">U15</span> U15
  </button>
  <button class="nav-btn" id="nav-U12" onclick="navigate('U12')">
    <span style="font-size:14px;background:rgba(255,255,255,0.2);border-radius:6px;padding:1px 7px;">U12</span> U12
  </button>
  <button class="nav-btn" id="nav-WFC U15" onclick="navigate('WFC U15')">
    <span style="font-size:10px;background:rgba(255,255,255,0.2);border-radius:6px;padding:1px 5px;">WFC</span> WFC U15
  </button>
  <div style="flex:1;"></div>
  <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;letter-spacing:2px;padding:8px 8px 4px;">TOOLS</div>
  <button class="nav-btn" id="nav-stats" onclick="navigate('stats')">
    <span style="font-size:16px;">&#9632;</span> 월별 통계
  </button>
  <button class="nav-btn" onclick="exportCSV()">
    <span style="font-size:16px;">&#8595;</span> CSV 내보내기
  </button>
</aside>

<!-- 메인 콘텐츠 (흰 배경) -->
<main class="main-content" style="flex:1;padding:28px 28px;overflow-y:auto;">
  <div id="page-dashboard"></div>
  <div id="page-team" style="display:none;"></div>
  <div id="page-stats" style="display:none;"></div>
</main>

</div><!-- /flex -->
</div><!-- /app -->

<!-- ───────────── MODALS ───────────── -->

<!-- 선수 등록 모달 -->
<div id="modal-add-player" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h2 style="font-size:18px;font-weight:800;color:#111;">선수 등록</h2>
      <button onclick="closeModal('modal-add-player')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
    </div>
    <!-- 탭 -->
    <div style="display:flex;gap:8px;margin-bottom:20px;">
      <button class="tab-btn active" id="tab-single" onclick="switchAddTab('single')">개별 등록</button>
      <button class="tab-btn" id="tab-bulk" onclick="switchAddTab('bulk')">일괄 등록</button>
    </div>
    <!-- 개별 -->
    <div id="add-single">
      <div style="display:grid;gap:12px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">팀</label>
          <select class="form-input" id="add-team">
            <option value="U18">U18</option>
            <option value="U15">U15</option>
            <option value="U12">U12</option>
            <option value="WFC U15">WFC U15</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">등번호</label>
          <input class="form-input" id="add-number" type="number" placeholder="10">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">이름</label>
          <input class="form-input" id="add-name" type="text" placeholder="홍길동">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">포지션</label>
          <select class="form-input" id="add-position">
            <option value="GK">GK</option>
            <option value="DF">DF</option>
            <option value="MF">MF</option>
            <option value="FW">FW</option>
          </select>
        </div>
        <button class="btn-primary" onclick="addSinglePlayer()" style="width:100%;margin-top:4px;">등록</button>
      </div>
    </div>
    <!-- 일괄 -->
    <div id="add-bulk" style="display:none;">
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">팀 선택</label>
        <select class="form-input" id="bulk-team">
          <option value="U18">U18</option>
          <option value="U15">U15</option>
          <option value="U12">U12</option>
          <option value="WFC U15">WFC U15</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">선수 목록 <span style="color:#999;font-weight:400;">(한 줄에 한 명: 번호, 이름, 포지션)</span></label>
        <textarea class="form-input" id="bulk-text" rows="8" placeholder="1, 김철수, GK&#10;7, 이민준, MF&#10;10, 박지훈, FW"></textarea>
      </div>
      <button class="btn-primary" onclick="addBulkPlayers()" style="width:100%;">일괄 등록</button>
    </div>
  </div>
</div>

<!-- 출석 체크 모달 -->
<div id="modal-attendance" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#111;" id="att-modal-title">출석 기록</h2>
      <button onclick="closeModal('modal-attendance')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
    </div>
    <div id="att-player-info" style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:16px;"></div>
    <div style="margin-bottom:14px;">
      <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:8px;">참여 상태</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="status-grid"></div>
    </div>
    <div id="att-memo-area" style="margin-bottom:14px;">
      <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">메모 (선택)</label>
      <input class="form-input" id="att-memo" type="text" placeholder="추가 메모 입력...">
    </div>
    <button class="btn-primary" onclick="saveAttendance()" style="width:100%;">저장</button>
  </div>
</div>

<!-- 히스토리 모달 -->
<div id="modal-history" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#111;" id="hist-title">참여 이력</h2>
      <button onclick="closeModal('modal-history')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
    </div>
    <div id="hist-content"></div>
  </div>
</div>

<!-- 일괄 상태 모달 -->
<div id="modal-bulk-status" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:800;color:#111;">일괄 상태 적용</h2>
      <button onclick="closeModal('modal-bulk-status')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">&times;</button>
    </div>
    <p style="font-size:13px;color:#666;margin-bottom:16px;">현재 팀의 모든 선수에게 동일한 상태를 적용합니다.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;" id="bulk-status-grid"></div>
    <button class="btn-primary" onclick="applyBulkStatus()" style="width:100%;">전체 적용</button>
  </div>
</div>

<script>
// ─── 데이터 ───
const TEAMS = ['U18','U15','U12','WFC U15'];
const STATUSES = [
  { key:'normal',   label:'정상참여',   cls:'status-normal' },
  { key:'injury',   label:'부상',       cls:'status-injury' },
  { key:'rehab',    label:'재활',       cls:'status-rehab' },
  { key:'national', label:'대표팀 차출',cls:'status-national' },
  { key:'school',   label:'학교 일정', cls:'status-school' },
  { key:'personal', label:'개인 사유', cls:'status-personal' },
  { key:'sick',     label:'병결',       cls:'status-sick' },
  { key:'late',     label:'지각',       cls:'status-late' },
  { key:'early',    label:'조기 퇴장', cls:'status-early' },
  { key:'excluded', label:'훈련 제외', cls:'status-excluded' },
  { key:'unknown',  label:'미확인',     cls:'status-unknown' },
];

let state = {
  currentPage: 'dashboard',
  currentTeam: null,
  currentDate: todayStr(),
  players: {},      // id -> player obj
  attendance: {},   // 'YYYY-MM-DD' -> { playerId: { status, memo } }
  nextId: 1,
  bulkStatusTarget: null,
  selectedBulkStatus: null,
  attTarget: null,
  selectedStatus: null,
};

function todayStr(){
  return new Date().toISOString().slice(0,10);
}

function loadState(){
  const saved = localStorage.getItem('bip_state_v3');
  if(saved){ Object.assign(state, JSON.parse(saved)); }
}

function saveState(){
  localStorage.setItem('bip_state_v3', JSON.stringify(state));
}

function getPlayersByTeam(team){
  return Object.values(state.players).filter(p=>p.team===team).sort((a,b)=>a.number-b.number);
}

function getAttendance(date, playerId){
  return (state.attendance[date]||{})[playerId] || null;
}

function getStatusObj(key){
  return STATUSES.find(s=>s.key===key) || STATUSES[10];
}

// ─── 네비게이션 ───
function navigate(page){
  state.currentPage = page;
  ['dashboard','U18','U15','U12','WFC U15','stats'].forEach(p=>{
    const el = document.getElementById('nav-'+p);
    if(el) el.classList.toggle('active', p===page);
  });
  if(TEAMS.includes(page)) state.currentTeam = page;
  renderPage();
}

function mobileNav(page){ navigate(page); }

// ─── 날짜 표시 ───
function updateHeaderDate(){
  const el = document.getElementById('header-date');
  if(!el) return;
  const d = new Date();
  el.textContent = d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일';
}

// ─── 페이지 렌더 ───
function renderPage(){
  document.getElementById('page-dashboard').style.display = 'none';
  document.getElementById('page-team').style.display = 'none';
  document.getElementById('page-stats').style.display = 'none';
  if(state.currentPage === 'dashboard'){
    document.getElementById('page-dashboard').style.display = '';
    renderDashboard();
  } else if(TEAMS.includes(state.currentPage)){
    document.getElementById('page-team').style.display = '';
    renderTeamPage(state.currentPage);
  } else if(state.currentPage === 'stats'){
    document.getElementById('page-stats').style.display = '';
    renderStats();
  }
}

// ─── 대시보드 ───
function renderDashboard(){
  const date = state.currentDate;
  let totalPlayers=0, totalNormal=0;
  const teamStats = TEAMS.map(team=>{
    const players = getPlayersByTeam(team);
    const att = state.attendance[date]||{};
    const normal = players.filter(p=>(att[p.id]||{}).status==='normal').length;
    const present = players.filter(p=>att[p.id]).length;
    totalPlayers += players.length;
    totalNormal += normal;
    return { team, total: players.length, normal, present };
  });
  const overallRate = totalPlayers ? Math.round(totalNormal/totalPlayers*100) : 0;

  let html = `
    <div style="margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:900;color:#111;margin-bottom:2px;">훈련참여현황</h1>
      <p style="color:#888;font-size:13px;">부산아이파크 유소년 아카데미</p>
    </div>

    <!-- 날짜 네비 -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
      <button class="date-nav-btn" onclick="changeDate(-1)">&#8592;</button>
      <input type="date" class="form-input" style="width:160px;" value="${date}" onchange="changeDate(0,this.value)">
      <button class="date-nav-btn" onclick="changeDate(1)">&#8594;</button>
      <button class="btn-outline" onclick="changeDate(0,todayStr())" style="font-size:12px;padding:5px 12px;">오늘</button>
    </div>

    <!-- 전체 요약 -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;">
      <div class="stat-card" style="padding:18px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:var(--red);">${totalPlayers}</div>
        <div style="font-size:12px;color:#888;font-weight:600;">전체 선수</div>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:#16a34a;">${totalNormal}</div>
        <div style="font-size:12px;color:#888;font-weight:600;">정상 참여</div>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:${overallRate>=80?'#16a34a':overallRate>=60?'#ca8a04':'#dc2626'};">${overallRate}%</div>
        <div style="font-size:12px;color:#888;font-weight:600;">참여율</div>
      </div>
    </div>

    <!-- 팀 카드 -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:28px;">
      ${teamStats.map(ts=>{
        const rate = ts.total ? Math.round(ts.normal/ts.total*100) : 0;
        const rateColor = rate>=80?'#16a34a':rate>=60?'#ca8a04':'#dc2626';
        return `
        <div class="team-card-main" onclick="navigate('${ts.team}')">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div>
              <span class="team-badge">${ts.team}</span>
              <div style="font-size:12px;color:#888;margin-top:4px;">${ts.total}명 등록</div>
            </div>
            <div style="font-size:30px;font-weight:900;color:${rateColor};">${rate}%</div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${rate}%;background:${rate>=80?'linear-gradient(90deg,#16a34a,#4ade80)':rate>=60?'linear-gradient(90deg,#ca8a04,#fbbf24)':'linear-gradient(90deg,var(--red),#f87171)'};"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#aaa;">
            <span>정상 ${ts.normal}명</span>
            <span>미확인 ${ts.total - ts.present}명</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- 전체 선수 리스트 -->
    <div class="card" style="padding:20px;">
      <h3 style="font-size:15px;font-weight:800;color:#111;margin-bottom:14px;">전체 선수 현황 — ${formatDate(date)}</h3>
      ${TEAMS.map(team=>{
        const players = getPlayersByTeam(team);
        if(!players.length) return '';
        return `
          <div style="margin-bottom:18px;">
            <div style="font-size:12px;font-weight:700;color:#888;letter-spacing:1px;margin-bottom:8px;">${team}</div>
            ${players.map(p=>{
              const att = getAttendance(date, p.id);
              const st = att ? getStatusObj(att.status) : null;
              return `
              <div class="player-row">
                <div style="width:30px;text-align:center;font-size:12px;font-weight:700;color:#bbb;">${p.number}</div>
                <div style="flex:1;">
                  <div style="font-size:14px;font-weight:700;color:#111;">${p.name}</div>
                  <div style="font-size:11px;color:#999;">${p.position}</div>
                </div>
                ${st ? `<span class="date-chip ${st.cls}" style="border-radius:6px;padding:2px 8px;">${st.label}</span>` : `<span style="font-size:11px;color:#ccc;">미입력</span>`}
                <button onclick="openAttModal('${p.id}','${date}')" style="background:var(--red);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">기록</button>
              </div>`;
            }).join('')}
          </div>`;
      }).join('')}
      ${Object.values(state.players).length===0?`<div style="text-align:center;color:#ccc;padding:30px;">등록된 선수가 없습니다.<br>선수를 먼저 등록해주세요.</div>`:''}
    </div>
  `;
  document.getElementById('page-dashboard').innerHTML = html;
}

// ─── 팀 페이지 ───
function renderTeamPage(team){
  const date = state.currentDate;
  const players = getPlayersByTeam(team);
  const att = state.attendance[date]||{};
  const normal = players.filter(p=>(att[p.id]||{}).status==='normal').length;
  const rate = players.length ? Math.round(normal/players.length*100) : 0;

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="team-badge" style="font-size:14px;padding:4px 14px;">${team}</span>
          <h1 style="font-size:22px;font-weight:900;color:#111;">훈련참여현황</h1>
        </div>
        <p style="color:#888;font-size:13px;margin-top:2px;">${players.length}명 등록</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-outline" onclick="openBulkStatusModal('${team}')">일괄 상태 적용</button>
        <button class="btn-primary" onclick="openAddPlayerModal('${team}')">+ 선수 추가</button>
      </div>
    </div>

    <!-- 날짜 네비 -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <button class="date-nav-btn" onclick="changeDate(-1)">&#8592;</button>
      <input type="date" class="form-input" style="width:160px;" value="${date}" onchange="changeDate(0,this.value)">
      <button class="date-nav-btn" onclick="changeDate(1)">&#8594;</button>
      <button class="btn-outline" onclick="changeDate(0,todayStr())" style="font-size:12px;padding:5px 12px;">오늘</button>
    </div>

    <!-- 요약 바 -->
    <div class="card" style="padding:16px 20px;margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;color:#555;">${formatDate(date)} 현황</div>
        <div style="font-size:22px;font-weight:900;color:${rate>=80?'#16a34a':rate>=60?'#ca8a04':'#dc2626'};">${rate}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${rate}%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#aaa;">
        ${STATUSES.map(s=>{
          const cnt = players.filter(p=>(att[p.id]||{}).status===s.key).length;
          return cnt > 0 ? `<span>${s.label} ${cnt}명</span>` : '';
        }).filter(Boolean).join(' | ')}
      </div>
    </div>

    <!-- 선수 목록 -->
    <div class="card" style="padding:20px;">
      <h3 style="font-size:14px;font-weight:800;color:#111;margin-bottom:14px;">선수 목록</h3>
      ${players.length === 0 ? `<div style="text-align:center;color:#ccc;padding:30px;">등록된 선수가 없습니다.</div>` :
        players.map(p=>{
          const a = getAttendance(date, p.id);
          const st = a ? getStatusObj(a.status) : null;
          return `
          <div class="player-row">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">${p.number}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:#111;">${p.name}</div>
              <div style="font-size:11px;color:#999;">${p.position}${a&&a.memo?' · '+a.memo:''}</div>
            </div>
            ${st ? `<span class="date-chip ${st.cls}">${st.label}</span>` : `<span style="font-size:11px;color:#ccc;background:#f9f9f9;border-radius:6px;padding:2px 8px;">미입력</span>`}
            <div style="display:flex;gap:6px;">
              <button onclick="openAttModal('${p.id}','${date}')" style="background:var(--red);color:#fff;border:none;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;font-weight:600;">기록</button>
              <button onclick="openHistoryModal('${p.id}')" style="background:#f3f4f6;color:#374151;border:none;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;">이력</button>
              <button onclick="deletePlayer('${p.id}')" style="background:#fff0f0;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">삭제</button>
            </div>
          </div>`;
        }).join('')
      }
    </div>
  `;
  document.getElementById('page-team').innerHTML = html;
}

// ─── 통계 ───
function renderStats(){
  const year = new Date().getFullYear();
  const month = new Date().getMonth()+1;
  const daysInMonth = new Date(year, month, 0).getDate();

  let html = `
    <div style="margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:900;color:#111;margin-bottom:2px;">월별 통계</h1>
      <p style="color:#888;font-size:13px;">${year}년 ${month}월</p>
    </div>
  `;

  TEAMS.forEach(team=>{
    const players = getPlayersByTeam(team);
    if(!players.length) return;

    html += `
      <div class="card" style="padding:20px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span class="team-badge">${team}</span>
          <span style="font-size:14px;font-weight:700;color:#111;">${year}년 ${month}월 참여율</span>
        </div>
        ${players.map(p=>{
          let normalDays=0, totalDays=0;
          for(let d=1;d<=daysInMonth;d++){
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const a = getAttendance(dateStr, p.id);
            if(a){ totalDays++; if(a.status==='normal') normalDays++; }
          }
          const rate = totalDays ? Math.round(normalDays/totalDays*100) : 0;
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#333;">${p.number} ${p.name} <span style="color:#999;font-size:11px;">${p.position}</span></span>
                <span style="font-size:13px;font-weight:700;color:${rate>=80?'#16a34a':rate>=60?'#ca8a04':'#dc2626'};">${totalDays?rate+'%':'기록없음'}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${rate}%;"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  });

  // 불참 사유 통계
  const reasonCount = {};
  STATUSES.filter(s=>s.key!=='normal').forEach(s=>{ reasonCount[s.key]=0; });
  Object.values(state.attendance).forEach(dayAtt=>{
    Object.values(dayAtt).forEach(a=>{
      if(a.status && a.status!=='normal') reasonCount[a.status] = (reasonCount[a.status]||0)+1;
    });
  });
  const totalAbsent = Object.values(reasonCount).reduce((a,b)=>a+b,0);

  html += `
    <div class="card" style="padding:20px;margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:800;color:#111;margin-bottom:14px;">전체 불참 사유 통계</h3>
      ${totalAbsent===0?`<div style="text-align:center;color:#ccc;padding:20px;">기록된 데이터가 없습니다.</div>`:
        STATUSES.filter(s=>s.key!=='normal'&&reasonCount[s.key]>0).map(s=>{
          const pct = Math.round(reasonCount[s.key]/totalAbsent*100);
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span class="date-chip ${s.cls}">${s.label}</span>
                <span style="font-size:12px;color:#888;">${reasonCount[s.key]}회 (${pct}%)</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%;"></div>
              </div>
            </div>`;
        }).join('')
      }
    </div>`;

  document.getElementById('page-stats').innerHTML = html;
}

// ─── 유틸 ───
function formatDate(str){
  const d = new Date(str+'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}

function changeDate(delta, val){
  if(val){ state.currentDate = val; }
  else {
    const d = new Date(state.currentDate+'T00:00:00');
    d.setDate(d.getDate()+delta);
    state.currentDate = d.toISOString().slice(0,10);
  }
  renderPage();
}

// ─── 모달 ───
function openModal(id){ document.getElementById(id).style.display='flex'; }
function closeModal(id){ document.getElementById(id).style.display='none'; }

function openAddPlayerModal(team){
  if(team){ document.getElementById('add-team').value=team; document.getElementById('bulk-team').value=team; }
  openModal('modal-add-player');
}

function switchAddTab(tab){
  document.getElementById('tab-single').classList.toggle('active', tab==='single');
  document.getElementById('tab-bulk').classList.toggle('active', tab==='bulk');
  document.getElementById('add-single').style.display = tab==='single'?'':'none';
  document.getElementById('add-bulk').style.display = tab==='bulk'?'':'none';
}

function addSinglePlayer(){
  const team = document.getElementById('add-team').value;
  const number = parseInt(document.getElementById('add-number').value)||0;
  const name = document.getElementById('add-name').value.trim();
  const position = document.getElementById('add-position').value;
  if(!name){ alert('이름을 입력해주세요.'); return; }
  const id = 'p'+state.nextId++;
  state.players[id] = { id, team, number, name, position };
  saveState();
  closeModal('modal-add-player');
  document.getElementById('add-name').value='';
  document.getElementById('add-number').value='';
  renderPage();
}

function addBulkPlayers(){
  const team = document.getElementById('bulk-team').value;
  const text = document.getElementById('bulk-text').value.trim();
  const lines = text.split('\n').filter(l=>l.trim());
  let added = 0;
  lines.forEach(line=>{
    const parts = line.split(',').map(s=>s.trim());
    if(parts.length>=2){
      const number = parseInt(parts[0])||0;
      const name = parts[1];
      const position = parts[2]||'MF';
      const id = 'p'+state.nextId++;
      state.players[id] = { id, team, number, name, position };
      added++;
    }
  });
  saveState();
  closeModal('modal-add-player');
  document.getElementById('bulk-text').value='';
  alert(`${added}명 등록 완료`);
  renderPage();
}

function deletePlayer(id){
  if(!confirm('선수를 삭제하시겠습니까?')) return;
  delete state.players[id];
  Object.keys(state.attendance).forEach(date=>{
    if(state.attendance[date][id]) delete state.attendance[date][id];
  });
  saveState(); renderPage();
}

// ─── 출석 모달 ───
function openAttModal(playerId, date){
  const p = state.players[playerId];
  if(!p) return;
  state.attTarget = { playerId, date };
  state.selectedStatus = getAttendance(date, playerId)?.status || null;

  document.getElementById('att-modal-title').textContent = `${p.name} 출석 기록`;
  document.getElementById('att-player-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;">${p.number}</div>
      <div>
        <div style="font-size:15px;font-weight:800;color:#111;">${p.name}</div>
        <div style="font-size:12px;color:#888;">${p.team} · ${p.position} · ${formatDate(date)}</div>
      </div>
    </div>`;

  const grid = document.getElementById('status-grid');
  grid.innerHTML = STATUSES.map(s=>`
    <button onclick="selectStatus('${s.key}')" id="sb-${s.key}"
      style="padding:10px;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;background:#fff;color:#333;"
      class="${s.cls}">
      ${s.label}
    </button>`).join('');

  if(state.selectedStatus) highlightStatus(state.selectedStatus);
  const existing = getAttendance(date, playerId);
  document.getElementById('att-memo').value = existing?.memo||'';
  openModal('modal-attendance');
}

function selectStatus(key){
  state.selectedStatus = key;
  highlightStatus(key);
}

function highlightStatus(key){
  STATUSES.forEach(s=>{
    const btn = document.getElementById('sb-'+s.key);
    if(!btn) return;
    if(s.key===key){
      btn.style.borderColor = 'var(--red)';
      btn.style.boxShadow = '0 0 0 2px rgba(204,0,0,0.2)';
      btn.style.transform = 'scale(1.03)';
    } else {
      btn.style.borderColor = '#e5e7eb';
      btn.style.boxShadow = '';
      btn.style.transform = '';
    }
  });
}

function saveAttendance(){
  if(!state.selectedStatus){ alert('상태를 선택해주세요.'); return; }
  const { playerId, date } = state.attTarget;
  if(!state.attendance[date]) state.attendance[date] = {};
  state.attendance[date][playerId] = {
    status: state.selectedStatus,
    memo: document.getElementById('att-memo').value.trim(),
  };
  saveState();
  closeModal('modal-attendance');
  renderPage();
}

// ─── 히스토리 모달 ───
function openHistoryModal(playerId){
  const p = state.players[playerId];
  if(!p) return;
  document.getElementById('hist-title').textContent = `${p.name} 참여 이력`;

  const records = [];
  Object.keys(state.attendance).sort().reverse().forEach(date=>{
    const a = state.attendance[date][playerId];
    if(a) records.push({ date, ...a });
  });

  let html = '';
  if(!records.length){
    html = `<div style="text-align:center;color:#ccc;padding:30px;">기록이 없습니다.</div>`;
  } else {
    html = records.map(r=>{
      const st = getStatusObj(r.status);
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <div style="flex:1;font-size:13px;font-weight:600;color:#555;">${formatDate(r.date)}</div>
          <span class="date-chip ${st.cls}">${st.label}</span>
          ${r.memo?`<span style="font-size:11px;color:#999;">${r.memo}</span>`:''}
        </div>`;
    }).join('');
  }
  document.getElementById('hist-content').innerHTML = html;
  openModal('modal-history');
}

// ─── 일괄 상태 ───
function openBulkStatusModal(team){
  state.bulkStatusTarget = team;
  state.selectedBulkStatus = null;
  const grid = document.getElementById('bulk-status-grid');
  grid.innerHTML = STATUSES.map(s=>`
    <button onclick="selectBulkStatus('${s.key}')" id="bsb-${s.key}"
      style="padding:10px;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#333;"
      class="${s.cls}">
      ${s.label}
    </button>`).join('');
  openModal('modal-bulk-status');
}

function selectBulkStatus(key){
  state.selectedBulkStatus = key;
  STATUSES.forEach(s=>{
    const btn = document.getElementById('bsb-'+s.key);
    if(!btn) return;
    btn.style.borderColor = s.key===key?'var(--red)':'#e5e7eb';
    btn.style.boxShadow = s.key===key?'0 0 0 2px rgba(204,0,0,0.2)':'';
  });
}

function applyBulkStatus(){
  if(!state.selectedBulkStatus){ alert('상태를 선택해주세요.'); return; }
  const players = getPlayersByTeam(state.bulkStatusTarget);
  const date = state.currentDate;
  if(!state.attendance[date]) state.attendance[date]={};
  players.forEach(p=>{
    state.attendance[date][p.id] = { status: state.selectedBulkStatus, memo:'' };
  });
  saveState();
  closeModal('modal-bulk-status');
  renderPage();
}

// ─── CSV 내보내기 ───
function exportCSV(){
  const dates = Object.keys(state.attendance).sort();
  if(!dates.length){ alert('내보낼 데이터가 없습니다.'); return; }
  let csv = '\uFEFF팀,번호,이름,포지션,날짜,상태,메모\n';
  dates.forEach(date=>{
    Object.keys(state.attendance[date]).forEach(pid=>{
      const p = state.players[pid];
      if(!p) return;
      const a = state.attendance[date][pid];
      const st = getStatusObj(a.status);
      csv += `${p.team},${p.number},${p.name},${p.position},${date},${st.label},"${a.memo||''}"\n`;
    });
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `부산아이파크_훈련참여현황_${todayStr()}.csv`;
  a.click();
}

// ─── 모달 외부 클릭 닫기 ───
['modal-add-player','modal-attendance','modal-history','modal-bulk-status'].forEach(id=>{
  document.getElementById(id).addEventListener('click', function(e){
    if(e.target===this) closeModal(id);
  });
});

// ─── 초기화 ───
loadState();
updateHeaderDate();
navigate('dashboard');
</script>
</body>
</html>