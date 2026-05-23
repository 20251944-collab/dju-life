import { useState, useEffect } from 'react';

const BUS = ['09:00', '11:00', '13:00', '15:30', '17:00', '19:00', '21:00'];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const BUILDING_WALK = {
  '학생회관': 3, '인문학관': 5, '국제학관': 5, '사회과학관': 6,
  '대학원': 6, '교수연구동': 8, '파워플랜트': 8, '대진교육관': 8,
  '교수회관': 7, '본관': 9, '박물관': 6, '정보전산원': 5,
  '이공학관 다동': 9, '이공학관 가동': 10, '이공학관 나동': 9,
  '간호학과': 10, '중앙도서관': 7, '음악학관': 14, '생활과학관': 14,
  '예술관': 15, '소운동장 (테니스장 옆)': 13, '체육관': 6, '대운동장': 7,
  '버스 정류장': 2,
};

function getDayStart(cls, day) {
  return cls.daySchedules?.[day]?.start ?? cls.start ?? 9;
}
function getDayEnd(cls, day) {
  return cls.daySchedules?.[day]?.end ?? cls.end ?? 10;
}
function formatTime(val) {
  const h = Math.floor(val);
  return `${h}:${val % 1 === 0 ? '00' : '30'}`;
}

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fmtLeft(m) {
  if (m < 60) return `${m}분 후`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}시간 ${r}분 후` : `${h}시간 후`;
}
function dday(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - Date.now()) / 86400000);
}
function useBus(now) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const upcoming = BUS.map(t => ({ t, m: toMin(t) }))
    .filter(x => x.m > cur)
    .map(x => ({ ...x, left: x.m - cur }));
  if (!upcoming.length) return null;
  return { next: upcoming[0], after: upcoming[1] ?? null, last: BUS[BUS.length - 1] };
}

/* ── 카드 래퍼 ── */
function Card({ title, badge, children, onClick }) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase flex-1">{title}</p>
        {badge && <span className="text-xs font-bold text-white bg-navy px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── 오늘 수업 카드 ── */
function TodayClasses({ classes, now }) {
  const today = DAYS[now.getDay()];
  const curHour = now.getHours() + now.getMinutes() / 60;
  const list = classes
    .filter(c => c.days.includes(today))
    .sort((a, b) => getDayStart(a, today) - getDayStart(b, today));

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center py-3 gap-1">
        <p className="text-sm text-gray-400">오늘 수업이 없습니다.</p>
        <p className="text-xs text-gray-300">{today}요일</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map(c => {
        const s = getDayStart(c, today);
        const e = getDayEnd(c, today);
        const isDone = e <= curHour;
        const isNow = s <= curHour && curHour < e;
        const minsUntil = Math.round((s - curHour) * 60);
        return (
          <div key={c.id} className="flex gap-3 items-center">
            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
              isNow ? 'bg-navy' : isDone ? 'bg-gray-200' : 'bg-gray-300'
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                {c.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatTime(s)}–{formatTime(e)}
                {c.building ? ` · ${c.building}` : ''}
                {c.room ? ` ${c.room}호` : ''}
              </p>
            </div>
            {isNow && (
              <span className="text-xs font-semibold text-white bg-navy px-2.5 py-0.5 rounded-full flex-shrink-0">
                진행 중
              </span>
            )}
            {!isNow && !isDone && minsUntil > 0 && (
              <span className="text-xs text-gray-400 flex-shrink-0">{minsUntil}분 후</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 알림 카드 ── */
function AlertsCard({ now, notifPerm, onRequestNotif }) {
  const memos = (() => {
    try { return JSON.parse(localStorage.getItem('dju_memos')) || []; } catch { return []; }
  })();

  const cur = now.getHours() * 60 + now.getMinutes();
  const nextBus = BUS.map(t => ({ t, m: toMin(t) })).find(x => x.m > cur);
  const busLeft = nextBus ? nextBus.m - cur : null;

  const items = [];

  if (busLeft !== null && busLeft <= 30) {
    items.push({
      id: 'bus',
      title: `포천행 버스 ${busLeft}분 전`,
      sub: `${nextBus.t} 출발`,
      cls: 'bg-green-50 border-green-200 text-green-800',
      action: null,
    });
  }

  memos
    .filter(m => m.deadline)
    .map(m => ({ ...m, d: dday(m.deadline) }))
    .filter(m => m.d !== null && m.d <= 3)
    .sort((a, b) => a.d - b.d)
    .forEach(m => {
      const label = m.d < 0 ? '마감 지남' : m.d === 0 ? '오늘 마감' : `D-${m.d}`;
      const cls = m.d < 0
        ? 'bg-red-50 border-red-200 text-red-800'
        : m.d === 0
          ? 'bg-orange-50 border-orange-200 text-orange-800'
          : 'bg-blue-50 border-blue-200 text-blue-800';
      /* content/courseName 필드로 읽기 (Memo.jsx 데이터 구조) */
      const title = m.content ? m.content.slice(0, 40) : (m.title || '메모');
      const sub = `${label}${m.courseName ? ` · ${m.courseName}` : (m.subject ? ` · ${m.subject}` : '')}`;
      items.push({ id: m.id, title, sub, cls, action: null });
    });

  return (
    <div className="flex flex-col gap-2">
      {/* 알림 권한 미허용 안내 */}
      {notifPerm === 'default' && (
        <button
          onClick={onRequestNotif}
          className="w-full text-left border border-yellow-200 bg-yellow-50 rounded-xl px-4 py-3 hover:bg-yellow-100 transition-colors"
        >
          <p className="text-sm font-semibold text-yellow-800">🔔 수업 알림 허용하기</p>
          <p className="text-xs text-yellow-600 mt-0.5">수업 시작 10분 전 브라우저 알림을 받습니다.</p>
        </button>
      )}
      {notifPerm === 'denied' && (
        <div className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-gray-500">🔕 알림 차단됨</p>
          <p className="text-xs text-gray-400 mt-0.5">브라우저 설정에서 알림을 허용하면 수업 10분 전 알림을 받습니다.</p>
        </div>
      )}
      {!items.length && notifPerm === 'granted' && (
        <p className="text-sm text-gray-400">새로운 알림이 없습니다.</p>
      )}
      {items.slice(0, 4).map(a => (
        <div key={a.id} className={`border rounded-xl px-4 py-3 ${a.cls}`}>
          <p className="text-sm font-semibold">{a.title}</p>
          {a.sub && <p className="text-xs opacity-70 mt-0.5">{a.sub}</p>}
        </div>
      ))}
      {items.length > 4 && (
        <p className="text-xs text-gray-400 text-center">외 {items.length - 4}개</p>
      )}
    </div>
  );
}

/* ── 캠퍼스 지도 미리보기 ── */
function MapPreview({ classes, now }) {
  const today = DAYS[now.getDay()];
  const curHour = now.getHours() + now.getMinutes() / 60;
  const nextClass = classes
    .filter(c => c.days.includes(today) && getDayStart(c, today) > curHour)
    .sort((a, b) => getDayStart(a, today) - getDayStart(b, today))[0];
  const walkTime = nextClass?.building ? (BUILDING_WALK[nextClass.building] ?? 10) : null;
  const minsUntil = nextClass ? Math.round((getDayStart(nextClass, today) - curHour) * 60) : null;

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-blue-50" style={{ height: 100 }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
        <span className="absolute text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900"
          style={{ top: '12%', left: '42%' }}>공학관</span>
        <span className="absolute text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-200 text-pink-900"
          style={{ top: '52%', right: '8%' }}>인문관</span>
        <span className="absolute text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900"
          style={{ top: '52%', left: '6%' }}>정보관</span>
        <div className="absolute w-3 h-3 rounded-full bg-navy border-2 border-white shadow-md"
          style={{ top: '50%', left: '32%' }}>
          <div className="absolute inset-0 rounded-full bg-navy animate-ping opacity-40" />
        </div>
      </div>

      {nextClass ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">다음 수업</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {nextClass.building || '강의실'}{nextClass.room ? ` ${nextClass.room}호` : ''}
            </p>
            {minsUntil !== null && (
              <p className={`text-xs font-bold mt-0.5 ${
                minsUntil <= 10 ? 'text-red-500'
                : minsUntil <= 20 ? 'text-orange-500'
                : 'text-navy'
              }`}>
                {minsUntil < 60
                  ? `${minsUntil}분 후 시작`
                  : `${Math.floor(minsUntil / 60)}시간${minsUntil % 60 ? ` ${minsUntil % 60}분` : ''} 후 시작`}
              </p>
            )}
          </div>
          {walkTime !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-400">예상 도보</p>
              <p className="text-xl font-bold text-navy">약 {walkTime}분</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs font-medium text-gray-400 text-center">
          {today === '토' || today === '일' ? '주말입니다.' : '오늘 남은 수업이 없습니다.'}
        </p>
      )}
    </>
  );
}

/* ── 버스 안내 카드 ── */
function BusCard({ bus, now }) {
  if (!bus) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-gray-400">오늘 버스 운행이 종료됐습니다.</p>
        <p className="text-xs text-gray-300">내일 첫차 {BUS[0]}</p>
      </div>
    );
  }

  const cur = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">포천행 다음 버스</p>
          <p className="text-base font-bold text-gray-800">{bus.next.t} 출발</p>
        </div>
        <span className={`text-sm font-bold text-white px-3 py-1.5 rounded-full ${
          bus.next.left <= 10 ? 'bg-red-500' : bus.next.left <= 30 ? 'bg-orange-400' : 'bg-green-500'
        }`}>
          {fmtLeft(bus.next.left)}
        </span>
      </div>

      {bus.after && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">그 다음 버스</p>
          <p className="text-xs font-semibold text-gray-600">{bus.after.t} · {fmtLeft(bus.after.left)}</p>
        </div>
      )}

      <div className="flex items-center justify-between px-1 pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-400">막차</p>
        <p className="text-xs font-semibold text-gray-500">{bus.last}</p>
      </div>

      {/* 전체 시간표 */}
      <div className="flex flex-wrap gap-1.5">
        {BUS.map(t => {
          const isPast = toMin(t) <= cur;
          const isNext = t === bus.next.t;
          return (
            <span key={t} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isNext ? 'bg-navy text-white'
              : isPast ? 'bg-gray-100 text-gray-300 line-through'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {t}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function Home({ onNavigate, userName, classes = [], notifPerm, onRequestNotif }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const bus = useBus(now);
  const today = DAYS[now.getDay()];
  const todayCount = classes.filter(c => c.days.includes(today)).length;
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요{userName ? `, ${userName} 님` : ''}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{dateStr}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="오늘 수업" badge={todayCount > 0 ? `${todayCount}개` : null}>
          <TodayClasses classes={classes} now={now} />
        </Card>

        <Card title="알림">
          <AlertsCard now={now} notifPerm={notifPerm} onRequestNotif={onRequestNotif} />
        </Card>

        <Card title="캠퍼스 지도" onClick={() => onNavigate('map')}>
          <MapPreview classes={classes} now={now} />
        </Card>

        <Card title="버스 안내 · 포천행">
          <BusCard bus={bus} now={now} />
        </Card>
      </div>
    </div>
  );
}
