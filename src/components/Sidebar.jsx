const NAV = [
  { key: 'home',      label: '홈' },
  { key: 'timetable', label: '시간표' },
  { key: 'map',       label: '캠퍼스 지도' },
  { key: 'portfolio', label: '포트폴리오' },
  { key: 'ai',        label: '🤖 AI 추천' },
];

export default function Sidebar({ active, onChange, user, onLogout }) {
  return (
    <aside className="hidden md:flex flex-col w-40 fixed inset-y-0 left-0 bg-navy z-40 shadow-lg">
      {/* 로고 */}
      <div className="px-5 pt-7 pb-4">
        <p className="text-base font-bold text-white leading-tight">DJU Life</p>
        <p className="text-xs text-white/50 mt-0.5">대진대학교</p>
      </div>

      <div className="mx-5 border-t border-white/15" />

      {/* 메뉴 */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {NAV.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors ${
              active === key
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/55 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-t border-white/15">
        <div className="flex items-center gap-2 mb-1">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-7 h-7 rounded-full shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-base">👤</span>
          )}
          <p className="text-sm font-semibold text-white truncate">
            {user.displayName || '사용자'}
          </p>
        </div>
        <p className="text-[10px] text-white/35 ml-9 mt-0.5">클라우드 저장 중</p>
        <button
          onClick={onLogout}
          className="mt-3 w-full text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/40 py-1.5 rounded-lg transition-colors"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
