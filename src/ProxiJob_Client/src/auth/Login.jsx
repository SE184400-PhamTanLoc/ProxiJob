import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "./authStorage";
import { useAuth } from "./AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useAuth();
  const [email, setEmail] = useState(location.state?.registeredEmail ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage] = useState(location.state?.message ?? "");

  const handleSubmit = (event) => {
    event.preventDefault();
    const newErrors = {};

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
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = loginUser({ email, password });
    if (!result.ok) {
      setErrors({ submit: result.message });
      return;
    }
    setCurrentUser(result.user);

    navigate("/");
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-6">
      <section className="w-full max-w-md bg-white rounded-3xl p-7 border border-amber-100 shadow-xl shadow-amber-900/10">
        <p className="text-xs font-bold tracking-wide uppercase text-brown-800 mb-2">
          ProxiJob
        </p>
        <h1 className="text-4xl font-bold text-brown-900 mb-2">Đăng nhập</h1>
        <p className="text-brown-700 m-0 mb-4">
          Nhập thông tin để vào trang chủ của bạn.
        </p>

        {successMessage ? (
          <p className="mt-3 rounded-2xl p-3 text-sm bg-green-200 text-green-900">
            {successMessage}
          </p>
        ) : null}
        {errors.submit ? (
          <p className="mt-3 rounded-2xl p-3 text-sm bg-red-200 text-red-900">
            {errors.submit}
          </p>
        ) : null}

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label
            htmlFor="login-email"
            className="text-sm font-semibold text-brown-700"
          >
            Email
          </label>
          <input
            id="login-email"
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
            htmlFor="login-password"
            className="text-sm font-semibold text-brown-700"
          >
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            className={`h-11 rounded-2xl border px-3 text-base outline-none focus:border-tan-400 focus:shadow-lg focus:shadow-tan-400/15 transition ${
              errors.password ? "border-red-400" : "border-amber-200"
            }`}
          />
          {errors.password ? (
            <p className="text-xs text-red-600 -mt-2">{errors.password}</p>
          ) : null}

          <button
            type="submit"
            className="h-11 mt-2 font-bold bg-blue-400 text-black rounded-2xl border-0 cursor-pointer bg-linear-to-r from-tan-600 to-tan-700 hover:brightness-110 transition"
          >
            Đăng nhập
          </button>
          <Link
            to={"/"}
            className="h-11 mt-2 font-bold flex items-center justify-center rounded-2xl border-0 cursor-pointer bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
          >
            Về trang chủ
          </Link>
        </form>

        <p className="mt-4">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-tan-600 font-semibold hover:text-tan-700"
          >
            Đăng ký ngay
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
