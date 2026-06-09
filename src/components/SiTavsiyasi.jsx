import { Sparkles } from "lucide-react";

export default function SiTavsiyasi({ tavsiya }) {
  if (!tavsiya) return null;
  return (
    <div className="si-tavsiyasi-box">
      <div className="si-tavsiyasi-header">
        <Sparkles size={13} />
        <span>SI TAVSIYASI</span>
      </div>
      <div className="si-tavsiyasi-body">{tavsiya}</div>
    </div>
  );
}
