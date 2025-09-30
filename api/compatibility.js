// api/compatibility.js

// ==============================
// // 시드 & 유틸 함수
// ==============================
function getSeed(...parts) {
  const str = parts.join('|');
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed) {
  // xorshift32
  let x = seed || 123456789;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17; x >>>= 0;
  x ^= x << 5;  x >>>= 0;
  return { value: (x >>> 0) / 0xFFFFFFFF, next: x >>> 0 };
}

function pickFromSeeded(arr, seed) {
  const r = seededRand(seed).value;
  const idx = Math.floor(r * arr.length);
  return arr[idx];
}

// ==============================
// // 궁합 점수 분포 로직 (비즈니스 규칙 반영)
//   - 30~50%: 60%
//   - 51~69%: 35%
//   - 70~79%: 10%
//   - 80~89%: 5%
//   - 90%+:   극소(거의 없음) → 아주 낮은 확률로만
// ==============================
function generateScore(seed) {
  let rPack = seededRand(seed);
  const r1 = rPack.value;            // 구간 선택
  rPack = seededRand(rPack.next);
  const r2 = rPack.value;            // 구간 내 세부 위치

  if (r1 < 0.60) {                   // 60%
    return 30 + Math.floor(r2 * 21); // 30~50
  } else if (r1 < 0.95) {            // +35% = 95%
    return 51 + Math.floor(r2 * 19); // 51~69
  } else if (r1 < 0.995) {           // +4.5% ≈ 99.5%
    return 70 + Math.floor(r2 * 10); // 70~79
  } else if (r1 < 0.999) {           // +0.4% ≈ 99.9%
    return 80 + Math.floor(r2 * 10); // 80~89
  } else {                           // ~0.1%
    return 90 + Math.floor(r2 * 10); // 90~99
  }
}

// ==============================
// // 스타일/템플릿 사전 (시드 기반 선택)
// ==============================
const STYLE_MODES = [
  '따뜻한', '담백한', '위트', '시적', '현실조언', '격려', '솔직담백'
];

const EMOJI_BUCKET = {
  low: ['🌧️', '🌫️', '🧩', '🌱'],
  mid: ['🌤️', '🧭', '✨', '🌿'],
  high: ['🌞', '💫', '❤️', '🌈']
};

const HEADLINES = {
  low: [
    '다름 속에서 길 찾기',
    '서로의 속도 맞추기',
    '천천히 익어가는 인연'
  ],
  mid: [
    '조금 다른 퍼즐, 맞춰보기',
    '끌림과 배움 사이',
    '조율하면 더 좋아져요'
  ],
  high: [
    '기분 좋은 호흡',
    '편안히 통하는 신호',
    '맑게 이어지는 연결'
  ]
};

const TIP_TEMPLATES = [
  '오늘은 {name1}가 먼저 감정을 말해보면 좋아요.',
  '만남의 템포를 {name2}에 맞춰보는 하루 어떨까요?',
  '구체적인 약속 1가지를 함께 정해보세요.',
  '감정은 짧게, 행동은 구체적으로. 이 한가지만 기억하세요.',
  '상대의 “좋아하는 것 3개”를 물어보고 데이트에 녹여보세요.',
  '대화의 70%를 “듣기”에 써보면 분위기가 달라져요.'
];

// ==============================
// // 점수→버킷 매핑 및 시각요소
// ==============================
function bucketOf(score) {
  if (score < 51) return 'low';
  if (score < 70) return 'mid';
  if (score < 80) return 'mid';
  if (score < 90) return 'high';
  return 'high';
}

// ==============================
// // OpenAI 요청 빌드 (JSON 포맷 강제)
// ==============================
function buildPrompt({ style, name1, name2, gender1, gender2, birth1, birth2, score }) {
  const system = `당신은 연애사주 상담사입니다.
반드시 JSON만 출력하세요. 마크다운/설명/코드는 금지입니다.
필드: {"percent": number(정수), "headline": string, "summary": string, "strengths": string, "watchouts": string, "oneTip": string}
톤은 "${style}"로 하되 전문용어 없이 간결하게.
문장 수: summary는 1~2문장, strengths/watchouts는 각 1문장, oneTip은 1문장.`;

  const user = `두 사람 정보:
- ${name1} (${gender1}, ${birth1})
- ${name2} (${gender2}, ${birth2})

사전 계산된 궁합 점수: ${score}%
점수에 어울리는 메시지를 써주세요. 점수는 수정하지 마세요.
규칙:
1) headline은 짧고 인상적으로
2) summary는 상황을 따뜻하고 현실적으로 1~2문장
3) strengths엔 잘 맞는 포인트 1가지
4) watchouts엔 조심할 포인트 1가지(비난 금지, 해결 실마리 포함)
5) oneTip엔 오늘 바로 해볼 행동 1가지`;

  return { system, user };
}

