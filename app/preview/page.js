"use client";

import { useEffect, useState } from "react";
import Splash from "../components/Splash";
import DashboardClient from "../dashboard/DashboardClient";
import { installMockApi } from "./mockApi";
import { MOCK_USER, MOCK_ITEMS } from "./mockData";

// Zero-backend preview of the whole app — no Auth0, MongoDB, Gemini, or
// ElevenLabs required. Every panel is fully clickable against fixture data
// and a mocked fetch. Visit /preview to see it; the real / and /dashboard
// routes are untouched and still need real credentials.
export default function PreviewPage() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const uninstall = installMockApi();
    return uninstall;
  }, []);

  if (!entered) {
    return <Splash onEnter={() => setEntered(true)} />;
  }

  return <DashboardClient user={MOCK_USER} initialItems={MOCK_ITEMS} />;
}
