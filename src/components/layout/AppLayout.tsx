import React from "react";
import Navbar from "@/components/layout/Navbar";

const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
