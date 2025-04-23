export function extractJsonArray(raw: string): any[] | null {
    try {
      return JSON.parse(raw);
    } catch {}
  
    const match = raw.match(/\[\s*{[\s\S]*?}\s*]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        console.error("⚠️ Regex-matched JSON failed to parse", err);
      }
    }
  
    console.error("❌ Failed to parse Gemini JSON output:", raw);
    return null;
  }
  