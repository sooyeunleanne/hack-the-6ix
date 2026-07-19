import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../../models/users";
import { getClosetItemById, getClosetItemsByUser } from "../../../../../models/closetItems";
import { hasGeminiKey, generateJson } from "../../../../../lib/gemini";

// GET /api/closet-items/:id/restyle-ideas
// Decision-tree step 1: "can it be styled differently?" — asks Gemini for
// 5 fresh outfit combinations that all include this specific item, drawn
// from the rest of the closet.
export async function GET(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { id } = await params;
  const item = await getClosetItemById(id, user._id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const allItems = await getClosetItemsByUser(user._id);
  const catalog = allItems.map((i) => ({
    id: i._id.toString(),
    category: i.category,
    colorTags: i.color_tags || []
  }));
  const targetId = item._id.toString();

  function mockIdeas() {
    const others = catalog.filter((c) => c.id !== targetId);
    const ideas = [];
    for (let i = 0; i < Math.min(5, others.length + 1); i++) {
      const picks = others.slice(i, i + 2);
      ideas.push({ itemIds: [targetId, ...picks.map((p) => p.id)], description: "A fresh pairing worth trying." });
    }
    return { ideas, mock: true };
  }

  if (!hasGeminiKey()) {
    return NextResponse.json(mockIdeas());
  }

  const prompt = `You are a creative fairy-godmother personal stylist. The user has an item they're considering donating because they never wear it, but first you want to show them it still has potential.

The item that must appear in every outfit (id: "${targetId}"): ${JSON.stringify({ category: item.category, colorTags: item.color_tags || [] })}
Rest of their closet catalog (JSON): ${JSON.stringify(catalog.filter((c) => c.id !== targetId))}

Come up with 5 distinct outfit ideas that each include item "${targetId}" plus 1-3 other items from the catalog. For each, write a short (under 12 words) description of the vibe. Do not use double quotation marks inside description text. Respond with ONLY JSON: {"ideas": [{"itemIds": ["${targetId}", "..."], "description": "..."}]}. Always include "${targetId}" in every itemIds array. Only use ids from the catalog or "${targetId}".`;

  try {
    const result = await generateJson(prompt);
    const validIds = new Set([targetId, ...catalog.map((c) => c.id)]);
    const ideas = (result.ideas || [])
      .map((idea) => ({
        itemIds: (idea.itemIds || []).filter((id) => validIds.has(id)),
        description: idea.description || "A fresh pairing worth trying."
      }))
      .filter((idea) => idea.itemIds.includes(targetId) && idea.itemIds.length > 1);
    if (ideas.length === 0) throw new Error("No valid restyle ideas returned");
    return NextResponse.json({ ideas, mock: false });
  } catch (err) {
    return NextResponse.json({ ...mockIdeas(), error: err.message });
  }
}
