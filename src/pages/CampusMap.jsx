import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

const CAMPUS = { lat: 37.8713541, lng: 127.1539286 };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const BUILDINGS = [
  { name: '학생회관',               lat: 37.871202,  lng: 127.155117  },
  { name: '인문학관',               lat: 37.8719186, lng: 127.1564943 },
  { name: '국제학관',               lat: 37.8707499, lng: 127.1560735 },
  { name: '사회과학관',             lat: 37.8712763, lng: 127.1573409 },
  { name: '대학원',                 lat: 37.8703342, lng: 127.1567767 },
  { name: '교수연구동',             lat: 37.8710008, lng: 127.1583321 },
  { name: '파워플랜트',             lat: 37.870723,  lng: 127.158832  },
  { name: '대진교육관',             lat: 37.8704067, lng: 127.1586073 },
  { name: '교수회관',               lat: 37.8699731, lng: 127.1574711 },
  { name: '본관',                   lat: 37.8694732, lng: 127.1583877 },
  { name: '박물관',                 lat: 37.8727904, lng: 127.1573514 },
  { name: '정보전산원',             lat: 37.8728079, lng: 127.1555989 },
  { name: '이공학관 다동',          lat: 37.8740471, lng: 127.1562083 },
  { name: '이공학관 가동',          lat: 37.87472,   lng: 127.1553    },
  { name: '이공학관 나동',          lat: 37.8743116, lng: 127.1558078 },
  { name: '간호학과',               lat: 37.8747183, lng: 127.1552737 },
  { name: '중앙도서관',             lat: 37.8734401, lng: 127.1549459 },
  { name: '음악학관',               lat: 37.8765911, lng: 127.1572562 },
  { name: '생활과학관',             lat: 37.876389,  lng: 127.1581097 },
  { name: '예술관',                 lat: 37.8751114, lng: 127.1599429 },
  { name: '소운동장 (테니스장 옆)', lat: 37.8755731, lng: 127.1585962 },
  { name: '체육관',                 lat: 37.8676956, lng: 127.156499  },
  { name: '대운동장',               lat: 37.8670929, lng: 127.1582954 },
  { name: '버스 정류장',            lat: 37.871787,  lng: 127.154955  },
].map((b, i) => ({ ...b, id: String(i) }));

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function walkMin(m) { return Math.ceil(m / 80); }
function fmtDist(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`; }

function buildingInfoHTML(b) {
  return `<div style="padding:12px 16px;min-width:160px;font-family:-apple-system,sans-serif;line-height:1.5">
    <p style="font-weight:700;font-size:14px;color:#1F3864;margin:0 0 10px">${b.name}</p>
    <button onclick="window.__mapSetDest('${b.id}')"
      style="padding:5px 14px;background:#1F3864;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%">
      목적지 설정
    </button>
  </div>`;
}

function makeMyPosEl() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:20px;height:20px;';
  wrap.innerHTML = `
    <div style="position:absolute;inset:0;border-radius:50%;background:#1F3864;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.3);z-index:1"></div>
    <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(31,56,100,.2);animation:mapPing 1.5s ease-in-out infinite"></div>`;
  return wrap;
}

