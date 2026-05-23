import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  );

  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function handleInstall() {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1');
      setDismissed(true);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50
                    bg-navy rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
      {/* 아이콘 */}
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-lg">D</span>
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">DJU Life 앱 설치</p>
        <p className="text-xs text-white/60 mt-0.5">홈 화면에 추가하면 더 빠르게 접속해요</p>
      </div>

      {/* 설치 버튼 */}
      <button
        onClick={handleInstall}
        className="shrink-0 bg-white text-navy text-xs font-bold px-3 py-2 rounded-xl
                   hover:bg-blue-50 transition-colors"
      >
        설치
      </button>

      {/* 닫기 */}
      <button
        onClick={handleDismiss}
        className="shrink-0 text-white/40 text-xl leading-none hover:text-white/70 transition-colors"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
