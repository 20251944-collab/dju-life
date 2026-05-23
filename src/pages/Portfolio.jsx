import { useState, useEffect, useRef } from 'react';
import { getUserData, setUserData } from '../firebase';

const KEY = 'dju_portfolio';
const DEFAULTS = {
  certs: [],
  awards: [],
  activities: [],
  projects: [],
  languages: [],
  jobTarget: { role: '', industry: '', desc: '' },
};

const EMPTY_FORMS = {
  certs:      { name: '', issuer: '', grade: '', date: '' },
  awards:     { name: '', org: '', date: '', desc: '' },
  activities: { name: '', org: '', period: '', role: '' },
  projects:   { name: '', period: '', role: '', stack: '', desc: '' },
  languages:  { lang: '', test: '', score: '', date: '' },
};

const SECTION_META = [
  {
    key: 'certs',
    label: '자격증',
    icon: '🏅',
    fields: [
      { key: 'name',   label: '자격증명',   placeholder: '정보처리기사', required: true },
      { key: 'issuer', label: '발급 기관',   placeholder: '한국산업인력공단' },
      { key: 'grade',  label: '등급/점수',   placeholder: '1급, 900점 등 (선택)' },
      { key: 'date',   label: '취득 날짜',   type: 'date' },
    ],
    summary: item => [item.name, item.issuer, item.grade, item.date].filter(Boolean).join(' · '),
  },
  {
    key: 'awards',
    label: '수상 이력',
    icon: '🏆',
    fields: [
      { key: 'name', label: '수상명',     placeholder: '교내 해커톤 최우수상', required: true },
      { key: 'org',  label: '주최 기관',  placeholder: '대진대학교' },
      { key: 'date', label: '수상일',     type: 'date' },
      { key: 'desc', label: '설명',       placeholder: '간단한 수상 내용 (선택)', textarea: true },
    ],
    summary: item => [item.name, item.org, item.date].filter(Boolean).join(' · '),
  },
  {
    key: 'activities',
    label: '대외 활동',
    icon: '🌐',
    fields: [
      { key: 'name',   label: '활동명',       placeholder: '교내 멘토링 프로그램', required: true },
      { key: 'org',    label: '기관/단체',     placeholder: '대진대학교 취업지원팀' },
      { key: 'period', label: '활동 기간',     placeholder: '2024.03 ~ 2024.08' },
      { key: 'role',   label: '역할/내용',     placeholder: '활동 내용 간략 기술 (선택)', textarea: true },
    ],
    summary: item => [item.name, item.org, item.period].filter(Boolean).join(' · '),
  },
  {
    key: 'projects',
    label: '프로젝트',
    icon: '💻',
    fields: [
      { key: 'name',   label: '프로젝트명', placeholder: 'DJU Life 캠퍼스 앱', required: true },
      { key: 'period', label: '기간',        placeholder: '2024.09 ~ 2025.02' },
      { key: 'role',   label: '역할',        placeholder: '프론트엔드 개발' },
      { key: 'stack',  label: '기술 스택',   placeholder: 'React, Tailwind CSS, Kakao Maps API' },
      { key: 'desc',   label: '프로젝트 설명', placeholder: '프로젝트 개요 및 성과', textarea: true },
    ],
    summary: item => [item.name, item.period, item.role].filter(Boolean).join(' · '),
  },
  {
    key: 'languages',
    label: '어학',
    icon: '🗣️',
    fields: [
      { key: 'lang',  label: '언어',      placeholder: '영어', required: true },
      { key: 'test',  label: '시험명',    placeholder: 'TOEIC, JLPT, HSK 등' },
      { key: 'score', label: '점수/등급', placeholder: '900, N2, 5급 등' },
      { key: 'date',  label: '취득일',    type: 'date' },
    ],
    summary: item => [item.lang, item.test, item.score, item.date].filter(Boolean).join(' · '),
  },
];

const FREE_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved) return { ...DEFAULTS };
    return {
      certs:      saved.certs      || [],
      awards:     saved.awards     || [],
      activities: saved.activities || [],
      projects:   saved.projects   || [],
      languages:  saved.languages  || [],
      jobTarget:  { ...DEFAULTS.jobTarget, ...(saved.jobTarget || {}) },
    };
  } catch { return { ...DEFAULTS }; }
}

