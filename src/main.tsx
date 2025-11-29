import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light">
        <ConvexProvider client={convex}>
          <App />
          <Toaster />
        </ConvexProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
