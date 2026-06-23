"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import ContentView from "@/components/ContentView";
import { LiveProvider } from "@/lib/LiveContext";

export default function Home() {
  const [activeView, setActiveView] = useState("Dashboard");

  return (
    <LiveProvider>
      <div className="flex min-h-screen">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        {activeView === "Dashboard" ? (
          <Dashboard />
        ) : (
          <ContentView view={activeView} />
        )}
      </div>
    </LiveProvider>
  );
}
