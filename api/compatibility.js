// api/compatibility.js

// ==============================
// 시드 & 유틸 함수
// ==============================
function getSeed(...parts) {
  const str = parts.join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed) {
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
// 궁합 점수 분포 로직
// ==============================
function generateScore(seed) {
  let rPack = seededRand(seed);
  const r1 = rPack.value;
  rPack = seededRand(rPack.next);
  const r2 = rPack.value;

  if (r1 < 0.60) {
    return 30 + Math.floor(r2 * 21);
  } else if (r1 < 0.95) {
    return 51 + Math.floor(r2 * 19);
  } else if (r1 < 0.995) {
    return 70 + Math.floor(r2 * 10);
  } else if (r1 < 0.999) {
    return 80 + Math.floor(r2 * 10);
  } else {
    return 90 + Math.floor(r2 * 10);
  }
}

// ==============================
// 스타일/템플릿 (바이럴 버전)
// ==============================
const STYLE_MODES = [
  '친구가 술자리에서 솔직하게 말해주는',
  '언니/오빠가 현실 조언해주는',
  '약간 놀리면서도 진심 담긴',
  '찔리지만 인정할 수밖에 없는',
  '웃기지만 뼈 있는',
  '다정하게 팩폭하는'
];

const EMOJI_BUCKET = {
  low: ['😅', '🥲', '💔', '🫠'],
  mid: ['🤔', '😏', '🙃', '💭'],
  high: ['🔥', '💕', '✨', '😍']
};

const HEADLINES = {
  low: [
    '노력 많이 해야 할 듯...',
    '쉽진 않겠다 솔직히',
    '서로 다른 세계 사람'
  ],
  mid: [
    '괜찮은데 방심은 금물',
    '적당히 밀당이 필요한 사이',
    '노력하면 될 수도?'
  ],
  high: [
    '찰떡이네 너희',
    '케미 터진다',
    '이 정도면 운명 아님?'
  ]
};

const TIP_TEMPLATES = [
  '서로 연락 텀이 다르면 기대치 먼저 맞춰보기',
  '다음에 의견 다르면 가위바위보로 정하기로 약속',
  '싸우면 최소 3시간은 냉각기 갖기로 규칙 정하기',
  '상대가 힘들어할 때 어떻게 위로받고 싶은지 물어보기',
  '다음 데이트 계획은 100% 상대한테 맡겨보기',
  '서로 "이건 양보 못 해" 리스트 3개씩 공유하기',
  '먼저 사과하는 연습 오늘부터 시작하기',
  '상대 얘기 끝까지 듣고 3초 뒤에 대답하기',
  '일주일에 한 번은 각자 시간 갖기로 약속',
  '카톡 읽씹 몇 시간까지 괜찮은지 기준 정하기'
];

function bucketOf(score) {
  if (score < 51) return 'low';
  if (score < 70) return 'mid';
  return 'high';
}

// ==============================
// OpenAI 프롬프트 (바이럴 최적화!)
// ==============================
function buildPrompt({ style, name1, name2, gender1, gender2, birth1, birth2, score }) {
  const bucket = bucketOf(score);
  
  const system = `당신은 솔직하고 유머 있는 친구 같은 연애 상담사입니다.
반드시 JSON만 출력하세요. 마크다운/코드블록/설명문은 절대 금지입니다.
출력 형식: {"percent": number, "headline": string, "summary": string, "strengths": string, "watchouts": string, "oneTip": string}

톤: "${style}" 스타일로 작성
- 친구가 술자리에서 조언해주는 느낌
- 뻔한 말 절대 금지 (예: "서로 이해하면 좋아져요" 이런 거 X)
- 구체적인 상황 예측 필수
- 약간 찔리거나 웃긴 표현 환영
- 이모지 사용 금지 (따로 붙임)

점수 구간: ${bucket === 'low' ? '낮음 (현실적으로 경고)' : bucket === 'mid' ? '중간 (가능성은 있지만 노력 필요)' : '높음 (칭찬하되 방심 경고)'}

작성 가이드:
- headline: SNS에 캡처해서 올리고 싶은 한 줄 (15자 내외)
  예시: "싸우면 네가 먼저 사과할 운명", "헤어져도 결국 다시 만남", "찰떡인데 가끔 답답함"
  
- summary: 두 사람의 케미를 구체적 상황으로 설명 (3문장)
  예시: "여행 가면 계획파 vs 즉흥파로 첫날부터 싸울 듯. 근데 막상 싸우고 나면 금방 풀어짐. 결국 추억은 다 좋았다고 기억할 타입."
  
- strengths: 진짜 잘 맞는 구체적인 포인트 (2문장)
  예시: "둘 다 연락 텀이 비슷해서 '읽씹' 스트레스 없을 듯. 혼자 있는 시간 존중해주는 것도 잘 맞음."
  
- watchouts: 찔리는 현실 경고 (2문장)
  예시: "문제는 둘 다 고집이 있어서 싸우면 길어짐. 먼저 사과하는 쪽이 항상 ${name1}일 확률 높음."
  
- oneTip: 위에서 분석한 약점/주의점을 보완할 수 있는 구체적인 행동 (25자 내외)
  반드시 watchouts에서 언급한 문제를 해결하는 방향으로 작성!
  예시: 
  - watchouts가 "먼저 연락 안 하면 삐짐" → "오늘 ${name1}가 먼저 연락해보기"
  - watchouts가 "싸우면 길어짐" → "다음 싸움은 6시간 냉각기 갖기로 약속"
  - watchouts가 "계획 vs 즉흥 충돌" → "다음 데이트는 ${name2}한테 100% 맡기기"`;

  const user = `두 사람 정보:
- ${name1} (${gender1}, ${birth1}생)
- ${name2} (${gender2}, ${birth2}생)

궁합 점수: ${score}% (이 점수 절대 변경 금지!)

이 두 사람만의 특별한 궁합 분석을 작성해줘.
생년월일로 세대 특성, 나이 차이 등을 자연스럽게 반영하고
${name1}와 ${name2} 이름을 적극 활용해서 개인화된 느낌으로.

중요:
1) 점수 ${score}% 고정
2) "서로 노력하면 좋아질 거예요" 같은 뻔한 말 금지
3) 구체적인 상황 예측 필수 (여행, 싸움, 연락 패턴 등)
4) 읽는 사람이 "어 이거 맞는데?" 하게 찔리는 내용
5) SNS에 공유하고 싶을 만큼 재밌거나 인상적인 문구
6) oneTip은 반드시 watchouts(주의점)에서 언급한 문제를 해결하는 방향으로! 일반적인 데이트 팁 금지!`;

  return { system, user };
}

// ==============================
// OpenAI 호출
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
      max_tokens: 500,
      temperature: 0.9,
      top_p: 0.95,
      presence_penalty: 0.4,
      frequency_penalty: 0.6,
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
    const b = bucketOf(score);
    const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
    const headline = pickFromSeeded(HEADLINES[b], seed);
    const tip = pickFromSeeded(TIP_TEMPLATES, seed);
    return {
      percent: score,
      headline,
      summary: `${emoji} 솔직히 말하면, 둘이 좀 다른 스타일이야. 한 명은 계획파, 한 명은 즉흥파일 확률 높음. 근데 그게 오히려 재밌을 수도 있어.`,
      strengths: '의외로 대화는 잘 통하는 편. 서로 관심사가 달라서 새로운 거 알려주는 재미가 있을 듯.',
      watchouts: '문제는 싸울 때야. 둘 다 물러서는 타입이 아니라서 한 번 터지면 길어질 수 있음.',
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
// 최종 메시지 렌더링
// ==============================
function renderMessage({ percent, headline, summary, strengths, watchouts, oneTip, seed, name1, name2 }) {
  const b = bucketOf(percent);
  const emoji = pickFromSeeded(EMOJI_BUCKET[b], seed);
  
  const templates = [
    `궁합 ${percent}% - ${headline} ${emoji}\n${summary}\n강점: ${strengths}\n주의: ${watchouts}\n오늘의 미션: ${oneTip}`,
    `궁합 ${percent}% ${emoji} ${headline}\n${summary}\n포인트: ${strengths}\n체크: ${watchouts}\n바로 해보기: ${oneTip}`,
    `궁합 ${percent}% - ${emoji} ${headline}\n${summary}\n좋은 점: ${strengths}\n현실 경고: ${watchouts}\n오늘의 팁: ${oneTip}`
  ];
  
  return pickFromSeeded(templates, seed)
    .replaceAll('{name1}', name1)
    .replaceAll('{name2}', name2);
}

// ==============================
// Next.js API 핸들러
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
      const tip = pickFromSeeded(TIP_TEMPLATES, seed)
        .replaceAll('{name1}', myName || '너')
        .replaceAll('{name2}', partnerName || '상대');

      const result =
        `궁합 ${score}% - ${headline} ${emoji}\n` +
        `솔직히 쉽진 않을 수 있어. 근데 노력하면 의외로 잘 맞을 수도?\n` +
        `강점: 대화는 통하는 편이야. 서로 다른 점이 오히려 재밌을 듯.\n` +
        `주의: 싸울 때 둘 다 안 물러서면 길어지니까 조심.\n` +
        `오늘의 미션: ${tip}`;

      res.status(200).json({ success: true, result });
    } catch {
      res.status(200).json({
        success: true,
        result:
          '궁합 62% - 괜찮은데 방심은 금물 🤔\n둘이 스타일이 좀 달라서 처음엔 어색할 수 있어. 근데 그게 오히려 서로한테 새로운 걸 알려주는 재미가 될 듯.\n오늘의 미션: 상대한테 "요즘 뭐해?" 먼저 연락해봐'
      });
    }
  }
}