function buildPrompt(data) {
  const { jobTarget, certs, awards, activities, projects, languages } = data;
  const lines = [
    '당신은 한국 취업 전문가입니다. 아래 지원자의 스펙을 분석하여 희망 직무에 맞는 자기소개 형태의 포트폴리오 텍스트 초안을 한국어로 작성해주세요.',
    '희망 직무에서 요구하는 역량을 중심으로 각 항목을 강조하고, 자연스럽고 전문적인 문체로 3~5개 문단으로 구성해주세요.\n',
  ];
  if (jobTarget.role || jobTarget.industry)
    lines.push(`[희망 직무] ${jobTarget.role || '미입력'} / 업종: ${jobTarget.industry || '미입력'}`);
  if (jobTarget.desc)
    lines.push(`[본인 메모] ${jobTarget.desc}`);
  if (certs.length)
    lines.push('\n[자격증]\n' + certs.map(c =>
      '- ' + [c.name, c.issuer, c.grade, c.date].filter(Boolean).join(', ')
    ).join('\n'));
  if (awards.length)
    lines.push('\n[수상 이력]\n' + awards.map(a =>
      '- ' + [a.name, a.org, a.date, a.desc].filter(Boolean).join(', ')
    ).join('\n'));
  if (activities.length)
    lines.push('\n[대외 활동]\n' + activities.map(a =>
      '- ' + [a.name, a.org, a.period, a.role].filter(Boolean).join(', ')
    ).join('\n'));
  if (projects.length)
    lines.push('\n[프로젝트]\n' + projects.map(p =>
      '- ' + [p.name, p.period, p.role, p.stack, p.desc].filter(Boolean).join(', ')
    ).join('\n'));
  if (languages.length)
    lines.push('\n[어학]\n' + languages.map(l =>
      '- ' + [l.lang, l.test, l.score, l.date].filter(Boolean).join(', ')
    ).join('\n'));
  lines.push('\n위 정보를 바탕으로 희망 직무와 연관성이 높은 역량을 우선 강조하여 포트폴리오 자기소개 초안을 한국어로 작성해주세요. 마크다운 없이 일반 텍스트로만 작성해주세요.');
  return lines.join('\n');
}

