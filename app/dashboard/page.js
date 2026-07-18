import { redirect } from "next/navigation";
import { auth0 } from "../../lib/auth0";
import { getUserByAuth0Id } from "../../models/users";
import { getClosetItemsByUser } from "../../models/closetItems";
import DashboardClient from "./DashboardClient";

function serializeItem(item) {
  return {
    id: item._id.toString(),
    imageUrl: item.image_url,
    category: item.category,
    colorTags: item.color_tags || [],
    wearCount: item.wear_count || 0,
    lastWornAt: item.last_worn_at ? item.last_worn_at.toISOString() : null,
    createdAt: item.created_at ? item.created_at.toISOString() : null
  };
}

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/");
  }

  // RootLayout already upserted the user doc for this request.
  const user = await getUserByAuth0Id(session.user.sub);
  const items = await getClosetItemsByUser(user._id, { sortByWear: true });

  return (
    <DashboardClient
      user={{
        name: session.user.name || session.user.email || "Cinderella",
        email: session.user.email || null,
        picture: session.user.picture || null,
        fullBodyPhotoUrl: user.full_body_photo_url || null
      }}
      initialItems={items.map(serializeItem)}
    />
  );
}
