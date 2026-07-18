// Zero-backend fixture data for /preview — lets the whole UI render and
// respond to clicks without Auth0, MongoDB, Gemini, or ElevenLabs configured.

function placeholderImage(label, bg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='50%' font-size='26' text-anchor='middle' fill='white' font-family='sans-serif' dy='.35em'>${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_USER = {
  name: "Cinderella",
  email: "cinderella@example.com",
  picture: null,
  fullBodyPhotoUrl: null
};

export const MOCK_ITEMS = [
  {
    id: "mock-1",
    imageUrl: placeholderImage("Blue Gown", "#4a5a9e"),
    category: "Dress",
    colorTags: ["periwinkle", "silver"],
    wearCount: 0,
    lastWornAt: null,
    createdAt: daysAgo(3)
  },
  {
    id: "mock-2",
    imageUrl: placeholderImage("White Top", "#cfe0fb"),
    category: "Top",
    colorTags: ["white"],
    wearCount: 2,
    lastWornAt: daysAgo(4),
    createdAt: daysAgo(30)
  },
  {
    id: "mock-3",
    imageUrl: placeholderImage("Denim", "#3b5a7a"),
    category: "Bottom",
    colorTags: ["blue", "denim"],
    wearCount: 5,
    lastWornAt: daysAgo(1),
    createdAt: daysAgo(60)
  },
  {
    id: "mock-4",
    imageUrl: placeholderImage("Glass Heels", "#d4a72c"),
    category: "Shoes",
    colorTags: ["gold", "clear"],
    wearCount: 1,
    lastWornAt: daysAgo(10),
    createdAt: daysAgo(20)
  },
  {
    id: "mock-5",
    imageUrl: placeholderImage("Trench", "#8a7a6a"),
    category: "Outerwear",
    colorTags: ["beige"],
    wearCount: 0,
    lastWornAt: null,
    createdAt: daysAgo(90)
  },
  {
    id: "mock-6",
    imageUrl: placeholderImage("Pearl Clutch", "#f7c9d8"),
    category: "Bag",
    colorTags: ["blush", "pearl"],
    wearCount: 0,
    lastWornAt: null,
    createdAt: daysAgo(75)
  }
];

export { placeholderImage };
