// src/utils/postToX.ts
import {TwitterApi} from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

const rwClient = client.readWrite;

export async function postNewsThreads(newsByCategory: Record<string, any[]>) {
  for (const [category, articles] of Object.entries(newsByCategory)) {
    const intro = `🧵 ${category.toUpperCase()} - Daily Highlights\n\nHere's what you need to know 👇`;
    const thread: string[] = [intro];

    for (const article of articles) {
      const entry = `📰 ${article.title}\n\n${article.summary.slice(
        0,
        240
      )}...\n\n🔗 ${article.url}`;
      thread.push(entry);
    }

    try {
      let lastTweet = await rwClient.v2.tweet(thread[0]);

      for (let i = 1; i < thread.length; i++) {
        lastTweet = await rwClient.v2.reply(thread[i], lastTweet.data.id);
      }

      console.log(`✅ Posted thread for ${category}`);
    } catch (err) {
      console.error(`❌ Failed to post thread for ${category}`, err);
    }
  }
}
