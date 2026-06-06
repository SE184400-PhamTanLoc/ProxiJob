import { useMemo, useState } from "react";
import {
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Clock3,
  CircleDollarSign,
} from "lucide-react";
import Header from "../homepage/Header";
import Footer from "../homepage/Footer";
import { useAuth } from "../auth/AuthContext";

const jobs = [
  {
    id: 1,
    title: "Phuc vu ban",
    company: "Phở Hà Nội",
    district: "Quận 1, TP.HCM",
    latitude: 10.7756,
    longitude: 106.7019,
    shift: "Ca tối (17h - 22h)",
    salary: "25,000 - 30,000đ/giờ",
    rating: 4.8,
    reviews: 56,
    urgent: true,
    saved: false,
    area: "trung-tam",
  },
  {
    id: 2,
    title: "Pha chế",
    company: "Trà sữa ToCoToCo",
    district: "Quận 3, TP.HCM",
    latitude: 10.7799,
    longitude: 106.6873,
    shift: "Ca sáng/chiều linh hoạt",
    salary: "28,000 - 35,000đ/giờ",
    rating: 4.5,
    reviews: 89,
    urgent: false,
    saved: false,
    area: "trung-tam",
  },
  {
    id: 3,
    title: "Thu ngân",
    company: "Circle K",
    district: "Thủ Đức, TP.HCM",
    latitude: 10.8500,
    longitude: 106.7720,
    shift: "Ca đêm (22h - 6h)",
    salary: "27,000 - 32,000đ/giờ",
    rating: 4.6,
    reviews: 41,
    urgent: false,
    saved: true,
    area: "thu-duc",
  },
  {
    id: 4,
    title: "Bếp phụ",
    company: "Lẩu Gà Ớt Hiểm",
    district: "Bình Thạnh, TP.HCM",
    latitude: 10.8036,
    longitude: 106.705,
    shift: "Ca chiều (15h - 21h)",
    salary: "30,000 - 36,000đ/giờ",
    rating: 4.7,
    reviews: 64,
    urgent: true,
    saved: false,
    area: "binh-thanh",
  },
  {
    id: 5,
    title: "Phụ bếp",
    company: "Sushi House",
    district: "Quận 7, TP.HCM",
    latitude: 10.736,
    longitude: 106.721,
    shift: "Ca tối (18h - 23h)",
    salary: "29,000 - 33,000đ/giờ",
    rating: 4.4,
    reviews: 32,
    urgent: false,
    saved: true,
    area: "quan-7",
  },
];

const areas = [
  { label: "Tất cả khu vực", value: "all" },
  { label: "Trung tâm", value: "trung-tam" },
  { label: "Thủ Đức", value: "thu-duc" },
  { label: "Bình Thạnh", value: "binh-thanh" },
  { label: "Quận 7", value: "quan-7" },
];

