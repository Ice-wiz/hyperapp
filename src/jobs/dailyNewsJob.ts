import { config } from "dotenv";
import { summarizeCategory } from "../agents/summarizeCategory.js";
import { postToGist } from "../utils/postToGist.js";
import { postNewsThreads } from "../utils/postToX.js";

config();

const categories = [
  { name: "Global News", query: "latest world news April 2025" },
  { name: "Indian News", query: "latest India news April 2025" },
  { name: "Fashion", query: "latest fashion trends April 2025" },
  { name: "Sports", query: "latest sports headlines April 2025" },
  { name: "Film", query: "latest movies news April 2025" },
  {
    name: "Business",
    query: "Latest business and stock market updates and news , april 2025 ",
  },
];

(async () => {
  console.log("📅 Running daily news summary...");

  const newsByCategory: Record<string, any[]> = {};

  for (const { name, query } of categories) {
    console.log(`🔍 Summarizing: ${name}`);
    const posts = await summarizeCategory(query);

    newsByCategory[name] = posts;

    for (const post of posts) {
      const gist = await postToGist(post);
      if (gist) console.log(`✅ ${name}: ${gist}`);
    }
  }

  await postNewsThreads(newsByCategory);

  console.log("✅ All done.");
})();
