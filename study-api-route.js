// ============================================================
// IRA AI — Study Mode Backend Route
// Add this to your existing Express server (server.js / app.js)
// ============================================================
//
// SETUP (one time):
//   npm install groq-sdk
//
// Get your FREE Groq API key at: https://console.groq.com
// Set it in your Render environment variables as:  GROQ_API_KEY
//
// Then paste the route below into your server.js
// ============================================================

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/study
// Body: { text: string }   (extracted PDF text from the frontend)
// Returns: { summary: string, questions: Array }
app.post('/api/study', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 80) {
      return res.status(400).json({ error: 'PDF text is too short or missing.' });
    }

    // Trim to safe length for Groq context window
    const safeText = text.slice(0, 10000);

    const prompt = `You are an expert academic assistant. A student has uploaded a PDF document.
Your task:
1. Write a clear, comprehensive summary (~300 words) covering the main topic, key concepts, and important takeaways. Write in flowing paragraphs — no bullet points.
2. Create exactly 10 multiple-choice questions that genuinely test understanding of this content. Each must have 4 options with exactly 1 correct answer.

PDF content:
---
${safeText}
---

CRITICAL: Respond with ONLY valid JSON. No preamble, no markdown, no backticks. Raw JSON only.

Required format:
{
  "summary": "your full summary here",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}

The "correct" field is 0-based (0=A, 1=B, 2=C, 3=D). Generate exactly 10 questions.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',   // Free, fast, excellent quality
      max_tokens: 3000,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.summary || !Array.isArray(parsed.questions) || parsed.questions.length < 5) {
      throw new Error('Unexpected response format from AI.');
    }

    // Ensure max 10 questions
    parsed.questions = parsed.questions.slice(0, 10);

    return res.json(parsed);

  } catch (err) {
    console.error('[/api/study] Error:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to generate study content. Please try again.'
    });
  }
});


// ============================================================
// WHAT TO DO IN RENDER:
// 1. Add environment variable:  GROQ_API_KEY = your_key_here
// 2. Run:  npm install groq-sdk
// 3. Add the route above to your server.js
// 4. Add study-mode.html to your public folder
// 5. Deploy — done!
//
// GROQ FREE TIER:
//   - 14,400 requests/day
//   - 500,000 tokens/minute
//   - No credit card required
//   - More than enough for a study tool
// ============================================================
