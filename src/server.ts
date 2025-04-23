// server.ts
import express from "express";
import { config } from "dotenv";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

config(); 

const app = express();
const port = process.env.PORT || 3000;

const hbClient = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

if (!process.env.GITHUB_TOKEN) {
  throw new Error("❌ GITHUB_TOKEN is not set in .env");
}

app.use(express.json());

// Helper: Extract JSON array from raw text
function extractJsonArray(raw: string): any[] | null {
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

// POST /summarize
app.post("/summarize", async (req: any, res: any) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    // 1. Hyperbrowser summarization
    const result = await hbClient.agents.browserUse.startAndWait({
      task: `Search the web for "${prompt}". Read and summarize the top 5 relevant sources (articles, blog posts, documentation, or discussions) in the following structured format in 2 mins max , ignore ads , look for lists (optional)

1. **Title**:
2. **Source** (URL):
3. **Summary** (150-200 words):
4. **Date Published** (if available):
5. **Key Takeaways** (bulleted):`,
      llm: "gemini-2.0-flash",
    });

    const rawSummary = result.data?.finalResult || "";

    // 2. Convert Hyperbrowser output to JSON using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const postProcessPrompt = `
You will receive structured summaries in plain text. Convert them to **a strict JSON array**, where each item has:

- title: string
- url: string
- summary: string
- publishedDate: string or null
- keyTakeaways: string[] (each bullet as a separate string)

⚠️ DO NOT include markdown, explanation, or wrap your response in code blocks.
Just return a clean JSON array like:

[
  {
    "title": "...",
    "url": "...",
    "summary": "...",
    "publishedDate": "...",
    "keyTakeaways": ["...", "..."]
  },
  ...
]

Text to convert:
${rawSummary}
`;

    const geminiResponse = await model.generateContent(postProcessPrompt);
    const rawOutput = geminiResponse.response.text();
    const parsed = extractJsonArray(rawOutput);

    const arr = parsed?.map((post: any) => ({
      ...post,
      img:
        post.img ||
        "https://media.istockphoto.com/id/1225395022/photo/young-adult-working-from-home-during-covid-19-quarantine-lockdown.jpg?s=1024x1024&w=is&k=20&c=JDhkURQzlIDuE8l6N02j88h8FXWuhbbNysZ-5tD40Nw=",
    }));

    const { Octokit } = await import("octokit");
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const gistUrls: string[] = [];

    // 3. Post each summary as a public Gist
    if (arr) {
      for (const item of arr) {
        const filename = `${item.title
          .slice(0, 50)
          .replace(/[^a-z0-9]/gi, "_")
          .replace(/_+/g, "_")}.md`;

        const markdown = `# ${item.title}

![Preview Image](${item.img})

**Published:** ${item.publishedDate || "Unknown"}  
**Source:** [${item.url}](${item.url})

---

## Summary

${item.summary}

---

## 🔑 Key Takeaways

${item.keyTakeaways.map((t: string) => `- ${t}`).join("\n")}
`;

        try {
          const response = await octokit.request("POST /gists", {
            description: `📰 ${item.title} - Auto summary`,
            public: true,
            files: {
              [filename]: {
                content: markdown,
              },
            },
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });

          if (response.data?.html_url) {
            gistUrls.push(response.data.html_url);
            console.log(`✅ Gist created: ${response.data.html_url}`);
          } else {
            console.warn("⚠️ Gist response missing URL");
          }
        } catch (err) {
          console.error(`❌ Failed to create Gist for "${item.title}"`, err);
        }
      }
    }

    res.json({
      raw: rawSummary,
      geminiOutput: rawOutput,
      refined: parsed || { error: "Failed to parse Gemini output", rawOutput },
      posts: arr,
      gists: gistUrls,
    });
  } catch (err: any) {
    console.error("🔥 Fatal error:", err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
