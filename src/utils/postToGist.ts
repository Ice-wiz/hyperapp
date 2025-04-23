import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function postToGist(item: any): Promise<string | null> {
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
      files: { [filename]: { content: markdown } },
      headers: { "X-GitHub-Api-Version": "2022-11-28" }
    });

    return response.data?.html_url || null;
  } catch (err) {
    console.error(`❌ Gist creation failed for "${item.title}"`, err);
    return null;
  }
}
