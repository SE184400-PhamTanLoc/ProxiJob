import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import img1 from "../assets/hero-bg.jpg";
const features = [
  {
    title: "Linh hoạt thời gian",
    description: "Ca làm phù hợp với lịch học và thời gian rảnh của sinh viên.",
  },
  {
    title: "Gần trường học",
    description: "Tìm việc quanh khu vực bạn đang sống hoặc học tập.",
  },
  {
    title: "Kết nối trực tiếp",
    description: "Trao đổi nhanh với chủ quán, không qua quy trình rườm rà.",
  },
  {
    title: "Nhiều cơ hội",
    description: "Kho việc làm part-time liên tục cập nhật mỗi ngày.",
  },
];

const roles = [
  {
    name: "Sinh viên",
    description: "Tìm việc dễ hơn, lọc theo lịch học và khu vực mong muốn.",
  },
  {
    name: "Nhà tuyển dụng",
    description: "Đăng tuyển nhanh, tiếp cận đúng ứng viên phù hợp hơn.",
  },
];

function Home({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen text-slate-900">
      <Header />
      <main>
        <section className="mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-20 pt-2 lg:px-4 xl:pt-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 shadow-2xl shadow-slate-900/10">
            <img
              src={img1}
              alt="Sinh viên làm part-time"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/0 to-white/82" />

            <div className="relative z-10 flex min-h-[600px] flex-col items-center px-6 py-10 text-center sm:px-10 lg:px-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Nền tảng tuyển dụng part-time #1
              </span>

              <h1 className="mt-10 mb-8 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
                Kết nối sinh viên với việc làm part-time
              </h1>

              <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={"/joblist"}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-linear-to-br from-slate-950 to-slate-700 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:brightness-110"
                >
                  Tìm việc ngay
                </Link>
                <a
                  href="#roles"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white/85 px-6 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-900/5 backdrop-blur transition hover:border-amber-400 hover:text-amber-700"
                >
                  Đăng tin tuyển dụng
                </a>
              </div>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {[
              ["5,000+", "Sinh viên"],
              ["1,200+", "Quán ăn"],
              ["8,500+", "Việc làm"],
              ["95%", "Hài lòng"],
            ].map(([value, label]) => (
              <article
                key={label}
                className="rounded-3xl border border-white/70 bg-white/85 p-6 text-center shadow-xl shadow-slate-900/8 backdrop-blur"
              >
                <p className="text-4xl font-black tracking-tight text-slate-950">
                  {value}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {label}
                </p>
              </article>
            ))}
          </section>

          <section
            id="features"
            className="grid gap-5 rounded-4xl border border-white/60 bg-white/70 p-6 shadow-2xl shadow-slate-900/8 backdrop-blur sm:p-8 lg:grid-cols-2"
          >
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/70 bg-linear-to-br from-white to-slate-50 p-6 shadow-2xl shadow-slate-900/25 transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-2xl hover:shadow-slate-900/35"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-lg font-black text-white shadow-md shadow-amber-500/15">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h2 className="text-2xl font-bold text-slate-950">
                  {feature.title}
                </h2>
                <p className="mt-3 max-w-sm text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </section>

          <section id="roles" className="space-y-6 text-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Chọn vai trò của bạn
              </h2>
              <p className="mt-3 text-slate-600">
                Mỗi người dùng nhìn thấy trải nghiệm phù hợp với mục tiêu của
                mình.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {roles.map((role) => (
                <article
                  key={role.name}
                  className="rounded-4xl border border-white/70 bg-white/80 p-8 text-left shadow-xl shadow-slate-900/8 backdrop-blur transition hover:-translate-y-1 hover:border-amber-200"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-sm font-black text-white shadow-md shadow-amber-500/15">
                    {role.name.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950">
                    {role.name}
                  </h3>
                  <p className="mt-3 max-w-md text-slate-600">
                    {role.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            id="contact"
            className="overflow-hidden rounded-4xl bg-linear-to-br from-slate-950 via-slate-900 to-stone-800 px-8 py-10 text-white shadow-2xl shadow-slate-900/15 sm:px-10"
          >
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
                Liên hệ nhanh
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Sẵn sàng làm homepage này sáng và hiện đại hơn hẳn bản cũ
              </h2>
              <p className="mt-4 max-w-2xl text-white/85">
                Nếu bạn muốn tiếp tục, tôi có thể tách thêm section, thêm icon,
                hoặc làm bản mobile đẹp hơn nữa mà vẫn giữ style đồng nhất.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Home;
