// api/advice.js

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
  
      // OpenAI 프롬프트
      const systemPrompt = `당신은 따뜻하고 공감적인 연애 상담사입니다.
  사용자의 현재 상황을 듣고, 실질적이고 따뜻한 조언을 해주세요.
  
  응답 규칙:
  - 3~5문장으로 구체적인 조언을 제공하세요
  - 공감을 먼저 표현하고, 그 다음 해결책을 제시하세요
  - 실천 가능한 행동을 포함하세요
  - 따뜻하고 격려하는 톤을 유지하세요`;
  
      const userPrompt = `상대방: ${partnerName}
  현재 궁합: ${compatibilityScore}%
  상황: "${situation}"
  
  위 상황에 대해 따뜻하고 구체적인 조언을 해주세요.`;
  
      // OpenAI API 호출
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.8,
          top_p: 0.95,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
  
      const data = await response.json();
      const advice = data?.choices?.[0]?.message?.content?.trim() || '';
  
      if (!advice) {
        throw new Error('Empty advice response');
      }
  
      res.status(200).json({ success: true, advice });
    } catch (error) {
      console.error('API Error:', error);
  
      // 폴백 조언
      const fallbackAdvice = `${req.body.partnerName || '상대방'}과의 관계에서 가장 중요한 것은 솔직한 대화예요. 지금 느끼는 감정을 있는 그대로 표현해보세요. 상대방도 여러분의 진심을 기다리고 있을 거예요.`;
  
      res.status(200).json({ success: true, advice: fallbackAdvice });
    }
  }