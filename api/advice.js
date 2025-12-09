// 스타일 모드 (랜덤하게 적용)
const STYLE_MODES = [
  '놀리면서도 진심 담긴 조언',
  '찔리지만 인정할 수밖에 없는 직설',
  '다정하게 팩폭하는 친구',
  '웃기면서도 핵심 찌르는 톤',
  '약간 선 넘는 친한 친구 말투',
  '공감하다가 갑자기 현실 직시시키는 톤',
];

function pickStyle(seed) {
  return STYLE_MODES[Math.abs(seed) % STYLE_MODES.length];
}

function getSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

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
    const { partnerName, situation, compatibilityScore } = req.body;

    if (!partnerName || !situation) {
      res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not found');

    // 시드 생성 및 스타일 선택
    const seed = getSeed(partnerName + situation);
    const style = pickStyle(seed);

    // 궁합 점수에 따른 현실 반영도
    const score = typeof compatibilityScore === 'number' ? compatibilityScore : 50;
    const realityLevel =
      score >= 75 ? '희망적이지만 방심 포인트도 콕 찍어주기' :
      score >= 45 ? '가능성과 위험 요소 둘 다 솔직하게' :
      '냉정하게 현실 직시, 하지만 완전 절망은 아니게';

    // 뻔한 표현 금지 (확장)
    const bannedPhrases = [
      '대화가 중요해요', '진심을 전해보세요', '상대방을 이해해보세요',
      '시간이 해결해줄 거예요', '서로에게 시간을 주세요', '그럴 수 있어요',
      '솔직하게 대화해보세요', '마음을 열어보세요', '노력하면 될 거예요',
      '서로 배려하면', '이해하려고 노력해보세요', '감정을 표현해보세요'
    ];

    // 시스템 프롬프트: 친구처럼 재미있게!
    const systemPrompt = `당신은 솔직하고 유머 있는 친구입니다. 연애 고민 상담을 해주는데, 절대 상담사처럼 딱딱하게 말하지 않습니다.

톤 스타일: "${style}"
현실 반영도: ${realityLevel}

작성 가이드:
- empathy (첫인상): 읽자마자 "어 이거 내 얘기인데?" 하게 만드는 한마디. 상황을 인용하되 친구처럼.
  예시: "야, '${situation.slice(0, 30)}...' 이거 읽자마자 좀 답답했어. 근데 네 마음 이해해."
  
- partner_view (상대방 분석): 상대가 왜 그랬을지 뼈 때리는 분석. 뻔한 말 금지!
  예시: "솔직히 ${partnerName}이(가) 그런 건 바빠서가 아니라 우선순위에서 밀린 거일 수도 있어."
  
- actions (할 것 2-3개): 오늘 당장 할 수 있는 구체적 행동. 애매한 거 금지!
  예시: ["오늘 저녁에 '요즘 바빠? 궁금했어' 딱 한 줄만 보내", "답장 오기 전까지 연락 안 하기"]
  
- dialogues (메시지 예시 1-2개): 실제로 복사해서 보낼 수 있는 메시지
  예시: ["야 오랜만~ 요즘 어떻게 지내?", "갑자기 네 생각나서ㅋㅋ 밥이나 먹자"]

중요 규칙:
- 친구가 술자리에서 조언해주는 느낌으로 작성
- "${bannedPhrases.join('", "')}" 같은 뻔한 말 절대 금지
- 이모지 사용 금지
- ${partnerName} 이름 적극 활용해서 개인화
- 구체적인 상황 예측 필수
- 읽는 사람이 "어 맞는데..." 하게 찔리는 내용

출력은 반드시 JSON 스키마에 맞춰서만 반환하세요.`;

    // 사용자 프롬프트
    const userPrompt = {
      partnerName,
      situation,
      compatibilityScore: score,
      constraints: {
        mustQuoteSituation: true,
        minActionItems: 2,
        maxActionItems: 3,
        includeDialogueExamples: true
      }
    };

    // JSON 스키마 지정 (응답을 강제 구조화)
    const responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'AdviceResponse',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            empathy: { type: 'string', minLength: 10 },
            partner_view: { type: 'string', minLength: 10 },
            actions: {
              type: 'array',
              minItems: 2,
              maxItems: 3,
              items: { type: 'string', minLength: 5 }
            },
            dialogues: {
              type: 'array',
              minItems: 1,
              maxItems: 2,
              items: { type: 'string', minLength: 8 }
            },
            risk_flags: {
              type: 'array',
              description: '하면 안 되는 행동이나 주의할 점',
              items: { type: 'string' }
            }
          },
          required: ['empathy', 'partner_view', 'actions', 'dialogues']
        }
      }
    };

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content:
              `고민 상황: "${situation}"\n상대방: ${partnerName}\n궁합 점수: ${score}%\n\n` +
              `이 상황에 맞는 찐친 조언을 해줘. 뻔한 말 하면 친구 잃는다고 생각하고.\n\n` +
              `입력(JSON):\n` +
              JSON.stringify(userPrompt, null, 2) +
              `\n\n반드시 JSON으로만 응답하세요.`
          }
        ],
        temperature: 0.85,
        top_p: 0.95,
        presence_penalty: 0.3,
        frequency_penalty: 0.5,
        max_tokens: 500,
        response_format: responseFormat,
        seed: seed
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let parsed;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    } catch {
      throw new Error('Invalid JSON from model');
    }

    // 후처리 가드: 상황문 반영 체크
    const keyTokens = extractKeyTokens(situation);
    const mergedText = [parsed.empathy, parsed.partner_view, ...(parsed.actions || []), ...(parsed.dialogues || [])].join(' ');
    const matchedCount = keyTokens.filter(t => mergedText.includes(t)).length;
    if (matchedCount < Math.min(2, keyTokens.length)) {
      parsed.empathy = `야, "${situation.slice(0, 50)}..." 이거 보고 좀 답답했어.\n` + (parsed.empathy || '');
    }

    // 최종 렌더링
    const adviceText = renderAdvice({
      situation,
      partnerName,
      empathy: parsed.empathy,
      partner_view: parsed.partner_view,
      actions: parsed.actions,
      dialogues: parsed.dialogues,
      risk_flags: parsed.risk_flags
    });

    res.status(200).json({ success: true, advice: adviceText, raw: parsed });
  } catch (error) {
    console.error('API Error:', error);
    const { partnerName = '그 사람', situation = '' } = req.body || {};
    const fallback = `💬 솔직히 말할게

야, "${situation.slice(0, 50)}..." 이거 보니까 좀 답답하긴 하다.

🔍 현실 체크:
${partnerName}이(가) 그렇게 반응한 건 아마 부담됐거나, 본인도 정리가 안 된 거일 수 있어.

✅ 이렇게 해:
- 오늘은 연락하지 말고, 내일 "요즘 어때? 밥이나 먹자" 이 정도로 가볍게 던져봐.
- 답장 올 때까지 추가 연락 금지.

❌ 이건 하지마:
"왜 연락 안 해?" "내가 뭐 잘못했어?" 이런 거 보내면 진짜 끝이야.

📱 이렇게 보내:
"야 오랜만~ 이번 주 시간 되면 밥 ㄱ?"

🎯 마지막으로:
이거 고민하는 시간에 네 할 일이나 해. 진심이야.`.trim();

    res.status(200).json({ success: true, advice: fallback });
  }
}

/** 상황문에서 핵심 키워드 추출 */
function extractKeyTokens(s) {
  try {
    const clean = String(s || '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = clean.split(' ').filter(w => w.length >= 2);
    const stop = new Set(['그리고', '그래서', '하지만', '그런데', '저는', '제가', '너무', '좀', '약간', '그', '이']);
    const tokens = words.filter(w => !stop.has(w));
    return tokens.slice(0, 5);
  } catch {
    return [];
  }
}

/** JSON을 보기 좋은 카드로 렌더링 */
function renderAdvice({ situation, partnerName, empathy, partner_view, actions = [], dialogues = [], risk_flags = [] }) {
  const actionList = actions.map(a => `- ${a}`).join('\n');
  const dialogList = dialogues.map(d => `"${d}"`).join('\n');
  const riskNote = risk_flags?.length ? `\n❌ 이건 하지마:\n${risk_flags.map(r => `- ${r}`).join('\n')}` : '';
  
  return `💬 ${empathy?.trim() || '솔직히 말할게'}

🔍 현실 체크:
${partner_view?.trim() || '상대방 입장에서 한번 생각해봐.'}

✅ 이렇게 해:
${actionList}
${riskNote}

📱 이렇게 보내:
${dialogList}`;
}