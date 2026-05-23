import { useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, getUserData, setUserData } from './firebase';
import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import Home from './pages/Home';
import Timetable from './pages/Timetable';
import CampusMap from './pages/CampusMap';
import Portfolio from './pages/Portfolio';
import Memo from './pages/Memo';
import AIRecommend from './pages/AIRecommend';

const PAGE_TITLES = {
  home: '홈',
  timetable: '시간표',
  map: '캠퍼스 지도',
  portfolio: '포트폴리오',
  memo: '강의 메모',
  ai: 'AI 도구 추천',
};

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

function LoginPage({ onLogin, loginError, loading }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">D</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">DJU Life</h1>
          <p className="text-gray-500 text-sm mt-1">대진대학교 캠퍼스 앱</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
            Google 계정으로 로그인하면<br />
            시간표, 메모, 포트폴리오를<br />
            클라우드에 저장할 수 있습니다.
          </p>

          <button
            onClick={onLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            {loading ? '로그인 중…' : 'Google로 로그인'}
          </button>

          {loginError && (
            <p className="text-xs text-red-500 text-center mt-3">{loginError}</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          로그인하지 않으면 앱을 사용할 수 없습니다.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [classes, setClasses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dju_classes')) || []; } catch { return []; }
  });

  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]   = useState('');
  const userRef = useRef(null);

  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [notifBanner, setNotifBanner] = useState(false);

  /* ── Firebase auth listener ─────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        userRef.current = u;
        setUser(u);
        if (u) {
          const data = await getUserData(u.uid);
          if (data?.classes != null) {
            setClasses(data.classes);
          } else {
            // Firestore 문서 없음 — localStorage 데이터를 초기 시드로 업로드
            const local = (() => {
              try { return JSON.parse(localStorage.getItem('dju_classes')) || []; } catch { return []; }
            })();
            if (local.length > 0) setUserData(u.uid, { classes: local }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Auth 상태 처리 오류:', e);
      } finally {
        // 오류가 발생해도 반드시 로딩 해제
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  /* ── Persist classes (localStorage + Firestore) ──────── */
  useEffect(() => {
    localStorage.setItem('dju_classes', JSON.stringify(classes));
    if (userRef.current) {
      setUserData(userRef.current.uid, { classes });
    }
  }, [classes]);

  /* ── Google Sign-In ──────────────────────────────────── */
  async function signInWithGoogle() {
    setLoginError('');
    setLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Google login error:', e);
      setLoginError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    userRef.current = null;
  }

  /* ── Browser notification permission ────────────────── */
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const p = Notification.permission;
    if (p === 'default') {
      Notification.requestPermission().then(result => {
        setNotifPerm(result);
        if (result === 'denied') setNotifBanner(true);
      });
    } else {
      setNotifPerm(p);
      if (p === 'denied') setNotifBanner(true);
    }
  }, []);

  /* ── Class start notifications (10 min before) ───────── */
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const today = DAYS_KR[new Date().getDay()];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const timers = classes
      .filter(c => c.days.includes(today))
      .flatMap(c => {
        const dayStart = c.daySchedules?.[today]?.start ?? c.start ?? 9;
        const fireMin = dayStart * 60 - 10;
        const delay = (fireMin - nowMin) * 60000;
        if (delay <= 0) return [];
        return [setTimeout(() => {
          new Notification(`곧 수업 시작! ${c.name}`, {
            body: [c.building, c.room ? `${c.room}호` : ''].filter(Boolean).join(' '),
            tag: `class_${c.id}_${today}`,
            icon: '/favicon.ico',
          });
        }, delay)];
      });
    return () => timers.forEach(clearTimeout);
  }, [classes, notifPerm]);

  /* ── Auth loading screen ─────────────────────────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center shadow">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <span className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
          <p className="text-xs text-gray-400">로그인 상태 확인 중…</p>
        </div>
      </div>
    );
  }

  /* ── Login page when not authenticated ──────────────── */
  if (!user) {
    return (
      <LoginPage
        onLogin={signInWithGoogle}
        loginError={loginError}
        loading={loginLoading}
      />
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={setPage} userName={user.displayName} classes={classes}
                     notifPerm={notifPerm}
                     onRequestNotif={() => Notification.requestPermission().then(p => setNotifPerm(p))} />;
      case 'timetable': return <Timetable classes={classes} setClasses={setClasses} />;
      case 'map':       return <CampusMap classes={classes} />;
      case 'portfolio': return <Portfolio user={user} />;
      case 'memo':      return <Memo classes={classes} user={user} onBack={() => setPage('home')} />;
      case 'ai':        return <AIRecommend />;
      default:
        return <Home onNavigate={setPage} userName={user.displayName} classes={classes} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar
        active={page}
        onChange={setPage}
        user={user}
        onLogout={handleSignOut}
      />

      <main className="md:ml-40 min-h-screen pb-16 md:pb-0">
        <div className="md:hidden bg-navy sticky top-0 z-30 flex items-center px-4 h-12 gap-1">
          <span className="flex-1 text-sm font-bold text-white">{PAGE_TITLES[page]}</span>
          <button
            onClick={() => setPage('memo')}
            className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-lg hover:bg-white/25 transition-colors"
            aria-label="메모"
          >
            ✎
          </button>
          <button
            onClick={handleSignOut}
            className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors overflow-hidden"
            aria-label="로그아웃"
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <span className="text-base">👤</span>
            }
          </button>
        </div>
        {renderPage()}
      </main>

      <BottomTabBar active={page} onChange={setPage} />

{notifBanner && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-yellow-50 border border-yellow-200 rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3">
          <span className="text-lg mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-800">수업 알림이 차단되어 있습니다</p>
            <p className="text-xs text-yellow-600 mt-0.5">브라우저 주소창 자물쇠 아이콘 → 알림 → 허용으로 변경해주세요.</p>
          </div>
          <button onClick={() => setNotifBanner(false)} className="text-yellow-400 text-xl leading-none ml-1 flex-shrink-0">×</button>
        </div>
      )}

      <button
        onClick={() => setPage('memo')}
        className="hidden md:flex fixed top-3 right-4 z-50 w-10 h-10 rounded-full bg-navy text-white shadow-lg items-center justify-center text-lg hover:opacity-90 transition-opacity"
        aria-label="메모"
      >
        ✎
      </button>
    </div>
  );
}
