import { useState, useEffect } from "react";
import {
  Sparkles, ArrowRight, MapPin, LoaderCircle,
  TrendingUp, TrendingDown, Users, Home, Briefcase,
  UserX, Heart, Building2, Phone, ChevronRight, Award,
  BarChart3, Target, ShieldCheck, AlertTriangle, CheckCircle2
} from "lucide-react";
import { fetchTumanlar } from "../data/tumanlar";
import { fmt } from "../utils/format";
import { defaultModel } from "../utils/ai";
import { apiUrl } from "../utils/apiBase";
import SiTavsiyasi from "./SiTavsiyasi";

export default function HomeMahallalarWidget() {
  const [tumanlarData, setTumanlarData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTumanId, setActiveTumanId] = useState(null);
  const [activeMahallaId, setActiveMahallaId] = useState(null);
  const [activeSection, setActiveSection] = useState("bosh");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchTumanlar()
      .then(setTumanlarData)
      .finally(() => setDataLoading(false));
  }, []);

  if (dataLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <LoaderCircle size={28} className="spin" />
      </div>
    );
  }

  const activeTuman = tumanlarData.find((t) => t.id === activeTumanId);
  const activeMahalla = activeTuman?.mahallalar.find((m) => m.id === activeMahallaId);

  async function runAiTahlil(mahalla, tuman) {
    setAiText("");
    setAiLoading(true);
    try {
      const prompt = `Sen Turonbank mahalla bankirining AI yordamchisissan. Quyidagi mahalla ma'lumotlari asosida qisqa tahlil va tavsiyalar ber (o'zbek tilida, 5-7 bandda):\n\nMahalla: ${mahalla.nom} MFY, ${tuman.nom}\nAholi: ${mahalla.aholi} nafar\nXonadonlar: ${mahalla.xonadon} ta\nTadbirkorlar: ${mahalla.tadbirkor_bosh} → ${mahalla.tadbirkor_hozir} (o'zgarish: ${mahalla.tadbirkor_hozir - mahalla.tadbirkor_bosh})\nIshsizlar: ${mahalla.ishsizlik_bosh} → ${mahalla.ishsizlik_hozir}\nKambag'al oilalar: ${mahalla.kambagal_bosh} → ${mahalla.kambagal_hozir}\nIxtisoslik: ${mahalla.ixtisoslik}\nBiriktirilgan bank: ${mahalla.bank}\nBankir: ${mahalla.bankir}`;

      const response = await fetch(apiUrl("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: defaultModel, prompt, stream: true }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server xatolik: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const j = JSON.parse(data);
            const token = j.choices?.[0]?.delta?.content || "";
            if (token) setAiText(t => t + token);
          } catch {}
        }
      }
    } catch (e) {
      const msg = e.message || "";
      setAiText(msg.includes("rate limit") || msg.includes("429")
        ? "So'rovlar cheklovi — bir ozdan so'ng qayta urining."
        : "AI tahlil yuklanmadi: " + msg);
    } finally {
      setAiLoading(false);
    }
  }

  if (activeMahalla) {
    const m = activeMahalla;
    const tc = activeTuman.rangi;
    const tadbDelta = m.tadbirkor_hozir - m.tadbirkor_bosh;
    const kamDelta = m.kambagal_bosh - m.kambagal_hozir;
    const ishDelta = m.ishsizlik_bosh - m.ishsizlik_hozir;
    const pctKam = m.aholi > 0 ? ((m.kambagal_hozir / m.aholi) * 100).toFixed(1) : "0";
    const pctTadb = m.aholi > 0 ? ((m.tadbirkor_hozir / m.aholi) * 100).toFixed(1) : "0";
    const pctIsh = m.aholi > 0 ? ((m.ishsizlik_hozir / m.aholi) * 100).toFixed(1) : "0";

    const sidebarItems = [
      { id: "bosh",      label: "Bosh sahifa",               num: null, icon: <BarChart3 size={15}/> },
      { id: "iqtisodiy", label: "Iqtisodiy faollik",         num: 1,    icon: <TrendingUp size={15}/> },
      { id: "infra",     label: "Infratuzilma",              num: 2,    icon: <Home size={15}/> },
      { id: "aholi",     label: "Aholi va bandlik",          num: 3,    icon: <Users size={15}/> },
      { id: "bank",      label: "Tadbirkorlik va bank",      num: 4,    icon: <Building2 size={15}/> },
      { id: "imkoniyat", label: "Imkoniyatlar",              num: 5,    icon: <Target size={15}/> },
      { id: "xulosa",    label: "Xulosa va reja",            num: 6,    icon: <Award size={15}/> },
    ];

    /* ── shared primitives ── */
    function KpiCard({ icon, label, value, sub, trend, trendGood, accent }) {
      const accentColors = {
        blue:   { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
        green:  { bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
        amber:  { bg: "#fffbeb", border: "#f59e0b", text: "#b45309" },
        red:    { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c" },
        purple: { bg: "#faf5ff", border: "#a855f7", text: "#7e22ce" },
      };
      const c = accentColors[accent] || accentColors.blue;
      return (
        <div className="nd-kpi" style={{ "--kpi-border": c.border, "--kpi-bg": c.bg }}>
          <div className="nd-kpi-icon" style={{ color: c.text }}>{icon}</div>
          <div className="nd-kpi-val">{value}</div>
          <div className="nd-kpi-label">{label}</div>
          {sub && <div className="nd-kpi-sub">{sub}</div>}
          {trend != null && (
            <div className={`nd-kpi-trend ${trendGood ? "nd-trend-good" : "nd-trend-bad"}`}>
              {trendGood ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {trend}
            </div>
          )}
        </div>
      );
    }

    function TrendRow({ label, bosh, hozir, goodIfIncrease }) {
      const delta = hozir - bosh;
      const isGood = goodIfIncrease ? delta >= 0 : delta <= 0;
      const pct = bosh > 0 ? Math.abs((delta / bosh) * 100).toFixed(0) : 0;
      const barW = Math.min(100, bosh > 0 ? (hozir / Math.max(bosh, hozir)) * 100 : 0);
      return (
        <div className="nd-trend-row">
          <div className="nd-trend-label">{label}</div>
          <div className="nd-trend-mid">
            <div className="nd-trend-nums">
              <span className="nd-from">{fmt(bosh)}</span>
              <span className="nd-arrow">→</span>
              <span className="nd-to">{fmt(hozir)}</span>
            </div>
            <div className="nd-bar">
              <div className="nd-bar-fill" style={{ width: `${barW}%`, background: isGood ? "#22c55e" : "#ef4444" }} />
            </div>
          </div>
          <div className={`nd-trend-tag ${isGood ? "tag-good" : "tag-bad"}`}>
            {delta >= 0 ? "+" : ""}{delta} <span>({pct}%)</span>
          </div>
        </div>
      );
    }

    function SecHeader({ icon, num, title }) {
      return (
        <div className="nd-sec-header" style={{ "--tc": tc }}>
          <div className="nd-sec-icon">{icon}</div>
          {num && <span className="nd-sec-num">{num}</span>}
          <h3>{title}</h3>
        </div>
      );
    }

    function AiBlock() {
      return (
        <div className="nd-ai-block">
          <div className="nd-ai-header">
            <div className="nd-ai-title"><Sparkles size={16}/><span>Sun'iy intellekt tahlili</span></div>
            {!aiText && !aiLoading && (
              <button className="nd-ai-btn" onClick={() => runAiTahlil(m, activeTuman)}>Tahlil qilish</button>
            )}
            {(aiText || aiLoading) && (
              <button className="nd-ai-btn nd-ai-btn--ghost" onClick={() => { setAiText(""); setAiLoading(false); }}>Yangilash</button>
            )}
          </div>
          {!aiText && !aiLoading && (
            <div className="nd-ai-empty">
              <Sparkles size={22} opacity={0.25}/>
              <p>Mahalla ma'lumotlari asosida to'liq AI tahlil olish uchun tugmani bosing</p>
            </div>
          )}
          {aiLoading && !aiText && (
            <div className="nd-ai-loading"><LoaderCircle size={18} className="spin"/><span>Tahlil yuklanmoqda...</span></div>
          )}
          {aiText && (
            <div className="nd-ai-rows">
              {aiText.split("\n").filter(l => l.trim()).map((line, i) => (
                <div className="nd-ai-row" key={i}>
                  <div className="nd-ai-dot"/>
                  <p style={{ fontWeight: /^\d+\./.test(line.trim()) ? 700 : 400 }}>{line}</p>
                </div>
              ))}
              {aiLoading && <span className="chat-cursor"/>}
            </div>
          )}
        </div>
      );
    }

    function StatCompare({ label, bosh, hozir, unit, icon, goodIfIncrease }) {
      const delta = hozir - bosh;
      const isGood = goodIfIncrease ? delta >= 0 : delta <= 0;
      return (
        <div className="nd-stat-compare">
          <div className="nd-sc-icon">{icon}</div>
          <div className="nd-sc-body">
            <div className="nd-sc-label">{label}</div>
            <div className="nd-sc-values">
              <div className="nd-sc-col">
                <span className="nd-sc-num">{fmt(bosh)}</span>
                <span className="nd-sc-tag">Yil boshi</span>
              </div>
              <div className="nd-sc-divider"/>
              <div className="nd-sc-col">
                <span className="nd-sc-num nd-sc-num--now">{fmt(hozir)}</span>
                <span className="nd-sc-tag">Hozir</span>
              </div>
              <div className={`nd-sc-delta ${isGood ? "delta-good" : "delta-bad"}`}>
                {delta >= 0 ? "+" : ""}{delta} {unit}
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ── sections ── */
    function renderSection() {

      /* ────── BOSH SAHIFA ────── */
      if (activeSection === "bosh") return (
        <div className="nd-page">
          <SecHeader icon={<BarChart3 size={16}/>} title={`${m.nom} MFY — Umumiy ko'rsatkichlar`}/>

          <div className="nd-kpi-grid">
            <KpiCard icon={<Users size={20}/>} label="Aholi" value={fmt(m.aholi)} sub={`${fmt(m.xonadon)} ta xonadon`} accent="blue"/>
            <KpiCard icon={<Briefcase size={20}/>} label="Tadbirkorlar" value={fmt(m.tadbirkor_hozir)}
              sub={`${pctTadb}% aholi`}
              trend={`${tadbDelta >= 0 ? "+" : ""}${tadbDelta} ta`}
              trendGood={tadbDelta >= 0} accent="green"/>
            <KpiCard icon={<UserX size={20}/>} label="Ishsizlar" value={fmt(m.ishsizlik_hozir)}
              sub={`${pctIsh}% aholi`}
              trend={`${ishDelta >= 0 ? "−" : "+"}${Math.abs(ishDelta)} ta`}
              trendGood={ishDelta >= 0} accent="amber"/>
            <KpiCard icon={<Heart size={20}/>} label="Kambag'al oilalar" value={fmt(m.kambagal_hozir)}
              sub={`${pctKam}% aholi`}
              trend={`${kamDelta >= 0 ? "−" : "+"}${Math.abs(kamDelta)} oila`}
              trendGood={kamDelta >= 0} accent="red"/>
          </div>

          <div className="nd-section-card">
            <div className="nd-section-card-title">Dinamika: yil boshi → hozir</div>
            <TrendRow label="Tadbirkorlar" bosh={m.tadbirkor_bosh} hozir={m.tadbirkor_hozir} goodIfIncrease={true}/>
            <TrendRow label="Ishsizlar" bosh={m.ishsizlik_bosh} hozir={m.ishsizlik_hozir} goodIfIncrease={false}/>
            <TrendRow label="Kambag'al oilalar" bosh={m.kambagal_bosh} hozir={m.kambagal_hozir} goodIfIncrease={false}/>
          </div>

          {(m.bank || m.bankir || m.agent || m.ixtisoslik) && (
            <div className="nd-info-strip">
              {m.ixtisoslik && (
                <div className="nd-info-chip">
                  <Target size={14}/>
                  <div><span className="nd-info-chip-key">Ixtisoslik</span><span className="nd-info-chip-val">{m.ixtisoslik}</span></div>
                </div>
              )}
              {m.bank && (
                <div className="nd-info-chip">
                  <Building2 size={14}/>
                  <div><span className="nd-info-chip-key">Bank</span><span className="nd-info-chip-val">{m.bank}</span></div>
                </div>
              )}
              {m.bankir && (
                <div className="nd-info-chip">
                  <Users size={14}/>
                  <div><span className="nd-info-chip-key">Bankir</span><span className="nd-info-chip-val">{m.bankir}</span></div>
                </div>
              )}
              {m.agent && (
                <div className="nd-info-chip">
                  <Phone size={14}/>
                  <div><span className="nd-info-chip-key">Agent</span><span className="nd-info-chip-val">{m.agent}</span></div>
                </div>
              )}
            </div>
          )}

          <AiBlock/>
        </div>
      );

      /* ────── IQTISODIY FAOLLIK ────── */
      if (activeSection === "iqtisodiy") return (
        <div className="nd-page">
          <SecHeader icon={<TrendingUp size={16}/>} num="1" title="Iqtisodiy faollik"/>

          <div className="nd-hero-metric" style={{ "--tc": tc }}>
            <div className="nd-hm-left">
              <div className="nd-hm-label">Faol tadbirkorlar</div>
              <div className="nd-hm-value">{fmt(m.tadbirkor_hozir)}</div>
              <div className="nd-hm-sub">Aholi ichida: {pctTadb}%</div>
            </div>
            <div className="nd-hm-right">
              <div className={`nd-hm-delta ${tadbDelta >= 0 ? "hm-good" : "hm-bad"}`}>
                {tadbDelta >= 0 ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
                <span>{tadbDelta >= 0 ? "+" : ""}{tadbDelta}</span>
                <small>yil boshidan</small>
              </div>
            </div>
          </div>

          <div className="nd-compare-grid">
            <StatCompare label="Tadbirkorlar soni" bosh={m.tadbirkor_bosh} hozir={m.tadbirkor_hozir} unit="ta" icon={<Briefcase size={18}/>} goodIfIncrease={true}/>
          </div>

          <div className="nd-section-card">
            <div className="nd-section-card-title">Iqtisodiy ko'rsatkichlar</div>
            <div className="nd-detail-rows">
              <div className="nd-detail-row">
                <span>Tadbirkorlik qamrovi</span>
                <strong>{pctTadb}% aholi</strong>
              </div>
              <div className="nd-detail-row">
                <span>Yil boshi holati</span>
                <strong>{fmt(m.tadbirkor_bosh)} ta</strong>
              </div>
              <div className="nd-detail-row">
                <span>Hozirgi holat</span>
                <strong>{fmt(m.tadbirkor_hozir)} ta</strong>
              </div>
              <div className="nd-detail-row">
                <span>O'sish / kamayish</span>
                <strong className={tadbDelta >= 0 ? "txt-green" : "txt-red"}>
                  {tadbDelta >= 0 ? "+" : ""}{tadbDelta} ta ({m.tadbirkor_bosh > 0 ? Math.abs((tadbDelta/m.tadbirkor_bosh)*100).toFixed(0) : 0}%)
                </strong>
              </div>
              {m.ixtisoslik && (
                <div className="nd-detail-row">
                  <span>Mahalla ixtisosl.</span>
                  <strong>{m.ixtisoslik}</strong>
                </div>
              )}
            </div>
          </div>
          <AiBlock/>
        </div>
      );

      /* ────── INFRATUZILMA ────── */
      if (activeSection === "infra") return (
        <div className="nd-page">
          <SecHeader icon={<Home size={16}/>} num="2" title="Infratuzilma"/>

          <div className="nd-kpi-grid">
            <KpiCard icon={<Home size={20}/>} label="Xonadonlar" value={fmt(m.xonadon)} sub="ta uy-joy" accent="blue"/>
            <KpiCard icon={<Users size={20}/>} label="Aholi zichligi" value={m.xonadon > 0 ? (m.aholi / m.xonadon).toFixed(1) : "—"} sub="nafar/xonadon" accent="purple"/>
            <KpiCard icon={<Users size={20}/>} label="Jami aholi" value={fmt(m.aholi)} sub="nafar" accent="green"/>
          </div>

          {m.ixtisoslik && (
            <div className="nd-highlight-card" style={{ "--tc": tc }}>
              <div className="nd-hl-icon"><Target size={24}/></div>
              <div className="nd-hl-body">
                <div className="nd-hl-label">Mahalla ixtisoslashuvi (driver)</div>
                <div className="nd-hl-value">{m.ixtisoslik}</div>
              </div>
            </div>
          )}

          <div className="nd-section-card">
            <div className="nd-section-card-title">Infratuzilma ko'rsatkichlari</div>
            <div className="nd-detail-rows">
              <div className="nd-detail-row">
                <span>Jami aholi</span>
                <strong>{fmt(m.aholi)} nafar</strong>
              </div>
              <div className="nd-detail-row">
                <span>Xonadonlar soni</span>
                <strong>{fmt(m.xonadon)} ta</strong>
              </div>
              <div className="nd-detail-row">
                <span>O'rtacha oila hajmi</span>
                <strong>{m.xonadon > 0 ? (m.aholi / m.xonadon).toFixed(1) : "—"} nafar</strong>
              </div>
            </div>
          </div>
          <AiBlock/>
        </div>
      );

      /* ────── AHOLI VA BANDLIK ────── */
      if (activeSection === "aholi") return (
        <div className="nd-page">
          <SecHeader icon={<Users size={16}/>} num="3" title="Aholi va bandlik"/>

          <div className="nd-kpi-grid">
            <KpiCard icon={<Users size={20}/>} label="Jami aholi" value={fmt(m.aholi)} sub="nafar" accent="blue"/>
            <KpiCard icon={<Briefcase size={20}/>} label="Bandlik darajasi"
              value={`${pctTadb}%`} sub="tadbirkorlik qamrovi"
              trend={`${tadbDelta >= 0 ? "+" : ""}${tadbDelta} ta`}
              trendGood={tadbDelta >= 0} accent="green"/>
            <KpiCard icon={<UserX size={20}/>} label="Ishsizlik darajasi"
              value={`${pctIsh}%`} sub={`${fmt(m.ishsizlik_hozir)} nafar`}
              trend={`${ishDelta >= 0 ? "−" : "+"}${Math.abs(ishDelta)} ta`}
              trendGood={ishDelta >= 0} accent="amber"/>
          </div>

          <div className="nd-compare-grid">
            <StatCompare label="Tadbirkorlik dinamikasi" bosh={m.tadbirkor_bosh} hozir={m.tadbirkor_hozir} unit="ta" icon={<TrendingUp size={18}/>} goodIfIncrease={true}/>
            <StatCompare label="Ishsizlik dinamikasi" bosh={m.ishsizlik_bosh} hozir={m.ishsizlik_hozir} unit="nafar" icon={<UserX size={18}/>} goodIfIncrease={false}/>
          </div>

          <div className="nd-section-card">
            <div className="nd-section-card-title">Bandlik tahlili</div>
            <TrendRow label="Tadbirkorlar" bosh={m.tadbirkor_bosh} hozir={m.tadbirkor_hozir} goodIfIncrease={true}/>
            <TrendRow label="Ishsizlar" bosh={m.ishsizlik_bosh} hozir={m.ishsizlik_hozir} goodIfIncrease={false}/>
          </div>
          <AiBlock/>
        </div>
      );

      /* ────── BANK ────── */
      if (activeSection === "bank") return (
        <div className="nd-page">
          <SecHeader icon={<Building2 size={16}/>} num="4" title="Mahalla tadbirkorligi va bank"/>

          <div className="nd-bank-hero" style={{ "--tc": tc }}>
            <div className="nd-bank-hero-top">
              <Building2 size={32}/>
              <div>
                <div className="nd-bank-hero-label">Biriktirilgan bank</div>
                <div className="nd-bank-hero-name">{m.bank || "Belgilanmagan"}</div>
              </div>
            </div>
            <div className="nd-bank-contacts">
              {m.bankir && (
                <div className="nd-bank-contact-row">
                  <div className="nd-bank-contact-icon"><Users size={16}/></div>
                  <div>
                    <div className="nd-bank-contact-key">Mahalla bankiri</div>
                    <div className="nd-bank-contact-val">{m.bankir}</div>
                  </div>
                </div>
              )}
              {m.agent && (
                <div className="nd-bank-contact-row">
                  <div className="nd-bank-contact-icon"><Phone size={16}/></div>
                  <div>
                    <div className="nd-bank-contact-key">Yordam agenti</div>
                    <div className="nd-bank-contact-val">{m.agent}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="nd-section-card">
            <div className="nd-section-card-title">Tadbirkorlik ko'rsatkichlari</div>
            <div className="nd-detail-rows">
              <div className="nd-detail-row">
                <span>Faol tadbirkorlar</span>
                <strong>{fmt(m.tadbirkor_hozir)} ta</strong>
              </div>
              <div className="nd-detail-row">
                <span>Yil boshidan o'zgarish</span>
                <strong className={tadbDelta >= 0 ? "txt-green" : "txt-red"}>
                  {tadbDelta >= 0 ? "+" : ""}{tadbDelta} ta
                </strong>
              </div>
              <div className="nd-detail-row">
                <span>Aholi qamrovi</span>
                <strong>{pctTadb}%</strong>
              </div>
              {m.ixtisoslik && (
                <div className="nd-detail-row">
                  <span>Mahalla driver</span>
                  <strong>{m.ixtisoslik}</strong>
                </div>
              )}
            </div>
          </div>
          <AiBlock/>
        </div>
      );

      /* ────── IMKONIYATLAR ────── */
      if (activeSection === "imkoniyat") return (
        <div className="nd-page">
          <SecHeader icon={<Target size={16}/>} num="5" title="Imkoniyatlar"/>

          <div className="nd-oppo-grid">
            <div className="nd-oppo-card nd-oppo-card--green">
              <div className="nd-oppo-icon"><TrendingUp size={24}/></div>
              <div className="nd-oppo-title">Tadbirkorlik o'sishi</div>
              <div className="nd-oppo-value">{tadbDelta >= 0 ? "+" : ""}{tadbDelta} ta</div>
              <div className="nd-oppo-sub">Yil davomida {tadbDelta >= 0 ? "qo'shilgan" : "kamaygan"} tadbirkor</div>
            </div>
            <div className={`nd-oppo-card ${kamDelta >= 0 ? "nd-oppo-card--green" : "nd-oppo-card--red"}`}>
              <div className="nd-oppo-icon"><Heart size={24}/></div>
              <div className="nd-oppo-title">Kambag'allikdan chiqish</div>
              <div className="nd-oppo-value">{kamDelta >= 0 ? "−" : "+"}{Math.abs(kamDelta)} oila</div>
              <div className="nd-oppo-sub">{kamDelta >= 0 ? "Kamaydi — ijobiy dinamika" : "Ko'paydi — e'tibor talab etadi"}</div>
            </div>
            <div className={`nd-oppo-card ${ishDelta >= 0 ? "nd-oppo-card--green" : "nd-oppo-card--amber"}`}>
              <div className="nd-oppo-icon"><UserX size={24}/></div>
              <div className="nd-oppo-title">Ishsizlikni kamaytirish</div>
              <div className="nd-oppo-value">{ishDelta >= 0 ? "−" : "+"}{Math.abs(ishDelta)} nafar</div>
              <div className="nd-oppo-sub">{ishDelta >= 0 ? "Kamaydi — ijobiy dinamika" : "Ko'paydi — e'tibor talab etadi"}</div>
            </div>
          </div>

          <div className="nd-section-card">
            <div className="nd-section-card-title">Kredit va moliyaviy imkoniyatlar</div>
            <div className="nd-detail-rows">
              <div className="nd-detail-row">
                <span>Tadbirkorlik qamrovi</span>
                <strong>{pctTadb}% aholi</strong>
              </div>
              <div className="nd-detail-row">
                <span>Kambag'al oilalar (hozir)</span>
                <strong>{fmt(m.kambagal_hozir)} ta ({pctKam}%)</strong>
              </div>
              <div className="nd-detail-row">
                <span>Kredit salohiyati</span>
                <strong className="txt-green">
                  {m.aholi > 0 ? (((m.aholi - m.kambagal_hozir) / m.aholi) * 100).toFixed(0) : 0}% aholi
                </strong>
              </div>
            </div>
          </div>
          <AiBlock/>
        </div>
      );

      /* ────── XULOSA VA REJA ────── */
      if (activeSection === "xulosa") return (
        <div className="nd-page">
          <SecHeader icon={<Award size={16}/>} num="6" title="Xulosa va reja"/>

          <div className="nd-xulosa-score" style={{ "--tc": tc }}>
            <div className="nd-xs-left">
              <div className="nd-xs-title">Mahalla sog'ligi</div>
              <div className="nd-xs-name">{m.nom} MFY</div>
              <div className="nd-xs-sub">{activeTuman.nom} • 2026-yil holati</div>
            </div>
            <div className="nd-xs-indicators">
              {[
                { label: "Tadbirkorlik", ok: tadbDelta >= 0 },
                { label: "Ishsizlik", ok: ishDelta >= 0 },
                { label: "Kambag'allik", ok: kamDelta >= 0 },
              ].map(({ label, ok }) => (
                <div key={label} className="nd-xs-ind">
                  {ok
                    ? <CheckCircle2 size={18} color="#22c55e"/>
                    : <AlertTriangle size={18} color="#f59e0b"/>}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="nd-xulosa-grid">
            <div className="nd-section-card">
              <div className="nd-section-card-title">Asosiy ko'rsatkichlar</div>
              <div className="nd-detail-rows">
                <div className="nd-detail-row"><span>Aholi</span><strong>{fmt(m.aholi)} nafar</strong></div>
                <div className="nd-detail-row"><span>Xonadonlar</span><strong>{fmt(m.xonadon)} ta</strong></div>
                <div className="nd-detail-row"><span>Tadbirkorlar</span><strong>{fmt(m.tadbirkor_hozir)} ta</strong></div>
                <div className="nd-detail-row"><span>Ishsizlar</span><strong>{fmt(m.ishsizlik_hozir)} nafar</strong></div>
                <div className="nd-detail-row"><span>Kambag'al oilalar</span><strong>{fmt(m.kambagal_hozir)} ta</strong></div>
              </div>
            </div>
            <div className="nd-section-card">
              <div className="nd-section-card-title">Yillik dinamika</div>
              <div className="nd-detail-rows">
                <div className="nd-detail-row">
                  <span>Tadbirkorlar</span>
                  <strong className={tadbDelta >= 0 ? "txt-green" : "txt-red"}>
                    {tadbDelta >= 0 ? "+" : ""}{tadbDelta} ta
                  </strong>
                </div>
                <div className="nd-detail-row">
                  <span>Ishsizlar</span>
                  <strong className={ishDelta >= 0 ? "txt-green" : "txt-red"}>
                    {ishDelta >= 0 ? "−" : "+"}{Math.abs(ishDelta)} nafar
                  </strong>
                </div>
                <div className="nd-detail-row">
                  <span>Kambag'al oilalar</span>
                  <strong className={kamDelta >= 0 ? "txt-green" : "txt-red"}>
                    {kamDelta >= 0 ? "−" : "+"}{Math.abs(kamDelta)} oila
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <AiBlock/>
        </div>
      );

      return null;
    }

    return (
      <div>
        <div className="mah-breadcrumb">
          <button onClick={() => { setActiveTumanId(null); setActiveMahallaId(null); setActiveSection("bosh"); }}>Tumanlar</button>
          <span>›</span>
          <button onClick={() => { setActiveMahallaId(null); setActiveSection("bosh"); }}>{activeTuman.nom}</button>
          <span>›</span>
          <span>{m.nom}</span>
        </div>

        <div className="nd-hero" style={{ "--tc": tc }}>
          <div className="nd-hero-inner">
            <div className="nd-hero-left">
              <div className="nd-hero-eyebrow">{activeTuman.nom}</div>
              <h2 className="nd-hero-title">{m.nom} MFY</h2>
              <div className="nd-hero-meta">
                <span>2026-yil • Turonbank mahalla portali</span>
                {m.ixtisoslik && <span className="nd-hero-tag">{m.ixtisoslik}</span>}
              </div>
            </div>
            <div className="nd-hero-stats">
              <div className="nd-hero-stat">
                <span className="nd-hero-stat-val">{fmt(m.aholi)}</span>
                <span className="nd-hero-stat-lbl">Aholi</span>
              </div>
              <div className="nd-hero-sep"/>
              <div className="nd-hero-stat">
                <span className="nd-hero-stat-val">{fmt(m.xonadon)}</span>
                <span className="nd-hero-stat-lbl">Xonadon</span>
              </div>
              <div className="nd-hero-sep"/>
              <div className="nd-hero-stat">
                <span className="nd-hero-stat-val">{fmt(m.tadbirkor_hozir)}</span>
                <span className="nd-hero-stat-lbl">Tadbirkor</span>
              </div>
            </div>
          </div>
        </div>

        <div className="nd-layout">
          <nav className="nd-sidebar">
            {sidebarItems.map(({ id, label, num, icon }) => (
              <button
                key={id}
                className={`nd-nav-item${activeSection === id ? " active" : ""}`}
                style={{ "--tc": tc }}
                onClick={() => setActiveSection(id)}
              >
                <span className="nd-nav-icon">{icon}</span>
                <span className="nd-nav-label">{label}</span>
                {num != null && <span className="nd-nav-num">{num}</span>}
                <ChevronRight size={14} className="nd-nav-arrow"/>
              </button>
            ))}
          </nav>
          <div className="nd-main">
            {renderSection()}
          </div>
        </div>
      </div>
    );
  }

  /* ── TUMAN VIEW ── */
  if (activeTuman) {
    const tumanAholi = activeTuman.mahallalar.reduce((a, m) => a + (m.aholi || 0), 0);
    const tumanTadb = activeTuman.mahallalar.reduce((a, m) => a + (m.tadbirkor_hozir || 0), 0);
    return (
      <div>
        <div className="mah-breadcrumb">
          <button onClick={() => setActiveTumanId(null)}>Tumanlar</button>
          <span>›</span>
          <span>{activeTuman.nom}</span>
        </div>
        <div className="tuman-detail-hero" style={{ "--tc": activeTuman.rangi }}>
          <div className="tdh-bg"/>
          <div className="tdh-inner">
            <div className="tdh-left">
              <div className="tdh-eyebrow">Tuman mahallalari</div>
              <h2 className="tdh-title">{activeTuman.nom}</h2>
              <p className="tdh-sub">Quyidagi mahallalardan birini tanlang</p>
            </div>
            <div className="tdh-stats">
              {[
                { val: activeTuman.mahallalar.length, lbl: "Mahalla" },
                { val: (tumanAholi / 1000).toFixed(1) + "K", lbl: "Aholi" },
                { val: tumanTadb, lbl: "Tadbirkor" },
              ].map(({ val, lbl }) => (
                <div className="tdh-stat" key={lbl}>
                  <span className="tdh-stat-val">{val}</span>
                  <span className="tdh-stat-lbl">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mah-v2-grid">
          {activeTuman.mahallalar.map((m, idx) => {
            const tadbDelta = m.tadbirkor_hozir - m.tadbirkor_bosh;
            return (
              <button key={m.id} className="mah-card-v2" onClick={() => setActiveMahallaId(m.id)} style={{ "--tc": activeTuman.rangi }}>
                <div className="mcv2-num">#{idx + 1}</div>
                <div className="mcv2-name">{m.nom} MFY</div>
                <div className="mcv2-stats">
                  <div className="mcv2-stat">
                    <span className="mcv2-val">{(m.aholi / 1000).toFixed(1)}K</span>
                    <span className="mcv2-lbl">aholi</span>
                  </div>
                  <div className="mcv2-divider"/>
                  <div className="mcv2-stat">
                    <span className="mcv2-val">{m.tadbirkor_hozir}</span>
                    <span className="mcv2-lbl">tadbirkor</span>
                  </div>
                  <div className="mcv2-divider"/>
                  <div className="mcv2-stat">
                    <span className="mcv2-val" style={{ color: tadbDelta >= 0 ? "#16a34a" : "#dc2626" }}>
                      {tadbDelta >= 0 ? "+" : ""}{tadbDelta}
                    </span>
                    <span className="mcv2-lbl">o'sish</span>
                  </div>
                </div>
                <div className="mcv2-ixtisoslik">{m.ixtisoslik}</div>
                <div className="mcv2-footer">
                  <span>{activeTuman.nom}</span>
                  <ArrowRight size={15}/>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── MAIN (tuman list) ── */
  const totalAholi = tumanlarData.reduce((s, t) => s + t.mahallalar.reduce((a, m) => a + (m.aholi || 0), 0), 0);
  const totalMahalla = tumanlarData.flatMap(t => t.mahallalar).length;

  return (
    <div>
      <div className="tuman-page-hero">
        <div>
          <div className="tuman-page-eyebrow">Turonbank • 2026</div>
          <h2 className="tuman-page-title">Mahallalar ma'lumotlar bazasi</h2>
          <p className="tuman-page-sub">Toshkent shahri bo'yicha {tumanlarData.length} ta tuman, {totalMahalla} ta mahalla</p>
        </div>
        <div className="tuman-page-stats">
          <div className="tuman-page-stat"><span className="tps-val">{tumanlarData.length}</span><span className="tps-label">Tuman</span></div>
          <div className="tuman-page-stat"><span className="tps-val">{totalMahalla}</span><span className="tps-label">Mahalla</span></div>
          <div className="tuman-page-stat"><span className="tps-val">{(totalAholi / 1000).toFixed(0)}K</span><span className="tps-label">Aholi</span></div>
        </div>
      </div>
      <div className="tuman-grid">
        {tumanlarData.map((t) => {
          const tumanAholi = t.mahallalar.reduce((a, m) => a + (m.aholi || 0), 0);
          const tumanTadb = t.mahallalar.reduce((a, m) => a + (m.tadbirkor_hozir || 0), 0);
          return (
            <button key={t.id} className="tuman-card-v2" onClick={() => setActiveTumanId(t.id)} style={{ "--tc": t.rangi }}>
              <div className="tcv2-bg"/>
              <div className="tcv2-inner">
                <div className="tcv2-top">
                  <div className="tcv2-icon"><MapPin size={18}/></div>
                  <div className="tcv2-badge">{t.mahallalar.length} mahalla</div>
                </div>
                <div className="tcv2-name">{t.nom}</div>
                <div className="tcv2-stats">
                  <div className="tcv2-stat">
                    <span className="tcv2-stat-val">{(tumanAholi / 1000).toFixed(1)}K</span>
                    <span className="tcv2-stat-lbl">aholi</span>
                  </div>
                  <div className="tcv2-divider"/>
                  <div className="tcv2-stat">
                    <span className="tcv2-stat-val">{tumanTadb}</span>
                    <span className="tcv2-stat-lbl">tadbirkor</span>
                  </div>
                </div>
                <div className="tcv2-mahallalar">
                  {t.mahallalar.map((m) => <span key={m.id}>{m.nom}</span>)}
                </div>
                <div className="tcv2-footer">
                  <span>Batafsil ko'rish</span>
                  <ArrowRight size={15}/>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
