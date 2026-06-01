import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/85 backdrop-blur-xl shadow-sm shadow-slate-900/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 text-lg font-black text-white shadow-lg shadow-amber-500/20">
            P
          </div>
          <div>
            <span className="block text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              ProxiJob
            </span>
            <span className="block text-xs font-medium text-slate-500">
              Kết nối part-time dễ hơn
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Trang chủ
          </Link>
          <Link
            to="/joblist"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Danh sách việc làm
          </Link>
          <Link
            to="/createWorkSchedule"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Tạo lịch làm việc
          </Link>
        </nav>

        {!user && (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-2xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:brightness-110"
            >
              Bắt đầu ngay
            </Link>
          </div>
        )}
        {user && (
          <UserMenu user={user} onLogout={handleLogout} navigate={navigate} />
        )}
      </div>
    </header>
  );
}

function UserMenu({ user, onLogout, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goProfile = () => {
    setOpen(false);
    navigate("/view-profile");
  };
  const goEditProfile = () => {
    setOpen(false);
    navigate("/profile");
  };
  const goCertificates = () => {
    setOpen(false);
    navigate("/certificates");
  };
  const goNotifications = () => {
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm shadow-slate-900/5">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white"
          aria-expanded={open}
          aria-label="Open user menu"
        >
          {user.fullName?.charAt(0)?.toUpperCase() ?? "U"}
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-950">
            {user.fullName}
          </p>
          <p className="text-xs text-slate-500">Đã đăng nhập</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
        >
          Đăng xuất
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
          <ul className="py-2">
            <li>
              <button
                onClick={goProfile}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                Xem hồ sơ chi tiết
              </button>
            </li>
            <li>
              <button
                onClick={goEditProfile}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                Cập nhật hồ sơ
              </button>
            </li>
            <li>
              <button
                onClick={goCertificates}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                Thêm chứng chỉ
              </button>
            </li>
            <li>
              <button
                onClick={goNotifications}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                Thông báo
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