export default function CampusMap({ classes = [] }) {
  const mapRef = useRef(null);
  const K      = useRef({});
  // K: { map, myOverlay, destMarker, routeLine, openIw, watchId, notifSent }

  const [loaded,    setLoaded]    = useState(false);
  const [mapError,  setMapError]  = useState(null);
  const [myPos,     setMyPos]     = useState(null);
  const [geoError,  setGeoError]  = useState(null);
  const [dest,      setDest]      = useState(null);
  const [distance,  setDistance]  = useState(null);
  const [arrived,   setArrived]   = useState(false);
  const [notifPerm, setNotifPerm] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const nextClassInfo = useMemo(() => {
    const today = DAYS[now.getDay()];
    const curHour = now.getHours() + now.getMinutes() / 60;
    const next = classes
      .filter(c => c.days.includes(today) && (c.daySchedules?.[today]?.start ?? c.start ?? 9) > curHour)
      .sort((a, b) => (a.daySchedules?.[today]?.start ?? a.start ?? 9) - (b.daySchedules?.[today]?.start ?? b.start ?? 9))[0];
    if (!next) return null;
    const nextStart = next.daySchedules?.[today]?.start ?? next.start ?? 9;
    const minsUntil = Math.round((nextStart - curHour) * 60);
    const building = next.building ? (BUILDINGS.find(b => b.name === next.building) ?? null) : null;
    return { cls: next, minsUntil, building };
  }, [classes, now]);

  const nextBuilding = nextClassInfo?.building ?? null;

  /* ── Geolocation: 지도와 독립적으로 분리 ── */
  const startGeo = useCallback(() => {
    if (!navigator.geolocation) { setGeoError('unsupported'); return; }
    // 기존 watch 정리 후 재시작 (retry 지원)
    if (K.current.watchId != null) {
      navigator.geolocation.clearWatch(K.current.watchId);
      K.current.watchId = null;
    }
    setGeoError(null);
    K.current.watchId = navigator.geolocation.watchPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => setMyPos({ lat, lng }),
      (err) => setGeoError(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, []);

  /* ── 지도 초기화 ── */
  useEffect(() => {
    if (K.current.map) return;

    let pollTimer = null;
    let cancelled = false;

    function initMap() {
      if (cancelled || K.current.map || !mapRef.current) return;
      try {
        const Maps = window.kakao.maps;
        const map  = new Maps.Map(mapRef.current, {
          center: new Maps.LatLng(CAMPUS.lat, CAMPUS.lng),
          level: 4,
        });
        K.current.map = map;

        BUILDINGS.forEach(b => {
          const marker = new Maps.Marker({ position: new Maps.LatLng(b.lat, b.lng), map });
          const iw     = new Maps.InfoWindow({ content: buildingInfoHTML(b), removable: true });
          Maps.event.addListener(marker, 'click', () => {
            K.current.openIw?.close();
            iw.open(map, marker);
            K.current.openIw = iw;
          });
        });

        if (cancelled) return;
        setLoaded(true);
        startGeo(); // 지도 준비 완료 후 위치 요청
      } catch (e) {
        if (!cancelled) {
          setMapError('지도 초기화 실패: ' + e.message);
          setLoaded(true);
        }
      }
    }

    let elapsed = 0;
    function poll() {
      if (cancelled) return;
      if (window.kakao?.maps) { initMap(); return; }
      elapsed += 200;
      if (elapsed >= 10000) {
        setMapError(
          'SDK 로딩 실패. 아래 사항을 확인하세요:\n' +
          '① 카카오 개발자 콘솔 → 내 앱 → 플랫폼 → Web\n' +
          '② 사이트 도메인에 http://localhost:3000 추가\n' +
          '③ JavaScript 키 사용 여부 확인'
        );
        setLoaded(true);
        return;
      }
      pollTimer = setTimeout(poll, 200);
    }
    poll();

    const kRef = K.current;
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      if (kRef.watchId != null) {
        navigator.geolocation.clearWatch(kRef.watchId);
        kRef.watchId = null;
      }
      // Detach all Kakao overlays before unmount to prevent removeChild errors
      // when Kakao SDK tries to manipulate DOM nodes React has already removed
      try { kRef.openIw?.close(); } catch (_) {}
      try { kRef.myOverlay?.setMap(null); } catch (_) {}
      try { kRef.destMarker?.setMap(null); } catch (_) {}
      try { kRef.routeLine?.setMap(null); } catch (_) {}
    };
  }, [startGeo]);

  /* ── myPos 변경 시 파란 점 오버레이 갱신 ── */
  useEffect(() => {
    if (!loaded || !myPos || !K.current.map || !window.kakao?.maps) return;
    const Maps = window.kakao.maps;
    const ll = new Maps.LatLng(myPos.lat, myPos.lng);
    if (!K.current.myOverlay) {
      K.current.myOverlay = new Maps.CustomOverlay({
        position: ll, content: makeMyPosEl(),
        yAnchor: 0.5, xAnchor: 0.5, zIndex: 10,
      });
      K.current.myOverlay.setMap(K.current.map);
      K.current.map.panTo(ll);
    } else {
      K.current.myOverlay.setPosition(ll);
    }
  }, [myPos, loaded]);

  /* ── InfoWindow 버튼 → React setDest ── */
  useEffect(() => {
    window.__mapSetDest = id => {
      K.current.openIw?.close();
      setDest(BUILDINGS.find(b => b.id === id) ?? null);
    };
    return () => { delete window.__mapSetDest; };
  }, []);

  /* ── 다음 수업 건물 자동 목적지 ── */
  useEffect(() => {
    if (nextBuilding && !dest) setDest(nextBuilding);
  }, [nextBuilding]); // eslint-disable-line

  /* ── 직선 경로 표시 + 도착 감지 ── */
  useEffect(() => {
    const Maps = window.kakao?.maps;
    if (!loaded || !Maps || !K.current.map) return;

    K.current.routeLine?.setMap(null);
    K.current.destMarker?.setMap(null);
    K.current.routeLine  = null;
    K.current.destMarker = null;
    setDistance(null);

    if (!dest) { setArrived(false); return; }

    K.current.destMarker = new Maps.Marker({
      position: new Maps.LatLng(dest.lat, dest.lng),
      map: K.current.map,
    });

    if (!myPos) return;

    K.current.routeLine = new Maps.Polyline({
      path: [new Maps.LatLng(myPos.lat, myPos.lng), new Maps.LatLng(dest.lat, dest.lng)],
      strokeWeight: 4, strokeColor: '#1F3864', strokeOpacity: 0.7, strokeStyle: 'dashed',
    });
    K.current.routeLine.setMap(K.current.map);

    const dist = haversine(myPos.lat, myPos.lng, dest.lat, dest.lng);
    setDistance(dist);

    if (dist < 50) {
      if (!K.current.notifSent) {
        K.current.notifSent = true;
        setArrived(true);
        if (Notification.permission === 'granted')
          new Notification(`${dest.name} 도착!`);
      }
    } else {
      K.current.notifSent = false;
      setArrived(false);
    }
  }, [dest, myPos, loaded]);

  const requestNotif = async () => setNotifPerm(await Notification.requestPermission());

  const selectDest = b => {
    const next = dest?.id === b.id ? null : b;
    setDest(next);
    if (next && K.current.map && window.kakao?.maps)
      K.current.map.panTo(new window.kakao.maps.LatLng(b.lat, b.lng));
  };

  const kakaoNavUrl = dest
    ? `https://map.kakao.com/link/to/${encodeURIComponent(dest.name)},${dest.lat},${dest.lng}`
    : null;

  const filtered = BUILDINGS.filter(b => !search || b.name.includes(search));

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800">캠퍼스 지도</h2>

      {/* 목적지 + 길찾기 바 */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 min-w-0">
          {dest ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">목적지</p>
                <p className="text-sm font-bold text-navy truncate">{dest.name}</p>
                {distance !== null && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtDist(distance)} · 도보 약 {walkMin(distance)}분
                  </p>
                )}
              </div>
              {arrived && (
                <span className="text-xs font-bold text-white bg-green-500 px-3 py-1 rounded-full flex-shrink-0">도착!</span>
              )}
              <button onClick={() => { setDest(null); setDistance(null); setArrived(false); }}
                className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0">✕</button>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              {nextBuilding ? `다음 수업: ${nextBuilding.name}` : '아래 건물 목록에서 목적지를 선택하세요'}
            </p>
          )}
        </div>

        {/* 카카오맵 길찾기 버튼 */}
        {kakaoNavUrl && (
          <a
            href={kakaoNavUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-yellow-400 hover:bg-yellow-500 transition-colors rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span className="text-base leading-none">🗺️</span>
            <span className="text-sm font-semibold text-gray-900">카카오맵 길찾기</span>
          </a>
        )}

        {notifPerm === 'default' && (
          <button onClick={requestNotif}
            className="bg-white rounded-xl shadow-sm px-4 py-3 text-sm font-semibold text-navy hover:shadow-md transition-shadow whitespace-nowrap">
            🔔 도착 알림
          </button>
        )}
        {notifPerm === 'granted' && (
          <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center gap-1.5">
            <span className="text-sm">🔔</span>
            <span className="text-xs font-medium text-green-700">알림 설정됨</span>
          </div>
        )}
      </div>

      {/* 다음 수업 자동 경로 안내 배너 (20분 전부터 표시) */}
      {nextClassInfo && nextClassInfo.minsUntil > 0 && nextClassInfo.minsUntil <= 20 && (
        <div className={`rounded-xl border p-4 ${
          nextClassInfo.minsUntil <= 10 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  nextClassInfo.minsUntil <= 10 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {nextClassInfo.minsUntil}분 후
                </span>
                <span className="text-xs text-gray-500 font-medium">수업 시작</span>
              </div>
              <p className="text-sm font-bold text-gray-900 truncate">{nextClassInfo.cls.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[nextClassInfo.cls.building, nextClassInfo.cls.room ? `${nextClassInfo.cls.room}호` : ''].filter(Boolean).join(' ')}
              </p>
            </div>
            {nextClassInfo.building ? (
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(nextClassInfo.cls.building)},${nextClassInfo.building.lat},${nextClassInfo.building.lng}`}
                target="_blank"
                rel="noreferrer"
                className={`flex-shrink-0 rounded-lg px-3 py-2.5 text-xs font-bold text-gray-900 flex items-center gap-1.5 transition-colors ${
                  nextClassInfo.minsUntil <= 10
                    ? 'bg-red-400 hover:bg-red-500 text-white'
                    : 'bg-yellow-400 hover:bg-yellow-500'
                }`}
              >
                <span>🗺️</span>
                <span>카카오맵 길찾기</span>
              </a>
            ) : (
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(nextClassInfo.cls.building || nextClassInfo.cls.name)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-500 transition-colors rounded-lg px-3 py-2.5 text-xs font-bold text-gray-900 flex items-center gap-1.5"
              >
                <span>🗺️</span>
                <span>카카오맵 검색</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 지도 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative" style={{ height: 420 }}>
        <div ref={mapRef} className="w-full h-full" />

        {!loaded && !mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50">
            <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">지도를 불러오는 중...</p>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
            <span className="text-4xl">🗺️</span>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">지도를 불러올 수 없습니다</p>
              {mapError.split('\n').map((line, i) => (
                <p key={i} className="text-xs text-gray-500 leading-relaxed">{line}</p>
              ))}
            </div>
            <a href="https://developers.kakao.com/console/app" target="_blank" rel="noreferrer"
              className="text-xs font-semibold text-white bg-navy px-4 py-2 rounded-lg hover:opacity-90">
              카카오 개발자 콘솔 열기
            </a>
          </div>
        )}

        {loaded && !mapError && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm flex flex-col gap-1.5 text-xs pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-navy border-2 border-white shadow-sm" />
              <span className="text-gray-600">현재 위치</span>
            </div>
            {dest && myPos && (
              <div className="flex items-center gap-2">
                <svg width="14" height="4" viewBox="0 0 14 4">
                  <line x1="0" y1="2" x2="14" y2="2" stroke="#1F3864" strokeWidth="2" strokeDasharray="3 2"/>
                </svg>
                <span className="text-gray-600">직선 거리</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 위치 권한 상태 안내 */}
      {geoError && (
        <div className={`border rounded-xl px-4 py-3 flex gap-3 ${
          geoError === 'denied'
            ? 'bg-red-50 border-red-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <span className={`flex-shrink-0 mt-0.5 ${geoError === 'denied' ? 'text-red-500' : 'text-orange-500'}`}>⚠</span>
          <div className="flex-1 min-w-0">
            {geoError === 'denied' ? (
              <>
                <p className="text-sm font-semibold text-red-800">위치 권한이 거부되어 있습니다</p>
                <p className="text-xs text-red-600 mt-0.5">
                  브라우저 주소창 왼쪽 자물쇠 아이콘 → <strong>위치</strong> → <strong>허용</strong> 으로 변경 후 새로고침 하세요.
                </p>
              </>
            ) : geoError === 'unsupported' ? (
              <p className="text-sm font-semibold text-orange-800">이 브라우저는 위치 기능을 지원하지 않습니다</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-orange-800">현재 위치를 가져올 수 없습니다</p>
                <button
                  onClick={startGeo}
                  className="text-xs font-semibold text-orange-700 underline mt-1"
                >
                  다시 시도
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 위치 찾는 중 / 위치 허용 유도 */}
      {!geoError && loaded && !myPos && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">현재 위치를 찾고 있습니다…</p>
            <p className="text-xs text-blue-600 mt-0.5">브라우저 팝업에서 <strong>위치 허용</strong>을 선택하세요.</p>
          </div>
          <button
            onClick={startGeo}
            className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            위치 요청
          </button>
        </div>
      )}

      {/* 건물 목록 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-sm font-bold text-gray-700 flex-1">주요 건물</p>
          <div className="relative">
            <input placeholder="건물명 검색" value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs w-32 focus:outline-none focus:border-navy" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(b => {
            const isDest = dest?.id === b.id;
            const isNext = nextBuilding?.id === b.id;
            const dist   = myPos ? haversine(myPos.lat, myPos.lng, b.lat, b.lng) : null;
            return (
              <button key={b.id} onClick={() => selectDest(b)}
                className={`rounded-xl px-4 py-3 text-left transition-all relative ${
                  isDest ? 'bg-navy shadow-md ring-2 ring-navy/20' : 'bg-gray-50 hover:bg-blue-50'
                }`}>
                {isNext && !isDest && (
                  <span className="absolute top-2 right-2 text-xs bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full">
                    다음
                  </span>
                )}
                <p className={`text-sm font-bold leading-tight ${isDest ? 'text-white' : 'text-gray-800'}`}>{b.name}</p>
                {dist !== null && (
                  <p className={`text-xs mt-1.5 font-semibold ${isDest ? 'text-white/80' : 'text-navy'}`}>
                    {fmtDist(dist)} · {walkMin(dist)}분
                  </p>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-300 mt-4 text-center">
          건물 위치는 실제와 다를 수 있습니다 · 마커 클릭 시 목적지 설정
        </p>
      </div>
    </div>
  );
}
