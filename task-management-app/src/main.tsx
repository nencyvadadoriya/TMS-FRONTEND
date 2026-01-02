import {  Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { route } from "./Routes/route";
import "./index.css";

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex items-center gap-3 text-gray-700">
      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
    <Suspense fallback={<Loader />}>
      <RouterProvider router={route} />
    </Suspense>
);
