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

    // 톤 보정: 궁합 점수에 따라 직설/부드러움 조절
    const score = typeof compatibilityScore === 'number' ? compatibilityScore : 50;
    const tone =
      score >= 75 ? '희망적이고 따뜻한 톤' :
      score >= 45 ? '현실적이되 차분하고 구체적인 톤' :
      '직설적이되 상처를 최소화하는 신중한 톤';

    // 상투어/일반론 차단 (프롬프트 레벨)
    const bannedPhrases = [
      '대화가 중요해요', '진심을 전해보세요', '상대방을 이해해보세요',
      '시간이 해결해줄 거예요', '서로에게 시간을 주세요', '그럴 수 있어요'
    ];

    // 시스템 프롬프트: 역할·금지어·체크리스트 고정
    const systemPrompt = `
당신은 한국어로 답하는 연애 상담가입니다. 목표는 "특정 상황"에 딱 맞는 실행 조언을 주는 것입니다.

규칙:
- 사용자가 입력한 상황문장을 반드시 1번 문단에서 "" 인용부호로 재인용합니다.
- 공감(한 문단) → 상대 입장 해석(한 문단) → 즉시 실행 행동(2~3개 불릿) → 실제 대화 예시(따옴표로 1~2개) 순서로 만듭니다.
- 불릿 행동은 "오늘/지금" 기준의 측정가능한 행동으로 씁니다. (예: “30분 산책 제안”, “메시지 2문장 보내기” 등)
- 대화 예시는 한국어 구체 문장으로 작성합니다. 이모티콘/이모지는 쓰지 않습니다.
- 금지: 모호한 일반론, 추상적 당위 (“${bannedPhrases.join(' / ')}”) 및 그 유사표현.
- 길이: 전체 5~8문장 분량 내에서 간결하게. (불릿은 문장 수에서 제외)
- 어투: ${tone}.
- 출력은 반드시 아래 JSON 스키마에 맞춰서만 반환합니다. 한국어 값을 채우세요.
`;

    // 사용자 프롬프트를 구조화
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
              description: '갈등 고조/안전 관련 징후가 있으면 간단 메모',
              items: { type: 'string' }
            }
          },
          required: ['empathy', 'partner_view', 'actions', 'dialogues']
        }
      }
    };

    // OpenAI API 호출 (구조화 출력)
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
              `입력(JSON):\n` +
              JSON.stringify(userPrompt, null, 2) +
              `\n\n반드시 JSON으로만 응답하세요.`
          }
        ],
        // "일반화"를 줄이기 위해 온도 낮춤, 패널티 제거
        temperature: 0.4,
        top_p: 0.9,
        presence_penalty: 0.0,
        frequency_penalty: 0.0,
        max_tokens: 450,
        response_format: responseFormat
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    // gpt-4o-mini의 json_schema 출력은 choices[0].message.content에 JSON 문자열로 도착
    let parsed;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    } catch {
      throw new Error('Invalid JSON from model');
    }

    // 후처리 가드: 상황문(핵심 단어) 최소 2개 이상이 본문에 반영되었는지 간단 체크
    const keyTokens = extractKeyTokens(situation);
    const mergedText = [parsed.empathy, parsed.partner_view, ...(parsed.actions || []), ...(parsed.dialogues || [])].join(' ');
    const matchedCount = keyTokens.filter(t => mergedText.includes(t)).length;
    if (matchedCount < Math.min(2, keyTokens.length)) {
      // 가벼운 보정: 상황문을 첫 문단에 재삽입
      parsed.empathy = `상황 인용: "${situation}"\n` + (parsed.empathy || '');
    }

    // 최종 렌더링 (UI에 보기 좋은 형태)
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
    const fallback = `
상황 인용: "${(req.body?.situation || '').slice(0, 200)}"
지금 느끼는 불편함을 가볍게 넘기지 않은 점이 좋아요. 상대(${req.body?.partnerName || '상대방'})가 왜 그렇게 반응했을지 한 가지 가설만 세우고, 오늘 단 한 번의 짧은 대화를 시도해보세요.
- 오늘 안에 "10분만 이야기할래?"라고 먼저 제안해요.
- 오해 포인트를 1가지로 좁혀서 묻고, 상대 답을 끊지 말고 끝까지 듣습니다.
예시) "어제 문자 늦게 본 게 신경 쓰였어? 내가 어떻게 했으면 좋겠는지 말해줄래?"
`.trim();
    res.status(200).json({ success: true, advice: fallback });
  }
}

/** 상황문에서 핵심 키워드 3~5개 추출(초간단) */
function extractKeyTokens(s) {
  try {
    const clean = String(s || '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = clean.split(' ').filter(w => w.length >= 2);
    // 너무 흔한 한국어 불용어 최소 제거
    const stop = new Set(['그리고', '그래서', '하지만', '그런데', '저는', '제가', '너무', '좀', '약간', '그', '이']);
    const tokens = words.filter(w => !stop.has(w));
    return tokens.slice(0, 5);
  } catch {
    return [];
  }
}

/** JSON을 자연어 카드로 렌더링 */
function renderAdvice({ situation, partnerName, empathy, partner_view, actions = [], dialogues = [], risk_flags = [] }) {
  const actionList = actions.map(a => `- ${a}`).join('\n');
  const dialogList = dialogues.map(d => `• "${d}"`).join('\n');
  const riskNote = risk_flags?.length ? `\n(주의 신호) ${risk_flags.join(' / ')}` : '';
  return [
    `상황 인용: "${situation}"`,
    '',
    empathy?.trim(),
    partner_view?.trim(),
    '',
    '지금 바로 해볼 행동:',
    actionList,
    '',
    '대화 예시:',
    dialogList,
    riskNote
  ].join('\n');
}