// ==============================
// // OpenAI 호출
// ==============================
async function callOpenAI({ apiKey, system, user, score, seed }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 220,
      temperature: 0.2,
      top_p: 0.9,
      presence_penalty: 0.1,
      frequency_penalty: 0.4,
      seed: seed
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() || '';
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // 모델이 가끔 JSON 외 텍스트를 섞을 경우: 숫자만은 신뢰하고 나머지는 시드 기반 폴백
    parsed = null;
  }

  if (!parsed || typeof parsed.percent !== 'number') {
    // 폴백 구성(시드 기반)
    const b = bucketOf(score);
    const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
    const headline = pickFromSeeded(HEADLINES[b], seed);
    const tip = pickFromSeeded(TIP_TEMPLATES, seed);
    return {
      percent: score,
      headline,
      summary: `${emoji} 서로 다른 점은 분명하지만, 템포를 맞추면 호흡이 붙기 시작해요.`,
      strengths: '솔직하게 말하면 금방 합의점을 찾는 타입이에요.',
      watchouts: '감정이 격해질 땐 잠시 쉬어가며 대화를 이어가야 해요.',
      oneTip: tip
    };
  }

  // JSON 정합성 보정
  return {
    percent: Math.max(0, Math.min(99, Math.round(parsed.percent || score))),
    headline: String(parsed.headline || ''),
    summary: String(parsed.summary || ''),
    strengths: String(parsed.strengths || ''),
    watchouts: String(parsed.watchouts || ''),
    oneTip: String(parsed.oneTip || '')
  };
}

// ==============================
// // 최종 문장 렌더링 (템플릿 조합)
// ==============================
function renderMessage({ percent, headline, summary, strengths, watchouts, oneTip, seed, name1, name2 }) {
  const b = bucketOf(percent);
  const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
  const templates = [
    `궁합 ${percent}% - ${headline} ${emoji}\n${summary}\n강점: ${strengths}\n주의: ${watchouts}\n오늘의 한 줄 팁: ${oneTip}`,
    `궁합 ${percent}% ${emoji} ${headline}\n${summary}\n포인트: ${strengths}\n체크: ${watchouts}\nTip: ${oneTip}`,
    `궁합 ${percent}% - ${emoji} ${headline}\n${summary}\n좋은 점: ${strengths}\n유의점: ${watchouts}\n바로 해보기: ${oneTip}`
  ];
  return pickFromSeeded(templates, seed)
    .replaceAll('{name1}', name1)
    .replaceAll('{name2}', name2);
}

// ==============================
// // Next.js API 핸들러
// ==============================
export default async function handler(req, res) {
  // ----- CORS 세팅 -----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // ----- 입력 파싱 -----
    const {
      myName,
      myBirthDate,
      myGender,
      partnerName,
      partnerBirthDate,
      partnerGender
    } = req.body;

    if (!myName || !myBirthDate || !partnerName || !partnerBirthDate) {
      res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
      return;
    }

    // ----- 시드 생성 (이름/성별까지 포함 → 표현까지 재현성 보장) -----
    const seed = getSeed(
      String(myName),
      String(myBirthDate),
      String(myGender || ''),
      String(partnerName),
      String(partnerBirthDate),
      String(partnerGender || '')
    );

    // ----- 점수 사전 산출(비즈니스 분포 반영) -----
    const score = generateScore(seed);

    // ----- 스타일/템플릿 시드 선택 -----
    const style = pickFromSeeded(STYLE_MODES, seed);

    // ----- OpenAI 호출 준비 -----
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not found');

    const { system, user } = buildPrompt({
      style,
      name1: myName,
      name2: partnerName,
      gender1: myGender || '',
      gender2: partnerGender || '',
      birth1: myBirthDate,
      birth2: partnerBirthDate,
      score
    });

    // ----- OpenAI 호출 -----
    const json = await callOpenAI({
      apiKey,
      system,
      user,
      score,
      seed
    });

    // ----- 최종 메시지 렌더링 -----
    const result = renderMessage({
      ...json,
      seed,
      name1: myName,
      name2: partnerName
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('API Error:', error);

    // ----- 시드 기반 폴백(항상 재현 가능) -----
    try {
      const {
        myName,
        myBirthDate,
        myGender,
        partnerName,
        partnerBirthDate,
        partnerGender
      } = req.body || {};
      const seed = getSeed(
        String(myName || ''),
        String(myBirthDate || ''),
        String(myGender || ''),
        String(partnerName || ''),
        String(partnerBirthDate || ''),
        String(partnerGender || '')
      );
      const score = generateScore(seed);
      const b = bucketOf(score);
      const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
      const headline = pickFromSeeded(HEADLINES[b], seed);
      const tip = pickFromSeeded(TIP_TEMPLATES, seed);

      const result =
        `궁합 ${score}% - ${headline} ${emoji}\n` +
        `다름이 분명하지만, 템포를 맞추면 충분히 호흡을 찾을 수 있어요.\n` +
        `강점: 솔직한 대화에 강해요.\n` +
        `주의: 감정이 격할 땐 잠시 쉬어가며 합의점을 찾으세요.\n` +
        `오늘의 한 줄 팁: ${tip}`;

      res.status(200).json({ success: true, result });
    } catch {
      res.status(200).json({
        success: true,
        result:
          '궁합 62% - 서로의 속도를 맞추면 점점 편해지는 인연이에요 🌤️\n오늘은 구체적인 약속 1가지를 함께 정해보세요.'
      });
    }
  }
}
