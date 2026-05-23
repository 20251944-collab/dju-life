import { useState } from 'react';

const DAYS = ['월', '화', '수', '목', '금'];

// 9:00 ~ 22:30, 30분 단위 (그리드: 27행, 선택옵션: 28개)
const SLOTS       = Array.from({ length: 27 }, (_, i) => 9 + i * 0.5);
const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => 9 + i * 0.5);
const SLOT_H = 28; // px per 30-min row

function formatTime(val) {
  const h = Math.floor(val);
  return `${h}:${val % 1 === 0 ? '00' : '30'}`;
}

// 요일별 시간 조회 (daySchedules 없으면 공통 start/end로 폴백)
function getDayStart(cls, day) {
  return cls.daySchedules?.[day]?.start ?? cls.start ?? 9;
}
function getDayEnd(cls, day) {
  return cls.daySchedules?.[day]?.end ?? cls.end ?? 10;
}

const COLORS = [
  { bg: 'bg-blue-50',    text: 'text-blue-800',    border: 'border-blue-200',    dot: 'bg-blue-400' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800',  border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { bg: 'bg-violet-50',  text: 'text-violet-800',   border: 'border-violet-200',  dot: 'bg-violet-400' },
  { bg: 'bg-orange-50',  text: 'text-orange-800',   border: 'border-orange-200',  dot: 'bg-orange-400' },
  { bg: 'bg-rose-50',    text: 'text-rose-800',     border: 'border-rose-200',    dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50',    text: 'text-cyan-800',     border: 'border-cyan-200',    dot: 'bg-cyan-400' },
  { bg: 'bg-amber-50',   text: 'text-amber-800',    border: 'border-amber-200',   dot: 'bg-amber-400' },
];

const EMPTY = { name: '', building: '', room: '', location: '', daySchedules: {} };

function checkConflict(form, classes, editId) {
  return classes.filter(c => c.id !== editId).some(c =>
    Object.entries(form.daySchedules).some(([day, { start: s, end: e }]) => {
      if (!c.days?.includes(day)) return false;
      const cs = getDayStart(c, day);
      const ce = getDayEnd(c, day);
      return s < ce && e > cs;
    })
  );
}

/* ── 추가/수정 모달 ── */
function FormModal({ form, setForm, editId, onSave, onClose, conflict }) {
  const selectedDays = DAYS.filter(d => form.daySchedules[d]);

  const toggleDay = day => {
    setForm(f => {
      const ds = { ...f.daySchedules };
      if (ds[day]) {
        delete ds[day];
      } else {
        const last = Object.values(ds).slice(-1)[0];
        ds[day] = last ? { ...last } : { start: 9, end: 10.5 };
      }
      return { ...f, daySchedules: ds };
    });
  };

  const setDayTime = (day, field, val) => {
    setForm(f => {
      const ds = { ...f.daySchedules, [day]: { ...f.daySchedules[day], [field]: +val } };
      // 시작 시간이 종료 이상이면 종료 자동 조정
      if (field === 'start' && ds[day].end <= +val) {
        ds[day].end = +val + 0.5;
      }
      return { ...f, daySchedules: ds };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800 text-base">{editId ? '강의 수정' : '강의 추가'}</h3>

        <input autoFocus placeholder="강의명 *"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />

        <div className="grid grid-cols-2 gap-2">
          <input placeholder="학관명 (예: 공학관)"
            value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
          <input placeholder="강의실 번호 (예: 301)"
            value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />
        </div>

        <input placeholder="강의실 상세 위치 (예: 3층 엘리베이터 앞)"
          value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy" />

        {/* 요일 선택 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">요일 * (다중 선택)</p>
          <div className="flex gap-2">
            {DAYS.map(d => (
              <button key={d} onClick={() => toggleDay(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  form.daySchedules[d] ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 요일별 시간 설정 */}
        {selectedDays.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">요일별 시간</p>
            {selectedDays.map(day => {
              const { start, end } = form.daySchedules[day];
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-navy text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {day}
                  </span>
                  <select
                    value={start}
                    onChange={e => setDayTime(day, 'start', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-navy bg-white"
                  >
                    {TIME_OPTIONS.slice(0, 27).map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-sm flex-shrink-0">~</span>
                  <select
                    value={end}
                    onChange={e => setDayTime(day, 'end', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-navy bg-white"
                  >
                    {TIME_OPTIONS.filter(t => t > start).map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {conflict && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
            ⚠ 선택한 시간대에 이미 다른 강의가 있습니다.
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose}
            className="text-sm px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 font-medium">취소</button>
          <button onClick={onSave}
            className="text-sm px-5 py-2.5 rounded-xl bg-navy text-white font-medium hover:opacity-90">
            {editId ? '수정 완료' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 상세 팝업 ── */
function DetailModal({ cls, onEdit, onDelete, onClose }) {
  const col = COLORS[cls.colorIdx % COLORS.length];
  const scheduleRows = DAYS
    .filter(d => cls.days?.includes(d))
    .map(d => ({
      label: `${d}요일`,
      value: `${formatTime(getDayStart(cls, d))} – ${formatTime(getDayEnd(cls, d))}`,
    }));
  const rows = [
    ...scheduleRows,
    cls.building ? { label: '학관', value: cls.building } : null,
    cls.room     ? { label: '강의실', value: cls.room + '호' } : null,
    cls.location ? { label: '위치', value: cls.location } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${col.bg} ${col.text}`}>
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          강의 정보
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{cls.name}</h3>
        <div className="flex flex-col gap-3">
          {rows.map(row => (
            <div key={row.label} className="flex gap-3 text-sm">
              <span className="text-gray-400 w-16 flex-shrink-0">{row.label}</span>
              <span className="text-gray-800 font-medium">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors">수정</button>
          <button onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors">삭제</button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function Timetable({ classes, setClasses }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [detail, setDetail]     = useState(null);
  const [conflict, setConflict] = useState(false);

  const openAdd = () => {
    setForm(EMPTY); setEditId(null); setConflict(false);
    setDetail(null); setShowForm(true);
  };

  const openEdit = cls => {
    // 구버전 데이터(daySchedules 없음) 마이그레이션
    const daySchedules = cls.daySchedules
      ? { ...cls.daySchedules }
      : Object.fromEntries((cls.days || []).map(d => [d, { start: cls.start ?? 9, end: cls.end ?? 10 }]));
    setForm({
      name: cls.name, building: cls.building || '', room: cls.room || '',
      location: cls.location || '', daySchedules,
    });
    setEditId(cls.id); setConflict(false); setDetail(null); setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false); setForm(EMPTY); setEditId(null); setConflict(false);
  };

  const handleSave = () => {
    const selectedDays = DAYS.filter(d => form.daySchedules[d]);
    if (!form.name.trim() || selectedDays.length === 0) return;
    if (Object.values(form.daySchedules).some(s => s.end <= s.start)) return;
    if (checkConflict(form, classes, editId)) { setConflict(true); return; }

    const starts = selectedDays.map(d => form.daySchedules[d].start);
    const ends   = selectedDays.map(d => form.daySchedules[d].end);
    const patch = {
      name: form.name, building: form.building, room: form.room,
      location: form.location,
      daySchedules: form.daySchedules,
      days:  selectedDays,
      start: Math.min(...starts),
      end:   Math.max(...ends),
    };

    if (editId) {
      setClasses(prev => prev.map(c => c.id === editId ? { ...c, ...patch } : c));
    } else {
      setClasses(prev => [...prev, {
        id: Date.now(), ...patch,
        colorIdx: prev.length % COLORS.length,
      }]);
    }
    closeForm();
  };

  const handleDelete = id => { setClasses(prev => prev.filter(c => c.id !== id)); setDetail(null); };

  const getClass = (day, slot) =>
    classes.find(c =>
      c.days?.includes(day) &&
      getDayStart(c, day) <= slot &&
      slot < getDayEnd(c, day)
    );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">시간표</h2>
        <button onClick={openAdd}
          className="text-sm px-4 py-2 rounded-xl bg-navy text-white font-medium hover:opacity-90 transition-opacity">
          + 강의 추가
        </button>
      </div>

      {/* 주간 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-12 py-3" />
              {DAYS.map(d => (
                <th key={d} className="py-3 text-sm font-bold text-center text-navy">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot} className="border-b border-gray-50 last:border-0" style={{ height: SLOT_H }}>
                <td className="text-xs text-gray-300 text-right pr-2 align-top pt-0.5 select-none w-12">
                  {slot % 1 === 0 ? formatTime(slot) : ''}
                </td>
                {DAYS.map(day => {
                  const cls = getClass(day, slot);
                  if (cls && getDayStart(cls, day) < slot) return null;
                  const col = cls ? COLORS[cls.colorIdx % COLORS.length] : null;
                  const span = cls ? (getDayEnd(cls, day) - getDayStart(cls, day)) * 2 : 1;
                  return (
                    <td key={day} rowSpan={span} className="px-0.5 py-0.5 align-top">
                      {cls && getDayStart(cls, day) === slot && (
                        <button
                          onClick={() => setDetail(cls)}
                          className={`w-full h-full text-left rounded-lg px-2 py-1.5 text-xs font-semibold border hover:opacity-75 transition-opacity ${col.bg} ${col.text} ${col.border}`}
                          style={{ minHeight: `${span * SLOT_H - 4}px` }}
                        >
                          <p className="truncate leading-tight">{cls.name}</p>
                          {cls.building && (
                            <p className="opacity-50 font-normal mt-0.5 truncate">{cls.building} {cls.room}</p>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록 강의 목록 */}
      {classes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">등록 강의</p>
          {classes.map(c => {
            const col = COLORS[c.colorIdx % COLORS.length];
            const scheduleText = DAYS
              .filter(d => c.days?.includes(d))
              .map(d => `${d} ${formatTime(getDayStart(c, d))}–${formatTime(getDayEnd(c, d))}`)
              .join(' / ');
            return (
              <div key={c.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${col.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {scheduleText}
                    {c.building ? ` · ${c.building}` : ''}{c.room ? ` ${c.room}호` : ''}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)}
                    className="text-xs text-gray-400 hover:text-navy px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">수정</button>
                  <button onClick={() => handleDelete(c.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {classes.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center mt-8">등록된 강의가 없습니다.<br />위 버튼으로 강의를 추가해보세요.</p>
      )}

      {/* 모달 */}
      {showForm && (
        <FormModal
          form={form} setForm={setForm} editId={editId}
          onSave={handleSave} onClose={closeForm} conflict={conflict}
        />
      )}
      {detail && !showForm && (
        <DetailModal
          cls={detail}
          onEdit={() => openEdit(detail)}
          onDelete={() => handleDelete(detail.id)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
