import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "./authStorage";

function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Email không hợp lệ. Vui lòng kiểm tra lại.";
      }
    }

    if (!password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không trùng khớp.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = registerUser({ fullName, email, password, role });
    if (!result.ok) {
      setErrors({ submit: result.message });
      return;
    }

    navigate("/login", {
      state: {
        registeredEmail: email,
        message: result.message,
      },
    });
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-6">
      <section className="w-full max-w-md bg-white rounded-3xl p-7 border border-amber-100 shadow-xl shadow-amber-900/10">
        <p className="text-xs font-bold tracking-wide uppercase text-brown-800 mb-2">
          ProxiJob
        </p>
        <h1 className="text-4xl font-bold text-brown-900 mb-2">Đăng ký</h1>
        <h2></h2>
        <p className="text-brown-700 m-0 mb-4">
          Tạo tài khoản mới để bắt đầu sử dụng hệ thống.
        </p>
        <label className="text-sm font-semibold text-brown-700 mb-2 block">
          Bạn là
        </label>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 h-12 rounded-2xl font-bold transition ${
              role === "student"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40 border-0"
                : "border-2 border-slate-300 bg-white text-slate-700 hover:border-amber-400 hover:shadow-md"
            }`}
          >
            👨‍🎓 Sinh viên
          </button>
          <button
            type="button"
            onClick={() => setRole("restaurant")}
            className={`flex-1 h-12 rounded-2xl font-bold transition ${
              role === "restaurant"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40 border-0"
                : "border-2 border-slate-300 bg-white text-slate-700 hover:border-amber-400 hover:shadow-md"
            }`}
          >
            🏪 Chủ nhà hàng
          </button>
        </div>
        {errors.submit ? (
          <p className="mt-3 rounded-2xl p-3 text-sm bg-red-200 text-red-900">
            {errors.submit}
          </p>
        ) : null}

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label
            htmlFor="register-fullname"
            className="text-sm font-semibold text-brown-700"
          >
            Họ và tên
          </label>
          <input
            id="register-fullname"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nguyễn Văn A"
            className={`h-11 rounded-2xl border px-3 text-base outline-none focus:border-tan-400 focus:shadow-lg focus:shadow-tan-400/15 transition ${
              errors.fullName ? "border-red-400" : "border-amber-200"
            }`}
          />
          {errors.fullName ? (
            <p className="text-xs text-red-600 -mt-2">{errors.fullName}</p>
          ) : null}

          <label
            htmlFor="register-email"
            className="text-sm font-semibold text-brown-700"
          >
            Email
          </label>
          <input
            id="register-email"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={`h-11 rounded-2xl border px-3 text-base outline-none focus:border-tan-400 focus:shadow-lg focus:shadow-tan-400/15 transition ${
              errors.email ? "border-red-400" : "border-amber-200"
            }`}
          />
          {errors.email ? (
            <p className="text-xs text-red-600 -mt-2">{errors.email}</p>
          ) : null}

          <label
            htmlFor="register-password"
            className="text-sm font-semibold text-brown-700"
          >
            Mật khẩu
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            className={`h-11 rounded-2xl border px-3 text-base outline-none focus:border-tan-400 focus:shadow-lg focus:shadow-tan-400/15 transition ${
              errors.password ? "border-red-400" : "border-amber-200"
            }`}
          />
          {errors.password ? (
            <p className="text-xs text-red-600 -mt-2">{errors.password}</p>
          ) : null}

          <label
            htmlFor="register-confirm-password"
            className="text-sm font-semibold text-brown-700"
          >
            Xác nhận mật khẩu
          </label>
          <input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Nhập lại mật khẩu"
            className={`h-11 rounded-2xl border px-3 text-base outline-none focus:border-tan-400 focus:shadow-lg focus:shadow-tan-400/15 transition ${
              errors.confirmPassword ? "border-red-400" : "border-amber-200"
            }`}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-red-600 -mt-2">
              {errors.confirmPassword}
            </p>
          ) : null}

          <button
            type="submit"
            className="h-11 mt-2 font-bold bg-blue-400 text-black rounded-2xl border-0 cursor-pointer bg-linear-to-r from-tan-600 to-tan-700 hover:brightness-110 transition"
          >
            Tạo tài khoản
          </button>
          <Link
            to={"/"}
            className="h-11 mt-2 font-bold flex items-center justify-center rounded-2xl border-0 cursor-pointer bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
          >
            Về trang chủ
          </Link>
        </form>

        <p className="mt-4">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-tan-600 font-semibold hover:text-tan-700"
          >
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
