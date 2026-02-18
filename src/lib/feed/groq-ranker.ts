import Groq from 'groq-sdk';
import type { ScoredPost, UserInterestProfile } from './types';
import { GROQ_MODEL, GROQ_MAX_TOKENS, LLM_RERANK_TOP_N } from './constants';

let groqClient: Groq | null = null;

function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Groq LLM re-ranking (Tier 2). Sends top N posts to Groq for intelligent re-ordering.
 * Falls back to original Tier 1 ordering if Groq is unavailable.
 */
export async function groqRerank(
  scored: ScoredPost[],
  userProfile: UserInterestProfile | null,
  postSummaries: Map<string, string>
): Promise<ScoredPost[]> {
  const groq = getGroq();
  if (!groq) return scored;

  const topN = scored.slice(0, LLM_RERANK_TOP_N);
  const rest = scored.slice(LLM_RERANK_TOP_N);

  if (topN.length === 0) return scored;

  try {
    // Build condensed post summaries for the prompt
    const postList = topN.map((s, i) => {
      const summary = postSummaries.get(s.post_id) || 'No content';
      const truncated = summary.substring(0, 100);
      return `${i + 1}. [${s.post_id.substring(0, 8)}] score=${s.tier1_score.toFixed(3)} following=${s.features.is_following} media=${s.features.has_media} verified=${s.features.is_verified} age_h=${s.features.age_hours.toFixed(1)} - "${truncated}"`;
    }).join('\n');

    // User interest summary
    const topTopics = userProfile?.topic_scores
      ? Object.entries(userProfile.topic_scores)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([t]) => t)
          .join(', ')
      : 'general';

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: GROQ_MAX_TOKENS,
      messages: [
        {
          role: 'system',
          content: `You are a feed ranking algorithm. Re-rank social media posts for optimal engagement and user satisfaction.

Rules:
- Prioritize interest relevance and content diversity
- No more than 2 posts from the same author in the top 10
- Mix fresh and engaging content
- Prefer posts from followed users but include diverse discoveries
- Consider social signals (following, verified, engagement)

Respond ONLY with a JSON array of post IDs in the new order, e.g.: ["id1","id2",...]`,
        },
        {
          role: 'user',
          content: `Re-rank these ${topN.length} posts for a user interested in: ${topTopics}

Posts:
${postList}

Return JSON array of the short IDs (the 8-char codes in brackets) in your recommended order:`,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return scored;

    const rankedIds: string[] = JSON.parse(jsonMatch[0]);

    // Map short IDs back to full post IDs
    const postIdMap = new Map(topN.map((s) => [s.post_id.substring(0, 8), s.post_id]));
    const reranked: ScoredPost[] = [];
    const used = new Set<string>();

    for (const shortId of rankedIds) {
      const fullId = postIdMap.get(shortId);
      if (fullId && !used.has(fullId)) {
        const post = topN.find((s) => s.post_id === fullId);
        if (post) {
          reranked.push({
            ...post,
            tier2_score: (topN.length - reranked.length) / topN.length,
            score: (post.tier1_score + (topN.length - reranked.length) / topN.length) / 2,
          });
          used.add(fullId);
        }
      }
    }

    // Add any posts that weren't in the LLM response
    for (const post of topN) {
      if (!used.has(post.post_id)) {
        reranked.push(post);
      }
    }

    return [...reranked, ...rest];
  } catch (error) {
    console.warn('Groq re-ranking failed, using Tier 1 ordering:', error);
    return scored;
  }
}
