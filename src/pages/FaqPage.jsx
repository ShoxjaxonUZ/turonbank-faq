import { useState, useMemo } from "react";
import { Search, MessageCircleQuestion, ChevronDown } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import { faqItems, getCategories, scoreItem } from "../data/faq";

export default function FaqPage({ onOpenChat }) {
  const [faqQuery, setFaqQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [openId, setOpenId] = useState(0);

  const allCategories = useMemo(() => getCategories(faqItems), []);

  const filteredItems = useMemo(() => {
    return faqItems
      .map((item, index) => ({ ...item, id: index, score: scoreItem(item, faqQuery) }))
      .filter((item) => selectedCategory === "Barchasi" || item.category === selectedCategory)
      .filter((item) => !faqQuery.trim() || item.score > 0)
      .sort((a, b) => b.score - a.score || a.id - b.id);
  }, [faqQuery, selectedCategory]);

  return (
    <div className="app-shell">
      <SiteHeader onOpenChat={onOpenChat} />
      <section className="faq-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Bilim bazasi</span>
            <h2>Tez-tez so'raladigan savollar</h2>
          </div>
          <div className="faq-search-wrap">
            <div className="faq-search-box">
              <Search size={18} />
              <input
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="FAQ dan qidiring..."
                aria-label="FAQ qidirish"
              />
            </div>
            <div className="category-tabs" aria-label="Kategoriya tanlash">
              {allCategories.map((category) => (
                <button
                  key={category}
                  className={selectedCategory === category ? "active" : ""}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="faq-layout">
          <div className="faq-list">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const Icon = item.icon;
                const isOpen = openId === item.id;
                return (
                  <article className={`faq-item ${isOpen ? "open" : ""}`} key={item.id}>
                    <button onClick={() => setOpenId(isOpen ? -1 : item.id)}>
                      <span className="item-icon"><Icon size={20} /></span>
                      <span>{item.question}</span>
                      <ChevronDown size={20} />
                    </button>
                    {isOpen && <p>{item.answer}</p>}
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <MessageCircleQuestion size={30} />
                <h3>Mos javob topilmadi</h3>
                <p>Savolni qisqaroq yozing yoki kredit, omonat, karta, MyTuron kabi kalit so'zlardan foydalaning.</p>
              </div>
            )}
          </div>

          <aside className="contact-panel">
            <h3>Rasmiy manbalar</h3>
            <p>Muhim moliyaviy qaror oldidan shartlarni Turonbank rasmiy sayti yoki call-markaz orqali aniqlashtiring.</p>
            <a href="https://turonbank.uz/uz/services/question_answer/3747/" target="_blank" rel="noopener noreferrer">Savol-javoblar</a>
            <a href="https://turonbank.uz/uz/private/deposit/" target="_blank" rel="noopener noreferrer">Omonatlar</a>
            <a href="https://turonbank.uz/uz/private/crediting/" target="_blank" rel="noopener noreferrer">Kreditlash</a>
            <a href="https://turonbank.uz/uz/private/plastic-cards/" target="_blank" rel="noopener noreferrer">Plastik kartalar</a>
          </aside>
        </div>
      </section>
    </div>
  );
}