function JobCard({ job, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      className={`w-full rounded-3xl border p-6 text-left transition hover:-translate-y-1 sm:p-6 ${
        active
          ? "border-white/70 bg-white/80 shadow-2xl shadow-slate-900/8 backdrop-blur"
          : "border-white/60 bg-white/70 shadow-xl shadow-slate-900/5 backdrop-blur hover:border-white/80"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
          <CircleDollarSign size={24} strokeWidth={1.5} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">
                {job.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {job.company}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {job.distanceKm != null && (
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  {job.distanceKm.toFixed(1)} km
                </span>
              )}
              {job.urgent && (
                <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                  Gấp
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="rounded-full p-1.5 hover:bg-slate-200/50"
              >
                <Heart
                  size={18}
                  className={
                    job.saved ? "fill-rose-500 text-rose-500" : "text-slate-400"
                  }
                />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{job.district}</span>
              {job.distanceKm != null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Cách bạn {job.distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={16} />
              <span>{job.shift}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CircleDollarSign size={16} />
              <span>{job.salary}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-sm">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="font-semibold text-slate-900">{job.rating}</span>
            <span className="text-slate-500">({job.reviews} đánh giá)</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function JobList() {
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("all");
  const [selectedId, setSelectedId] = useState(jobs[0].id);
  const { user } = useAuth();

  const userLocation =
    user?.currentLatitude != null && user?.currentLongitude != null
      ? {
          latitude: Number(user.currentLatitude),
          longitude: Number(user.currentLongitude),
        }
      : null;

  const filteredJobs = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    const jobsWithDistance = jobs.map((job) => ({
      ...job,
      distanceKm: userLocation
        ? haversineDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            job.latitude,
            job.longitude,
          )
        : null,
    }));

    const visibleJobs = jobsWithDistance.filter((job) => {
      const matchKeyword =
        normalized.length === 0 ||
        [job.title, job.company, job.district]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      const matchArea = area === "all" || job.area === area;
      return matchKeyword && matchArea;
    });

    return visibleJobs.sort((left, right) => {
      if (left.distanceKm == null && right.distanceKm == null) return 0;
      if (left.distanceKm == null) return 1;
      if (right.distanceKm == null) return -1;
      return left.distanceKm - right.distanceKm;
    });
  }, [keyword, area, userLocation]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedId) ??
    filteredJobs[0] ??
    null;

  return (
    <div className="min-h-screen text-slate-900">
      <Header />
      <main className="min-h-screen bg-linear-to-b from-[#f8f5ef] via-[#f3efe8] to-[#eef2f5]">
        <section className="mx-auto flex max-w-7xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Tìm việc làm phù hợp
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              Khám phá hàng trăm cơ hội part-time quanh bạn
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="relative block flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm kiếm quán ăn, vị trí..."
                className="h-12 w-full rounded-2xl border border-white/60 bg-white/70 pl-12 pr-4 text-base outline-none shadow-sm shadow-slate-900/5 backdrop-blur transition focus:border-white/80 focus:bg-white/80"
              />
            </label>

            <label className="relative block sm:w-56">
              <SlidersHorizontal
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-white/60 bg-white/70 pl-12 pr-10 text-base text-slate-700 outline-none shadow-sm shadow-slate-900/5 backdrop-blur transition focus:border-white/80 focus:bg-white/80"
              >
                {areas.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                ▼
              </span>
            </label>
          </div>

          <p className="text-base font-medium text-slate-600">
            Tìm thấy{" "}
            <span className="font-bold text-slate-950">
              {filteredJobs.length}
            </span>{" "}
            việc làm phù hợp
          </p>

          {userLocation && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Danh sách được sắp xếp từ gần đến xa theo vị trí của bạn.
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  active={job.id === selectedJob?.id}
                  onSelect={(item) => setSelectedId(item.id)}
                />
              ))}

              {filteredJobs.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/60 bg-white/70 p-8 text-center text-slate-600 backdrop-blur">
                  Không tìm thấy việc làm phù hợp với bộ lọc hiện tại.
                </div>
              )}
            </div>

            <aside className="h-fit rounded-3xl border border-white/70 bg-white/80 p-8 text-center shadow-xl shadow-slate-900/8 backdrop-blur lg:sticky lg:top-20">
              {selectedJob ? (
                <>
                  <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/15">
                    <CircleDollarSign size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {selectedJob.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {selectedJob.company}
                  </p>
                  <div className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-left">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Địa điểm
                      </p>
                      <p className="mt-1 text-base font-medium text-slate-900">
                        {selectedJob.district}
                      </p>
                      {selectedJob.distanceKm != null && (
                        <p className="mt-1 text-sm text-slate-500">
                          Cách bạn khoảng {selectedJob.distanceKm.toFixed(1)} km
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ca làm việc
                      </p>
                      <p className="mt-1 text-base font-medium text-slate-900">
                        {selectedJob.shift}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mức lương
                      </p>
                      <p className="mt-1 text-lg font-bold text-amber-600">
                        {selectedJob.salary}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Đánh giá
                      </p>
                      <div className="mt-1 flex items-center justify-start gap-1">
                        <Star
                          size={16}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span className="text-base font-semibold text-slate-900">
                          {selectedJob.rating}
                        </span>
                        <span className="text-sm text-slate-500">
                          ({selectedJob.reviews} đánh giá)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="mt-6 w-full rounded-2xl bg-linear-to-br from-slate-950 to-slate-700 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:brightness-110">
                    Ứng tuyển ngay
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                    <CircleDollarSign size={24} />
                  </div>
                  <p className="text-lg font-medium text-slate-600">
                    Chọn một việc làm để xem chi tiết
                  </p>
                </>
              )}
            </aside>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default JobList;
