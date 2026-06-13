import React, { useState, useEffect } from "react";
import { Calendars } from "lucide-react";
import axios from "axios";
function CreateWorkSchedule({ existingSchedule = null, onSave = () => {} }) {
  const [schedule, setSchedule] = useState({
    id: null,
    date: "",
    from: "",
    to: "",
    salary: "",
    city: "",
    district: "",
    ward: "",
    area: "",
  });
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [salary, setSalary] = useState([21000, 22000, 23000, 24000, 25000]);

  useEffect(() => {
    if (existingSchedule) setSchedule({ ...existingSchedule });
  }, [existingSchedule]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSchedule((prev) => ({ ...prev, [name]: value }));
  };

  const handleCityChange = async (e) => {
    const cityId = e.target.value;
    setSchedule((prev) => ({
      ...prev,
      city: cityId,
      district: "",
      ward: "",
    }));
    setWards([]);

    if (!cityId) {
      console.log("Không thể lấy API thành phố");
      setDistricts([]);
      return;
    }

    try {
      const res = await axios.get(
        `https://provinces.open-api.vn/api/p/${cityId}?depth=2`,
      );
      setDistricts(res.data.districts);
    } catch (error) {
      console.log("Lỗi không thể lấy Quận", error);
      setDistricts([]);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtId = e.target.value;
    setSchedule((prev) => ({
      ...prev,
      district: districtId,
      ward: "",
    }));

    if (!districtId) {
      setWards([]);
      return;
    }
    try {
      const res = await axios.get(
        `https://provinces.open-api.vn/api/d/${districtId}?depth=2`,
      );
      setWards(res.data.wards);
    } catch (error) {
      console.log("Lỗi không thể lấy Phường", error);
    }
  };
  const handleWardChange = async (e) => {
    const wardId = e.target.value;
    setSchedule((prev) => ({
      ...prev,
      ward: wardId,
    }));

    if (!wardId) {
      setWards([]);
      return;
    }
  };

  const handleSave = () => {
    const cityName =
      cities.find((city) => city.id === schedule.city)?.name || "";
    const districtName =
      districts.find((district) => district.id === schedule.district)?.name ||
      "";
    const wardName =
      wards.find((ward) => ward.id === schedule.ward)?.name || "";

    const combinedArea =
      wardName && districtName && cityName
        ? `${wardName}, ${districtName}, ${cityName}`
        : schedule.area;

    if (schedule.id) {
      onSave({
        ...schedule,
        cityName,
        districtName,
        wardName,
        area: combinedArea,
        updatedAt: new Date().toISOString(),
        isNew: false,
      });
    } else {
      onSave({
        ...schedule,
        cityName,
        districtName,
        wardName,
        area: combinedArea,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        isNew: true,
      });
    }
    console.log(schedule);
  };
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get("https://provinces.open-api.vn/api/p/");

        setCities(res.data);
      } catch (error) {
        console.log("Lỗi không thể lấy Thành phố", error);
      }
    };

    fetchCities();
  }, []);

  return (
    <div>
      <h2>{schedule.id ? "Chỉnh sửa lịch làm việc" : "Tạo lịch làm việc"}</h2>
      <Calendars size={18} />

      <div>
        <label>Ngày làm việc</label>
        
      </div>

      <div>
        <label>Từ</label>
        <input
          name="from"
          type="time"
          value={schedule.from}
          onChange={handleChange}
        />
      </div>

      <div>
        <label>Đến</label>
        <input
          name="to"
          type="time"
          value={schedule.to}
          onChange={handleChange}
        />
      </div>

      <div>
        <label>Mức lương mong muốn </label>
        <select
          value={schedule.salary}
          onChange={(e) => setSchedule({ ...schedule, salary: e.target.value })}
        >
          <option value="">Chọn mức lương bạn mong muốn</option>
          {salary.map((item, index) => (
            <option key={index} value={item}>
              {item.toLocaleString("vi-VN")}đ/giờ
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Thành phố</label>
        <select name="city" value={schedule.city} onChange={handleCityChange}>
          <option value="">Chọn thành phố</option>
          {cities.map((city) => (
            <option key={city.code} value={city.code}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Quận mong muốn</label>
        <select
          name="district"
          value={schedule.district}
          onChange={handleDistrictChange}
          disabled={!schedule.city}
        >
          <option value="">Chọn quận</option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Phường mong muốn</label>
        <select
          name="ward"
          value={schedule.ward}
          onChange={handleWardChange}
          disabled={!schedule.district}
        >
          <option value="">Chọn phường</option>
          {wards.map((ward) => (
            <option key={ward.code} value={ward.code}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Khu vực chi tiết </label>
        <input
          name="area"
          type="text"
          placeholder="Ví dụ: gần chợ, gần trường..."
          value={schedule.area}
          onChange={handleChange}
        />
      </div>

      <button onClick={handleSave}>
        {schedule.id ? "Cập nhật" : "Tạo lịch"}
      </button>
    </div>
  );
}

export default CreateWorkSchedule;
