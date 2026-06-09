import SiteHeader from "../components/SiteHeader";
import HomeMahallalarWidget from "../components/HomeMahallalarWidget";

export default function HomePage({ onOpenChat }) {
  return (
    <div className="app-shell">
      <SiteHeader onOpenChat={onOpenChat} />
      <section className="page-inner" style={{ paddingTop: 0 }}>
        <HomeMahallalarWidget />
      </section>
    </div>
  );
}
