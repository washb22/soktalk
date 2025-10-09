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
// // 궁합 점수 분포 로직
// ==============================
function generateScore(seed) {
  let rPack = seededRand(seed);
  const r1 = rPack.value;
  rPack = seededRand(rPack.next);
  const r2 = rPack.value;

  if (r1 < 0.60) {
    return 30 + Math.floor(r2 * 21); // 30~50
  } else if (r1 < 0.95) {
    return 51 + Math.floor(r2 * 19); // 51~69
  } else if (r1 < 0.995) {
    return 70 + Math.floor(r2 * 10); // 70~79
  } else if (r1 < 0.999) {
    return 80 + Math.floor(r2 * 10); // 80~89
  } else {
    return 90 + Math.floor(r2 * 10); // 90~99
  }
}

// ==============================
// // 스타일/템플릿
// ==============================
const STYLE_MODES = [
  '따뜻하고 공감적인', '현실적이고 솔직한', '위트있고 경쾌한', 
  '시적이고 감성적인', '격려하는', '조언하는', '친근한'
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
  '상대의 "좋아하는 것 3개"를 물어보고 데이트에 녹여보세요.',
  '대화의 70%를 "듣기"에 써보면 분위기가 달라져요.',
  '오늘 하루는 서로의 장점 1가지씩 말해보는 시간을 가져보세요.',
  '상대방이 힘들어할 때 어떻게 위로받고 싶은지 물어보세요.',
  '함께 새로운 것을 배우는 시간을 만들어보세요.',
  '각자의 "나만의 시간"을 존중해주는 연습을 해보세요.'
];

function bucketOf(score) {
  if (score < 51) return 'low';
  if (score < 70) return 'mid';
  if (score < 80) return 'mid';
  if (score < 90) return 'high';
  return 'high';
}

// ==============================
// // OpenAI 프롬프트 (대폭 개선!)
// ==============================
function buildPrompt({ style, name1, name2, gender1, gender2, birth1, birth2, score }) {
  const system = `당신은 따뜻하고 통찰력 있는 연애 상담사입니다.
반드시 JSON만 출력하세요. 마크다운/코드블록/설명문은 절대 금지입니다.
출력 형식: {"percent": number, "headline": string, "summary": string, "strengths": string, "watchouts": string, "oneTip": string}

톤: "${style}" 톤으로 작성하되, 전문용어 없이 20대가 이해하기 쉽게 작성하세요.

작성 가이드:
- headline: 두 사람의 관계를 한 줄로 정의하는 인상적인 문구 (10~15자)
- summary: 두 사람의 전반적인 궁합과 관계 방향성을 3~4문장으로 구체적으로 설명
- strengths: 이 커플이 특별히 잘 맞는 부분을 2~3문장으로 설명하고, 그 이유와 활용 방법 제시
- watchouts: 주의해야 할 점을 2~3문장으로 설명하되, 비난보다는 해결책 중심으로 작성
- oneTip: 오늘 바로 실천할 수 있는 구체적이고 재미있는 행동 1가지 (20자 내외)`;

  const user = `두 사람 정보:
- ${name1} (${gender1}, ${birth1}생)
- ${name2} (${gender2}, ${birth2}생)

사전 계산된 궁합 점수: ${score}%

이 점수를 기반으로 두 사람만의 특별한 궁합 분석을 작성해주세요.
생년월일과 성별 정보를 활용해서 각 사람의 성향을 유추하고, 구체적인 조언을 해주세요.

중요: 
1) 점수는 ${score}%로 고정하고 절대 변경하지 마세요
2) 생년월일에 따라 세대 차이, 연령대별 특성을 반영하세요
3) 같은 점수라도 매번 다른 관점과 표현으로 작성하세요
4) ${name1}와 ${name2}의 이름을 자연스럽게 활용하세요
5) 뻔한 표현 대신 창의적이고 기억에 남는 문장을 사용하세요`;

  return { system, user };
}

// ==============================
// // OpenAI 호출 (temperature 상향!)
// ==============================
async function callOpenAI({ apiKey, system, user, score, seed }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 400, // 220 → 400 (더 길고 풍부한 내용)
      temperature: 0.8, // 0.2 → 0.8 (훨씬 더 창의적!)
      top_p: 0.95, // 0.9 → 0.95
      presence_penalty: 0.3, // 0.1 → 0.3 (같은 표현 반복 억제)
      frequency_penalty: 0.5, // 0.4 → 0.5 (단어 반복 억제)
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
    parsed = null;
  }

  if (!parsed || typeof parsed.percent !== 'number') {
    // 폴백
    const b = bucketOf(score);
    const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
    const headline = pickFromSeeded(HEADLINES[b], seed);
    const tip = pickFromSeeded(TIP_TEMPLATES, seed);
    return {
      percent: score,
      headline,
      summary: `${emoji} 두 분은 서로 다른 리듬으로 살아가지만, 그 차이가 오히려 새로운 관점을 선물해줄 거예요. 처음엔 어색할 수 있지만, 서로의 템포를 이해하고 존중하다 보면 점점 편안한 호흡을 찾게 될 거예요.`,
      strengths: '솔직하게 대화하면 금방 합의점을 찾는 타입이에요. 서로의 생각을 숨기지 않고 표현하는 것만으로도 많은 오해를 줄일 수 있어요.',
      watchouts: '감정이 격해질 때는 잠시 쉬어가는 시간이 필요해요. 대화가 격렬해지면 5분만 각자 생각을 정리한 후 다시 이야기해보세요.',
      oneTip: tip
    };
  }

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
// // 최종 메시지 렌더링
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

    const seed = getSeed(
      String(myName),
      String(myBirthDate),
      String(myGender || ''),
      String(partnerName),
      String(partnerBirthDate),
      String(partnerGender || '')
    );

    const score = generateScore(seed);
    const style = pickFromSeeded(STYLE_MODES, seed);

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

    const json = await callOpenAI({
      apiKey,
      system,
      user,
      score,
      seed
    });

    const result = renderMessage({
      ...json,
      seed,
      name1: myName,
      name2: partnerName
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('API Error:', error);

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
        `두 분은 서로 다른 속도로 살아가지만, 그 차이가 오히려 새로운 시각을 선물해줄 거예요.\n` +
        `강점: 솔직한 대화로 금방 합의점을 찾는 커플이에요.\n` +
        `주의: 감정이 격할 땐 5분만 쉬었다가 대화를 이어가보세요.\n` +
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