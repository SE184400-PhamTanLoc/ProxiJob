import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/60 bg-slate-950/85 py-10 backdrop-blur">
      <div className="flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:px-6 lg:px-8 md:flex-row">
        <Link to="/" className="flex items-center gap-2">
          <div>
            <span className="block text-2xl font-extrabold text-white">
              Về chúng tôi
            </span>
            <span className="block text-xs text-slate-400">
              Tìm việc part-time nhanh hơn
            </span>
          </div>
        </Link>
        <p className="text-sm text-slate-400">Kết nối với chúng tôi.</p>

        <p className="text-sm text-slate-400">© 2026 ProxiJob.</p>
      </div>
      <hr className="my-10 mx-10" />
      <div className="flex ml-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 text-sm font-black text-white shadow-md shadow-amber-500/20">
          P
        </div>
        <span className="block font-black text-white">JobFood</span>
      </div>
    </footer>
  );
}
