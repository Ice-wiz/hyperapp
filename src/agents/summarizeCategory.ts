import { Hyperbrowser } from "@hyperbrowser/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonArray } from "../utils/extractJsonArray.js";

import { config } from "dotenv";

config()

const hbClient = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function summarizeCategory(topic: string): Promise<any[]> {
  const task = `Search the web for "${topic}". Read and summarize the top 5 relevant news sources (articles, blog posts, documentation, or discussions) in the following structured format in 2 mins max , ignore ads , look for lists (optional)
  can take references from BBC, CNN , like times of India , the Hindu , Dainik Bhaskar , ABC fashion , CricBuzz , The Indian Express etc (optional)

1. **Title**:
2. **Source** (URL):
3. **Summary** (150-200 words):
4. **Date Published** (if available):
5. **Key Takeaways** (bulleted):`

  const result = await hbClient.agents.browserUse.startAndWait({
    task,
    llm: "gemini-2.0-flash"
  });

  const rawSummary = result.data?.finalResult || "";

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const convertPrompt = `
Convert the following text into a clean JSON array with fields:
- title, url, summary, publishedDate, keyTakeaways (as array)

No markdown. No explanation.

${rawSummary}
`;

  const response = await model.generateContent(convertPrompt);
  const text = response.response.text();

  const parsed = extractJsonArray(text);

  return parsed?.map((post: any) => ({
    ...post,
    img:
      post.img ||
      "https://media.istockphoto.com/id/1225395022/photo/young-adult-working-from-home-during-covid-19-quarantine-lockdown.jpg?s=1024x1024&w=is&k=20&c=JDhkURQzlIDuE8l6N02j88h8FXWuhbbNysZ-5tD40Nw="
  })) || [];
}
