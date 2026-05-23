import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserData, setUserData } from '../firebase';

const KEY = 'dju_memos';
const REMIND_OPTS = ['3일 전', '1일 전', '6시간 전', '1시간 전'];
const OFFSETS_MS = {
  '3일 전':   3 * 24 * 3600 * 1000,
  '1일 전':   1 * 24 * 3600 * 1000,
  '6시간 전': 6 * 3600 * 1000,
  '1시간 전': 1 * 3600 * 1000,
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(memos) {
  localStorage.setItem(KEY, JSON.stringify(memos));
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '방금 전';
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function dDay(deadlineStr) {
  if (!deadlineStr) return null;
  const diff = new Date(deadlineStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return 'D+' + Math.abs(days);
  if (days === 0) return 'D-Day';
  return 'D-' + days;
}

const EMPTY_FORM = { courseId: '', content: '', deadline: '', reminders: [] };

export default function Memo({ classes, user, onBack }) {
  const [memos, setMemos] = useState(load);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notifPerm, setNotifPerm] = useState(Notification.permission);
  const userRef = useRef(null);

  useEffect(() => { userRef.current = user; }, [user]);

  // Load from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    getUserData(user.uid).then(data => {
      if (data?.memos?.length > 0) {
        setMemos(data.memos);
        save(data.memos);
      }
    });
  }, [user]);

  // Save to localStorage + Firestore
  useEffect(() => {
    save(memos);
    if (userRef.current) {
      setUserData(userRef.current.uid, { memos });
    }
  }, [memos]);

  const requestNotif = useCallback(async () => {
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
    }
  }, []);

  // Schedule browser notifications via setTimeout
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const timers = [];
    const now = Date.now();
    memos.forEach(memo => {
      if (!memo.deadline || !memo.reminders?.length) return;
      const deadlineMs = new Date(memo.deadline).getTime();
      memo.reminders.forEach(r => {
        const fireAt = deadlineMs - OFFSETS_MS[r];
        const delay = fireAt - now;
        const firedKey = `${memo.id}_${r}`;
        if (delay > 0 && !memo.firedReminders?.includes(firedKey)) {
          const t = setTimeout(() => {
            new Notification(`📝 ${memo.courseName || '메모'} 마감 알림`, {
              body: `${r} — ${memo.content.slice(0, 60)}`,
              tag: firedKey,
            });
            setMemos(prev => prev.map(m =>
              m.id === memo.id
                ? { ...m, firedReminders: [...(m.firedReminders || []), firedKey] }
                : m
            ));
          }, delay);
          timers.push(t);
        }
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [memos, notifPerm]);

  // courseId는 HTML select가 항상 문자열로 반환하므로 String()으로 통일
  const courseTabs = [
    'all',
    ...Array.from(new Set([
      ...classes.map(c => String(c.id)),
      ...memos.map(m => m.courseId).filter(Boolean).map(String),
    ])),
  ];

  const courseLabel = id => {
    const cls = classes.find(c => String(c.id) === String(id));
    if (cls) return cls.name;
    const memo = memos.find(m => String(m.courseId) === String(id));
    return memo?.courseName || id;
  };

  const visibleMemos = tab === 'all'
    ? memos
    : memos.filter(m => String(m.courseId) === String(tab));

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(memo) {
    setEditId(memo.id);
    setForm({
      courseId: memo.courseId,
      content: memo.content,
      deadline: memo.deadline || '',
      reminders: memo.reminders || [],
    });
    setShowForm(true);
  }

  function handleDelete(id) {
    if (window.confirm('이 메모를 삭제할까요?')) {
      setMemos(prev => prev.filter(m => m.id !== id));
    }
  }

  function toggleReminder(r) {
    setForm(f => ({
      ...f,
      reminders: f.reminders.includes(r)
        ? f.reminders.filter(x => x !== r)
        : [...f.reminders, r],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim()) return;
    const courseObj = classes.find(c => String(c.id) === String(form.courseId));
    if (editId) {
      setMemos(prev => prev.map(m =>
        m.id === editId
          ? { ...m, ...form, courseName: courseObj?.name || m.courseName, firedReminders: [] }
          : m
      ));
    } else {
      const memo = {
        id: Date.now().toString(),
        courseId: form.courseId,
        courseName: courseObj?.name || '',
        content: form.content.trim(),
        deadline: form.deadline || null,
        reminders: form.reminders,
        firedReminders: [],
        createdAt: new Date().toISOString(),
      };
      setMemos(prev => [memo, ...prev]);
    }
    setShowForm(false);
    if (form.reminders.length > 0) requestNotif();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-navy font-bold text-lg leading-none">‹</button>
          )}
          <h1 className="text-xl font-bold text-navy">강의 메모</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl shadow hover:opacity-90 transition-opacity"
        >
          + 메모 추가
        </button>
      </div>

      {/* Course tab filter */}
      {courseTabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {courseTabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                tab === t
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-navy border-navy/30 hover:border-navy'
              }`}
            >
              {t === 'all' ? '전체' : courseLabel(t)}
            </button>
          ))}
        </div>
      )}

      {/* Memo list */}
      {visibleMemos.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-16">
          메모가 없습니다.<br />오른쪽 상단 버튼으로 추가하세요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleMemos.map(memo => {
            const dd = dDay(memo.deadline);
            return (
              <div key={memo.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {memo.courseName && (
                      <span className="inline-block text-xs font-bold text-navy bg-blue-50 px-2 py-0.5 rounded-full mb-1">
                        {memo.courseName}
                      </span>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(memo.createdAt)}</span>
                      {memo.deadline && (
                        <span className="text-xs text-gray-500">
                          마감 {new Date(memo.deadline).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      )}
                      {dd && memo.reminders?.length > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          dd.startsWith('D+') ? 'bg-gray-100 text-gray-500' :
                          dd === 'D-Day' ? 'bg-red-100 text-red-600' :
                          parseInt(dd.replace('D-','')) <= 1 ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {dd} 알림 설정됨
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(memo)}
                      className="text-navy text-xs px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(memo.id)}
                      className="text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div
            className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-navy mb-4">{editId ? '메모 수정' : '메모 추가'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Course select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">강의 선택</label>
                <select
                  value={form.courseId}
                  onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                >
                  <option value="">강의 없음 (일반 메모)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">내용 <span className="text-red-400">*</span></label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="메모 내용을 입력하세요"
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none"
                  required
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">마감 날짜/시간</label>
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => {
                    setForm(f => ({ ...f, deadline: e.target.value, reminders: e.target.value ? f.reminders : [] }));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              </div>

              {/* Reminders */}
              {form.deadline && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">알림 시점 선택</label>
                  <div className="flex flex-wrap gap-2">
                    {REMIND_OPTS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleReminder(r)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          form.reminders.includes(r)
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white text-navy border-navy/30 hover:border-navy'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {form.reminders.length > 0 && notifPerm !== 'granted' && (
                    <p className="text-xs text-orange-500 mt-2">
                      알림을 받으려면 브라우저 알림 권한이 필요합니다. 저장 시 자동으로 요청됩니다.
                    </p>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-navy text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  {editId ? '수정 완료' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