function SectionCard({ meta, items, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <span className="font-bold text-navy text-sm">{meta.label}</span>
          {items.length > 0 && (
            <span className="text-xs bg-navy/10 text-navy font-semibold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          className="text-xs font-semibold text-navy border border-navy/30 px-3 py-1 rounded-lg hover:bg-navy hover:text-white transition-colors"
        >
          + 추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">아직 입력된 항목이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(item => (
            <li key={item.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-700 leading-relaxed flex-1">{meta.summary(item)}</p>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onEdit(item)}
                  className="text-xs text-navy px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-red-400 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormModal({ meta, formData, setFormData, editId, onClose, onSave }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-navy mb-4">
          {meta.icon} {meta.label} {editId ? '수정' : '추가'}
        </h2>

        <div className="flex flex-col gap-3">
          {meta.fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {f.label}
                {f.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {f.textarea ? (
                <textarea
                  rows={3}
                  value={formData[f.key] || ''}
                  onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={formData[f.key] || ''}
                  onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="flex-1 bg-navy text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            {editId ? '수정 완료' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({ user }) {
  const [data, setData] = useState(loadData);
  const [activeSection, setActiveSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [editId, setEditId] = useState(null);
  const userRef = useRef(null);

  // AI generation state
  const [showAI, setShowAI] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { userRef.current = user; }, [user]);

  // Load from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    getUserData(user.uid).then(fsData => {
      if (fsData?.portfolio && Object.keys(fsData.portfolio).length > 0) {
        const merged = { ...DEFAULTS, ...fsData.portfolio };
        setData(merged);
        localStorage.setItem(KEY, JSON.stringify(merged));
      }
    });
  }, [user]);

  // Save to localStorage + Firestore
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
    if (userRef.current) {
      setUserData(userRef.current.uid, { portfolio: data });
    }
  }, [data]);

  async function generatePortfolio() {
    const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
    if (!apiKey) {
      setAiError('.env 파일에 REACT_APP_OPENROUTER_API_KEY가 설정되지 않았습니다.');
      setAiText('');
      return;
    }
    const totalItems = SECTION_META.reduce((sum, m) => sum + data[m.key].length, 0);
    if (totalItems === 0 && !data.jobTarget.role && !data.jobTarget.desc) {
      setAiError('스펙을 먼저 입력한 후 AI 생성을 시도해주세요.');
      setAiText('');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiText('');
    setAiModel('');
    setShowAI(true);

    const prompt = buildPrompt(data);
    let lastError = '알 수 없는 오류';

    for (const model of FREE_MODELS) {
      setAiModel(model);
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'DJU Life Portfolio',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
          }),
        });

        const json = await res.json().catch(() => ({}));

        // OpenRouter may return 200 but with an error body (e.g. "Provider returned error")
        if (json?.error) {
          lastError = json.error.message || JSON.stringify(json.error);
          continue;
        }
        if (!res.ok) {
          lastError = `서버 오류 (${res.status})`;
          continue;
        }

        const text = json.choices?.[0]?.message?.content;
        if (!text) {
          lastError = '응답이 비어있습니다.';
          continue;
        }

        setAiText(text.trim());
        setAiLoading(false);
        return;
      } catch (err) {
        lastError = err.message;
        // network error — try next model
      }
    }

    // All models exhausted
    setAiError(`모든 모델에서 생성에 실패했습니다.\n마지막 오류: ${lastError}\n\n잠시 후 다시 시도해주세요.`);
    setAiLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(aiText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openAdd(sectionKey) {
    setEditId(null);
    setFormData({ ...EMPTY_FORMS[sectionKey] });
    setActiveSection(sectionKey);
  }

  function openEdit(sectionKey, item) {
    setEditId(item.id);
    setFormData({ ...item });
    setActiveSection(sectionKey);
  }

  function closeForm() {
    setActiveSection(null);
    setFormData({});
    setEditId(null);
  }

  function saveItem() {
    const meta = SECTION_META.find(m => m.key === activeSection);
    const requiredField = meta.fields.find(f => f.required)?.key;
    if (requiredField && !formData[requiredField]?.trim()) return;

    setData(d => {
      const list = d[activeSection];
      const updated = editId
        ? list.map(x => x.id === editId ? { ...formData, id: editId } : x)
        : [{ ...formData, id: Date.now().toString() }, ...list];
      return { ...d, [activeSection]: updated };
    });
    closeForm();
  }

  function deleteItem(sectionKey, id) {
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    setData(d => ({ ...d, [sectionKey]: d[sectionKey].filter(x => x.id !== id) }));
  }

  function updateJobTarget(field, value) {
    setData(d => ({ ...d, jobTarget: { ...d.jobTarget, [field]: value } }));
  }

  const activeMeta = SECTION_META.find(m => m.key === activeSection);
  const totalItems = SECTION_META.reduce((sum, m) => sum + data[m.key].length, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-navy">포트폴리오 빌더</h1>
          <p className="text-xs text-gray-400 mt-0.5">총 {totalItems}개 항목 입력됨</p>
        </div>
        <button
          onClick={generatePortfolio}
          className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow hover:opacity-90 transition-opacity"
        >
          ✨ AI로 생성
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* 희망 직무 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🎯</span>
            <span className="font-bold text-navy text-sm">희망 직무</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">희망 직무</label>
                <input
                  type="text"
                  value={data.jobTarget.role}
                  onChange={e => updateJobTarget('role', e.target.value)}
                  placeholder="프론트엔드 개발자"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">희망 업종</label>
                <input
                  type="text"
                  value={data.jobTarget.industry}
                  onChange={e => updateJobTarget('industry', e.target.value)}
                  placeholder="IT / 소프트웨어"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">자기소개 / 메모</label>
              <textarea
                rows={3}
                value={data.jobTarget.desc}
                onChange={e => updateJobTarget('desc', e.target.value)}
                placeholder="간단한 자기소개나 어필하고 싶은 역량을 적어보세요."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none"
              />
            </div>
          </div>
        </div>

        {/* List sections */}
        {SECTION_META.map(meta => (
          <SectionCard
            key={meta.key}
            meta={meta}
            items={data[meta.key]}
            onAdd={() => openAdd(meta.key)}
            onEdit={item => openEdit(meta.key, item)}
            onDelete={id => deleteItem(meta.key, id)}
          />
        ))}
      </div>

      {/* Form modal */}
      {activeSection && activeMeta && (
        <FormModal
          meta={activeMeta}
          formData={formData}
          setFormData={setFormData}
          editId={editId}
          onClose={closeForm}
          onSave={saveItem}
        />
      )}

      {/* AI result modal */}
      {showAI && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
          onClick={() => { if (!aiLoading) setShowAI(false); }}
        >
          <div
            className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl p-6 flex flex-col"
            style={{ maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-base font-bold text-navy flex items-center gap-2">
                ✨ AI 포트폴리오 초안
              </h2>
              {!aiLoading && (
                <button
                  onClick={() => setShowAI(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
                >
                  ×
                </button>
              )}
            </div>

            {/* Loading */}
            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-9 h-9 border-[3px] border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  AI가 포트폴리오를 작성하고 있습니다…<br />
                  {aiModel && (
                    <span className="text-xs text-gray-400">
                      {aiModel.split('/')[1]?.replace(':free', '')} 시도 중
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Error */}
            {aiError && !aiLoading && (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">⚠️</div>
                <p className="text-sm text-red-500 text-center whitespace-pre-line leading-relaxed">{aiError}</p>
                <button
                  onClick={generatePortfolio}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* Result */}
            {aiText && !aiLoading && (
              <>
                <p className="text-xs text-gray-400 mb-2 flex-shrink-0">
                  아래 내용을 직접 수정한 후 복사해서 사용하세요.
                </p>
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm leading-relaxed focus:outline-none focus:border-purple-400 resize-none overflow-y-auto"
                  style={{ minHeight: '240px' }}
                />
                <div className="flex gap-2 mt-4 flex-shrink-0">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 text-sm font-semibold py-2.5 rounded-xl border transition-colors ${
                      copied
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-purple-500 text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    {copied ? '✓ 복사됨' : '클립보드 복사'}
                  </button>
                  <button
                    onClick={generatePortfolio}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    다시 생성
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
