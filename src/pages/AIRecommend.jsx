import { useState } from 'react';

const TASK_TYPES = [
  { key: 'report',       label: '레포트',  icon: '📝' },
  { key: 'presentation', label: '발표',    icon: '📊' },
  { key: 'coding',       label: '코딩',    icon: '💻' },
  { key: 'design',       label: '디자인',  icon: '🎨' },
  { key: 'video',        label: '영상',    icon: '🎬' },
  { key: 'other',        label: '기타',    icon: '📌' },
];

const TASK_LABELS = {
  report:       '레포트/에세이',
  presentation: '발표/프레젠테이션',
  coding:       '코딩/프로그래밍',
  design:       '디자인/그래픽',
  video:        '영상/편집',
  other:        '기타',
};

const TAG_COLORS = {
  텍스트: 'bg-blue-100 text-blue-700',
  이미지: 'bg-purple-100 text-purple-700',
  코드:   'bg-green-100 text-green-700',
  영상:   'bg-red-100 text-red-700',
  발표:   'bg-orange-100 text-orange-700',
  음성:   'bg-pink-100 text-pink-700',
};

const MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'deepseek/deepseek-chat-v3-0324',
];

async function callModel(model, messages, apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DJU Life',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `API 오류 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchRecommendations(taskType, content) {
  const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

  const system = `당신은 대학생 과제에 적합한 생성형 AI 도구를 추천하는 전문가입니다.
과제 유형과 내용을 보고 가장 유용한 생성형 AI 도구 3~5개를 추천하세요.
반드시 아래 JSON 배열 형식으로만 응답하세요. JSON 외 텍스트는 절대 포함하지 마세요.
[{"name":"도구 이름","description":"주요 특징 1~2문장","reason":"이 과제에 적합한 이유 1~2문장","url":"공식 URL","tag":"텍스트|이미지|코드|영상|발표|음성 중 하나"}]`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `과제 유형: ${TASK_LABELS[taskType]}\n과제 내용: ${content}` },
  ];

  let lastError;
  for (const model of MODELS) {
    try {
      const data = await callModel(model, messages, apiKey);
      const text = data.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('응답 형식을 파싱할 수 없습니다. 다시 시도해주세요.');
      return JSON.parse(match[0]);
    } catch (e) {
      lastError = e;
      // 402(크레딧 고갈), 429(속도 제한), 5xx(서버 오류)만 다음 모델로 폴백
      if (![402, 429, 500, 502, 503].includes(e.status)) throw e;
    }
  }
  throw lastError;
}

function ToolCard({ tool, index }) {
  const tagColor = TAG_COLORS[tool.tag] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-7 h-7 rounded-full bg-navy/10 text-navy font-bold text-xs flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <h3 className="font-bold text-navy text-sm leading-tight">{tool.name}</h3>
        </div>
        {tool.tag && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${tagColor}`}>
            {tool.tag}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{tool.description}</p>

      <div className="bg-navy/5 rounded-xl px-3 py-2">
        <p className="text-[10px] font-semibold text-navy mb-0.5">추천 이유</p>
        <p className="text-xs text-gray-700 leading-relaxed">{tool.reason}</p>
      </div>

      {tool.url && (
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy border border-navy/30 px-3 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-colors self-start"
        >
          🔗 바로가기
        </a>
      )}
    </div>
  );
}

export default function AIRecommend() {
  const [taskType, setTaskType] = useState('report');
  const [content, setContent] = useState('');
  const [tools, setTools] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError(null);
    setTools(null);
    try {
      const result = await fetchRecommendations(taskType, content);
      setTools(result);
    } catch (e) {
      setError(e.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">AI 도구 추천</h1>
        <p className="text-xs text-gray-400 mt-0.5">과제 유형과 내용을 입력하면 적합한 AI 도구를 추천해드립니다</p>
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4 mb-4">
        {/* 과제 유형 */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">과제 유형</p>
          <div className="grid grid-cols-3 gap-2">
            {TASK_TYPES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTaskType(key)}
                className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  taskType === key
                    ? 'bg-navy text-white border-navy'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-navy/40'
                }`}
              >
                <span className="text-base mb-0.5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 과제 내용 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            과제 내용 <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="예: 기후 변화에 대한 5페이지 분량의 레포트입니다. 데이터 분석과 시각화도 필요합니다."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy resize-none"
          />
        </div>

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          className="w-full bg-navy text-white text-sm font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI가 분석 중...
            </>
          ) : (
            '🤖 AI 추천받기'
          )}
        </button>
      </div>

      {/* 오류 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <span className="text-lg mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">오류가 발생했습니다</p>
            <p className="text-xs text-red-500 mt-0.5 break-words">{error}</p>
          </div>
          <button
            onClick={handleSubmit}
            className="text-xs font-semibold text-red-600 border border-red-300 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors shrink-0"
          >
            재시도
          </button>
        </div>
      )}

      {/* 결과 */}
      {tools && tools.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 px-1">추천 도구 {tools.length}개</p>
          {tools.map((tool, i) => (
            <ToolCard key={i} tool={tool} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
