import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ViewProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              Thông tin cá nhân
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Chi tiết hồ sơ
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lại
          </button>
        </div>

        <div className="grid gap-6 pb-6">
          <ProfileField label="Họ và tên" value={user.fullName} />
          <ProfileField label="Email" value={user.email} />
          <ProfileField
            label="Ngày tháng năm sinh"
            value={formatDate(user.dateOfBirth)}
          />
          <ProfileField
            label="Vị trí nơi ở"
            value={user.currentAddress || "Chưa cập nhật"}
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Sửa thông tin
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </main>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-950">{value}</p>
      </div>
    </div>
  );
}
