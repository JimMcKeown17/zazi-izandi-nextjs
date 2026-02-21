"use client";

import Header from "@/components/layout/header";

export default function DataPortalPage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: "80px", height: "100vh", display: "flex", flexDirection: "column" }}>
        <iframe
          src="https://data.zazi-izandi.co.za/"
          className="w-full flex-1 border-0"
          style={{ height: "calc(100vh - 80px)" }}
          allowFullScreen
          title="Zazi iZandi Data Portal"
        />
      </div>
    </>
  );
}
