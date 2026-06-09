import { StrictMode, useState, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import "./styles.css";

import { faqItems } from "./data/faq";
import { fetchAllBankData } from "./data/bankData";
import { defaultModel } from "./utils/ai";
import ChatWidget from "./components/ChatWidget";

const HomePage = lazy(() => import("./pages/HomePage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const FiliallarPage = lazy(() => import("./pages/FiliallarPage"));
const BusinessPlanPage = lazy(() => import("./pages/BusinessPlanPage"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <LoaderCircle size={32} className="spin" />
    </div>
  );
}

function App() {
  const [model, setModel] = useState(defaultModel);
  const [chatOpen, setChatOpen] = useState(false);
  const [bankData, setBankData] = useState({ tumanlar: [], kreditlar: [], omonatlar: [], kartalar: [] });

  useEffect(() => {
    fetchAllBankData().then(setBankData).catch(() => {});
  }, []);

  const globalChat = (
    <ChatWidget
      faqItems={faqItems}
      bankData={bankData}
      model={model}
      setModel={setModel}
      open={chatOpen}
      setOpen={setChatOpen}
    />
  );

  const openChat = () => setChatOpen(true);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<><HomePage onOpenChat={openChat} />{globalChat}</>} />
          <Route path="/faq" element={<><FaqPage onOpenChat={openChat} />{globalChat}</>} />
          <Route path="/filiallar" element={<><FiliallarPage onOpenChat={openChat} />{globalChat}</>} />
          <Route path="/biznes" element={<><BusinessPlanPage model={model} setModel={setModel} bankData={bankData} onOpenChat={openChat} />{globalChat}</>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
