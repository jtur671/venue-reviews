type GeminiRankInput = {
  venueName: string;
  venueCity?: string | null;
  candidates: Array<{
    label: string; // "A", "B", ...
    mimeType: string; // "image/jpeg"
    base64: string; // raw base64, no prefix
  }>;
};

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function getGeminiModel(): string {
  // User can override via env; keep default cheap.
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

function extractFirstJsonObject(text: string): any | null {
  // Gemini often wraps JSON in ```json fences. Try to peel that off.
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenceMatch?.[1] ?? trimmed).trim();

  // Try direct parse first
  try {
    return JSON.parse(candidate);
  } catch {
    // fall through
  }

  // Try to find first {...} block
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

export async function rankVenuePhotoWithGemini(input: GeminiRankInput): Promise<string | null> {
  const key = getGeminiKey();
  if (!key) return null;

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const venueContext = [input.venueName, input.venueCity].filter(Boolean).join(' — ');
  const prompt = `
You are choosing the best "hero" photo for a live music venue listing.

Venue: ${venueContext}

Pick the ONE best image among the labeled options.
Prefer:
- A real venue exterior (signage) or interior (stage/room), not generic crowd shots.
- Clear, high-quality, not too dark, not blurry, not heavily watermarked.
- Not a logo, map, menu, food, random selfie, or artist promo.

Return ONLY strict JSON:
{"choice":"A","reason":"..."}
`.trim();

  const parts: any[] = [{ text: prompt }];
  for (const c of input.candidates) {
    parts.push({ text: `Option ${c.label}` });
    parts.push({
      inline_data: {
        mime_type: c.mimeType,
        data: c.base64,
      },
    });
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 200,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json().catch(() => null)) as any;
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ??
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) return null;

  const parsed = extractFirstJsonObject(text);
  const choice = typeof parsed?.choice === 'string' ? parsed.choice.trim().toUpperCase() : null;
  if (!choice) return null;

  const valid = new Set(input.candidates.map((c) => c.label.toUpperCase()));
  return valid.has(choice) ? choice : null;
}


