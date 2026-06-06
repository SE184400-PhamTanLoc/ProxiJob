import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateCurrentUserProfile } from "../auth/authStorage";

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, setCurrentUser } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    currentAddress: "",
  });
  const [currentCoords, setCurrentCoords] = useState({
    latitude: null,
    longitude: null,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      dateOfBirth: user.dateOfBirth || "",
      currentAddress: user.currentAddress || "",
    });
    setCurrentCoords({
      latitude: user.currentLatitude ?? null,
      longitude: user.currentLongitude ?? null,
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateAddressField = (value) => {
    setForm((prev) => ({ ...prev, currentAddress: value }));
  };

  const updateLocation = (address, latitude, longitude) => {
    updateAddressField(address);
    setCurrentCoords({ latitude, longitude });
  };

  useEffect(() => {
    const query = form.currentAddress.trim();

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    let ignore = false;
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Không thể tải gợi ý địa điểm.");
        }

        const results = await response.json();

        if (!ignore) {
          setSuggestions(results);
        }
      } catch {
        if (!ignore) setSuggestions([]);
      } finally {
        if (!ignore) setIsSearchingLocation(false);
      }
    }, 350);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [form.currentAddress]);

  const handleUseCurrentLocation = () => {
    setMessage("");
    setError("");

    if (!navigator.geolocation) {
      setError("Trình duyệt của bạn không hỗ trợ lấy vị trí tự động.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                Accept: "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error("Không thể chuyển tọa độ sang địa chỉ.");
          }

          const data = await response.json();
          const address =
            data.display_name || data.name || `${latitude}, ${longitude}`;
          updateLocation(address, latitude, longitude);
          setSuggestions([]);
          setShowSuggestions(false);
          setMessage("Đã lấy vị trí hiện tại thành công.");
        } catch (locationError) {
          setError(
            locationError.message ||
              "Đã lấy được tọa độ nhưng chưa chuyển thành địa chỉ được.",
          );
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setError(
          "Không lấy được vị trí. Bạn có thể nhập tay địa điểm rồi bấm Tìm vị trí.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSelectSuggestion = (suggestion) => {
    updateLocation(
      suggestion.display_name,
      suggestion.lat ? Number(suggestion.lat) : null,
      suggestion.lon ? Number(suggestion.lon) : null,
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setMessage("Đã chọn vị trí gợi ý.");
    setError("");
  };

  const geocodeAddress = async (address) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&addressdetails=1&limit=1`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Không thể xác định vị trí từ địa chỉ đã nhập.");
    }

    const results = await response.json();
    const firstResult = results[0];

    if (!firstResult) {
      throw new Error("Không tìm thấy vị trí phù hợp từ địa chỉ đã nhập.");
    }

    return {
      latitude: firstResult.lat ? Number(firstResult.lat) : null,
      longitude: firstResult.lon ? Number(firstResult.lon) : null,
      displayName: firstResult.display_name || address,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!user) {
      setError("Không tìm thấy người dùng hiện tại.");
      return;
    }

    let nextLatitude = currentCoords.latitude;
    let nextLongitude = currentCoords.longitude;
    let nextAddress = form.currentAddress;

    if (!nextLatitude || !nextLongitude) {
      try {
        const geocoded = await geocodeAddress(form.currentAddress.trim());
        nextLatitude = geocoded.latitude;
        nextLongitude = geocoded.longitude;
        nextAddress = geocoded.displayName;
      } catch (geoError) {
        setError(
          geoError.message ||
            "Bạn cần chọn vị trí gợi ý hoặc bấm lấy vị trí hiện tại để lưu đúng tọa độ.",
        );
        return;
      }
    }

    const result = updateCurrentUserProfile({
      id: user.id,
      fullName: form.fullName,
      email: form.email,
      dateOfBirth: form.dateOfBirth,
      currentAddress: nextAddress,
      currentLatitude: nextLatitude,
      currentLongitude: nextLongitude,
    });

    if (!result.ok) {
      setError(result.message || "Cập nhật thất bại.");
      return;
    }

    setCurrentUser(result.user);
    setMessage("Đã cập nhật hồ sơ thành công.");
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              Hồ sơ cá nhân
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Cập nhật thông tin tài khoản
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

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <form className="grid gap-5" onSubmit={handleSave}>
          <Field
            label="Họ và tên"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          <Field
            label="Ngày tháng năm sinh"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
          />
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Vị trí nơi ở hiện tại
            </span>
            <div className="relative">
              <input
                name="currentAddress"
                value={form.currentAddress}
                onChange={handleChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Ví dụ: Quận 7, TP.HCM"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white"
              />

              {showSuggestions && form.currentAddress.trim().length >= 3 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                    <span>
                      {isSearchingLocation
                        ? "Đang tìm gợi ý..."
                        : "Gợi ý địa điểm"}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="font-semibold text-amber-600 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLocating
                        ? "Đang lấy vị trí..."
                        : "Lấy vị trí hiện tại"}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(suggestion)}
                          className="block w-full border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <div className="font-medium text-slate-950">
                            {suggestion.display_name.split(",")[0]}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {suggestion.display_name}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-slate-500">
                        {isSearchingLocation
                          ? "Đang tải gợi ý..."
                          : "Không có gợi ý phù hợp. Bạn có thể tiếp tục gõ hoặc bấm lấy vị trí hiện tại."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLocating ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
            >
              Lưu thay đổi
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Về trang chủ
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white"
      />
    </label>
  );
}
