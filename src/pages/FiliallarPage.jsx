import { useState, useEffect, useRef } from "react";
import { MapPin, Map, Search, Clock, Phone } from "lucide-react";
import SiteHeader from "../components/SiteHeader";

const filiallar = [
  { nom: "Toshkent shahar filiali", manzil: "100011, Toshkent sh., Shayxontohur tumani, Abay ko'ch. 4a", tel: "+998 95 144-60-00, +998 71 202-01-01", ish: "Dushanba–Juma, 9:00–18:00", lat: 41.3200, lng: 69.2856 },
  { nom: "Zangiota filiali", manzil: "111800, Toshkent viloyati, Zangiota tumani, Mustaqillik ko'ch. 19", tel: "+998 71 150-20-26, +998 71 202-01-01", ish: "Dushanba–Juma, 9:00–18:00", lat: 41.2178, lng: 69.2019 },
  { nom: "Buxoro filiali", manzil: "200113, Buxoro viloyati, Buxoro sh., I. Mo'minova ko'ch. 29/1", tel: "+998 365 223-01-25, +998 365 223-13-42", ish: "Dushanba–Juma, 9:00–18:00", lat: 39.7747, lng: 64.4286 },
  { nom: "Samarqand filiali", manzil: "140154, Samarqand viloyati, Samarqand sh., M. Ulug'bek ko'ch. 62a", tel: "+998 366 233-81-31, +998 366 231-07-72", ish: "Dushanba–Juma, 9:00–18:00", lat: 39.6542, lng: 66.9597 },
  { nom: "Biznes rivojlantirish markazi", manzil: "140118, Samarqand viloyati, Bulung'ur tumani, F. Yuldosh ko'ch. 24", tel: "", ish: "Dushanba–Juma, 9:00–18:00", lat: 39.7637, lng: 67.2731 },
  { nom: "Xorazm filiali", manzil: "220100, Xorazm viloyati, Urganch sh., Xonqa ko'ch. 104a", tel: "+998 362 225-84-50, +998 362 225-84-89", ish: "", lat: 41.5497, lng: 60.6239 },
  { nom: "Qoraqalpog'iston filiali", manzil: "230100, Nukus sh., T. Qayidbergenov ko'ch. 25a", tel: "+998 361 224-11-43, +998 361 222-30-43", ish: "", lat: 42.4626, lng: 59.6122 },
  { nom: "Shahrisabz filiali", manzil: "181300, Qashqadaryo viloyati, Shahrisabz sh., Ipak yo'li ko'ch. 2a", tel: "+998 375 522-57-32, +998 375 522-50-70", ish: "Dushanba–Juma, 9:00–18:00", lat: 39.0581, lng: 66.8350 },
  { nom: "Qarshi filiali", manzil: "180103, Qashqadaryo viloyati, Qarshi sh., Komilon ko'ch. 28", tel: "+998 375 225-59-81, +998 375 225-60-44", ish: "Dushanba–Juma, 9:00–18:00", lat: 38.8610, lng: 65.7942 },
  { nom: "Surxondaryo filiali", manzil: "190100, Surxondaryo viloyati, Termiz sh., F. Xo'jayeva ko'ch. 32", tel: "+998 376 223-06-99, +998 376 223-18-99", ish: "Dushanba–Juma, 9:00–18:00", lat: 37.2242, lng: 67.2783 },
  { nom: "Jizzax filiali", manzil: "131100, Jizzax sh., Islam Karimov ko'ch. 62", tel: "+998 372 223-47-13, +998 372 223-47-10", ish: "Dushanba–Juma, 9:00–18:00", lat: 40.1158, lng: 67.8422 },
  { nom: "Sirdaryo filiali", manzil: "120100, Sirdaryo viloyati, Guliston sh., Xondamir ko'ch. 77a", tel: "+998 367 227-24-00, +998 367 227-22-64", ish: "Dushanba–Juma, 9:00–18:00", lat: 40.4897, lng: 68.7842 },
  { nom: "Farg'ona filiali", manzil: "712000, Farg'ona sh., Ma'rifat ko'ch. 44", tel: "+998 95 485-90-00, +998 373 244-06-16", ish: "Dushanba–Juma, 9:00–18:00", lat: 40.3834, lng: 71.7878 },
  { nom: "Namangan filiali", manzil: "160033, Namangan sh., Ohunboboyev ko'ch. 68a", tel: "+998 369 227-66-96, +998 369 227-68-46", ish: "Dushanba–Juma, 9:00–18:00", lat: 41.0011, lng: 71.6726 },
  { nom: "Navoiy filiali", manzil: "210100, Navoiy sh., M. Tarobiy ko'ch. 55T", tel: "+998 79 220-64-94, +998 436 224-21-08", ish: "Dushanba–Juma, 9:00–18:00", lat: 40.0840, lng: 65.3791 },
];

export default function FiliallarPage({ onOpenChat }) {
  const [query, setQuery] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  const filtered = filiallar.filter(
    (f) => f.nom.toLowerCase().includes(query.toLowerCase()) || f.manzil.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (mapLoaded || !mapRef.current) return;

    import("leaflet").then((L) => {
      if (leafletMap.current) return;

      const map = L.default.map(mapRef.current).setView([41.2995, 69.2401], 6);
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.default.divIcon({
        html: `<div style="background:var(--blue-dark,#003087);width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      filiallar.forEach((f) => {
        L.default.marker([f.lat, f.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${f.nom}</strong><br>${f.manzil}<br>${f.tel}`);
      });

      leafletMap.current = map;
      setMapLoaded(true);
    });
  }, [mapRef.current]);

  return (
    <div className="app-shell">
      <SiteHeader onOpenChat={onOpenChat} />
      <div className="page-inner">
        <div className="page-heading">
          <span className="eyebrow" style={{ color: "var(--blue-mid)" }}>Turonbank tarmog'i</span>
          <h1>Filiallar va ATMlar</h1>
          <p className="page-sub">O'zbekiston bo'ylab Turonbank filiallari</p>
        </div>

        <div ref={mapRef} className="filial-map" />

        <div className="filial-search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filial yoki manzil bo'yicha qidiring..." />
        </div>

        <div className="filial-list">
          {filtered.map((f, i) => (
            <div className="filial-card" key={i}>
              <div className="filial-card__icon"><MapPin size={20} /></div>
              <div className="filial-card__info">
                <strong>{f.nom}</strong>
                <span>{f.manzil}</span>
                {f.tel && <span className="filial-card__tel"><Phone size={13} />{f.tel}</span>}
                {f.ish && <span className="filial-card__ish"><Clock size={13} />{f.ish}</span>}
              </div>
              <a
                className="filial-card__map"
                href={`https://www.google.com/maps?q=${f.lat},${f.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Map size={16} />
                Xaritada
              </a>
            </div>
          ))}
        </div>

        <p className="rates-source">
          Muammo yoki savol: <a href="tel:1220">1220</a> — Turonbank call-markazi
        </p>
      </div>
    </div>
  );
}
