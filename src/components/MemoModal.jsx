import { useState, useEffect } from 'react';

const KEY = 'dju_memos';
const REMINDS = ['3일 전', '1일 전', '6시간', '1시간'];

function dday(dl) {
  if (!dl) return null;
  return Math.ceil((new Date(dl) - Date.now()) / 86400000);
}
function ago(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

export default function MemoModal({ open, onClose }) {
  const [memos, setMemos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', deadline: '' });
  const [expanded, setExpanded] = useState(null);
  const [reminders, setReminders] = useState({});

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(memos)); }, [memos]);

  const add = () => {
    if (!form.title.trim()) return;
    setMemos(p => [{ id: Date.now(), ...form, createdAt: new Date().toISOString() }, ...p]);
    setForm({ title: '', subject: '', deadline: '' });
    setShowForm(false);
  };

  const del = id => { setMemos(p => p.filter(m => m.id !== id)); if (expanded === id) setExpanded(null); };

  const toggleRemind = (id, opt) =>
    setReminders(p => { const s = new Set(p[id]); s.has(opt) ? s.delete(opt) : s.add(opt); return { ...p, [id]: s }; });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-96 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* 헤더 */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <h3 className="flex-1 font-bold text-gray-800">메모</h3>
          <button onClick={() => setShowForm(v => !v)}
            className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-lg font-light">+</button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center">✕</button>
        </div>

        {/* 추가 폼 */}
        {showForm && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-2">
            <input autoFocus placeholder="메모 제목"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && add()}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy" />
            <input placeholder="관련 과목 (선택)"
              value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy" />
            <input type="datetime-local"
              value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-600 focus:outline-none focus:border-navy" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)}
                className="text-sm px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">취소</button>
              <button onClick={add}
                className="text-sm px-3 py-1.5 rounded-lg bg-navy text-white hover:opacity-90">저장</button>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {memos.length === 0 && !showForm
            ? <p className="text-sm text-gray-400 text-center py-12">메모가 없습니다.</p>
            : <ul>
              {memos.map((m, i) => {
                const d = dday(m.deadline);
                const isExp = expanded === m.id;
                const rs = reminders[m.id] || new Set();
                return (
                  <li key={m.id} className={`px-5 py-4 ${i < memos.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 cursor-pointer" onClick={() => setExpanded(isExp ? null : m.id)}>
                        <p className="text-sm font-semibold text-gray-800">{m.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.subject ? `${m.subject} · ` : ''}{ago(m.createdAt)}
                        </p>
                        {d !== null && (
                          <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            d < 0 ? 'bg-red-100 text-red-700' : d <= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {d < 0 ? '마감' : `D-${d}`} 알림 설정됨
                          </span>
                        )}
                      </div>
                      <button onClick={() => del(m.id)} className="text-gray-300 hover:text-red-400 transition-colors text-sm mt-0.5">✕</button>
                    </div>

                    {isExp && m.deadline && (
                      <div className="mt-3 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">
                          마감: {new Date(m.deadline).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs font-semibold text-gray-700 mb-2">언제 알림을 받을까요?</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {REMINDS.map(opt => (
                            <button key={opt} onClick={() => toggleRemind(m.id, opt)}
                              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                rs.has(opt) ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-700'
                              }`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          }
        </div>
      </div>
    </div>
  );
}
