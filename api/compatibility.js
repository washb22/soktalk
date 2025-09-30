// api/compatibility.js
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { myName, myBirthDate, myGender, partnerName, partnerBirthDate, partnerGender } = req.body;

    if (!myName || !myBirthDate || !partnerName || !partnerBirthDate) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `당신은 연애사주 상담사입니다.
두 사람의 생년월일을 바탕으로 궁합을 분석해주세요.

🎯 핵심 규칙:
1. 2~3줄 메시지로 간단하게 작성할 것
2. 두 사람의 궁합을 현실적이게 전달할것
3. 전문 용어 없이, 누구나 이해할 수 있는 표현 사용
4. 구체적인 생년월일 정보를 반영한 개인화된 분석
5. 이모지는 1~2개 정도 자연스럽게 사용

퍼센트 가이드:
- 30~50%: 노력이 많이 필요한 궁합 (60% 비율)
- 51~69%: 서로 다른 점이 많아 알아가는 데 노력이 필요한 궁합 (35% 비율)
- 70~79%: 끌림은 분명하지만, 더 깊이 알아가야 할 궁합 (10% 비율)
- 80~89%: 잘 통하고 편안한 좋은 인연 (5% 비율)
- 90% 이상: 매우 드문 천생연분 (거의 사용하지 않음)

답변 형식: "궁합 XX% - [메시지]"`
          },
          {
            role: 'user',
            content: `다음 두 사람의 궁합을 분석해주세요:

${myName} (${myGender}, ${myBirthDate}생)
${partnerName} (${partnerGender}, ${partnerBirthDate}생)

이 두 사람의 생년월일을 바탕으로 개인화된 궁합을 분석해주세요.
전문 용어 없이 누구나 이해할 수 있는 따뜻한 말로 해주세요.`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim();

    res.status(200).json({
      success: true,
      result: result,
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    const fallbackMessages = [
      "궁합 65% - 서로 다른 점이 많지만 이해하려 노력한다면 좋은 관계가 될 수 있어요 💕",
      "궁합 58% - 끌림은 있지만 서로를 더 알아가는 시간이 필요해요 🌸",
      "궁합 72% - 좋은 인연이지만 조금 더 깊이 들여다볼 필요가 있어요 ✨",
    ];
    
    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    res.status(200).json({
      success: true,
      result: randomMessage,
    });
  }
}