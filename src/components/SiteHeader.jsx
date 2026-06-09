import { useState } from "react";
import { MessageCircleQuestion, Map, BriefcaseBusiness, Sparkles, AlignJustify, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function SiteHeader({ onOpenChat }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" onClick={close}>
          <img src="/TuronBank-oq.png" alt="TuronBank" className="header-logo" />
        </Link>

        <nav className="header-nav">
          <Link to="/faq"><MessageCircleQuestion size={16} /><span>FAQ</span></Link>
          <Link to="/filiallar"><Map size={16} /><span>Filiallar</span></Link>
          <Link to="/biznes"><BriefcaseBusiness size={16} /><span>Biznes Reja</span></Link>
          {onOpenChat && (
            <button className="header-ai-btn" onClick={onOpenChat}>
              <Sparkles size={16} /><span>AI Yordamchi</span>
            </button>
          )}
        </nav>

        <button className="burger-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Menyu">
          {menuOpen ? <ArrowRight size={22} style={{ transform: "rotate(90deg)" }} /> : <AlignJustify size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/faq" onClick={close}><MessageCircleQuestion size={18} />FAQ</Link>
          <Link to="/filiallar" onClick={close}><Map size={18} />Filiallar</Link>
          <Link to="/biznes" onClick={close}><BriefcaseBusiness size={18} />Biznes Reja</Link>
          {onOpenChat && (
            <button className="mobile-menu__ai" onClick={() => { close(); onOpenChat(); }}>
              <Sparkles size={18} />AI Yordamchi
            </button>
          )}
        </div>
      )}
    </header>
  );
}
