export const metadata = {
  title: "Closet App",
  description: "AI-powered closet styling app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
