const TABS = [
  { key: 'home',      icon: '🏠', label: '홈' },
  { key: 'timetable', icon: '📅', label: '시간표' },
  { key: 'map',       icon: '🗺️', label: '지도' },
  { key: 'portfolio', icon: '💼', label: '포트폴리오' },
  { key: 'ai',        icon: '🤖', label: 'AI 추천' },
];

export default function BottomTabBar({ active, onChange }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex">
      {TABS.map(({ key, icon, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
            active === key ? 'text-navy' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
