-- ============================================================
-- SQL INSERT: Dữ liệu test cho HRM Lite (NỘI BỘ + VÃNG LAI)
-- Bảng: management_employees
-- Business ID: 5 (business@proxijob.test / DN Test ProxiJob)
-- Student ID: 4 (student@proxijob.test / SV Test ProxiJob)
-- ============================================================

-- Xóa dữ liệu cũ (nếu muốn reset)
-- DELETE FROM management_employees WHERE business_id = 5;

-- ─── NỘI BỘ STAFF (is_external = false) ─────────────────────

-- 1. Nguyễn Minh Hoàng - Pha chế chính
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, NULL, 'Nguyễn Minh Hoàng', '0901234567', 'Pha chế chính',
    'Active', false, 'PerShift', 35000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- 2. Lê Thị Hương - Thu ngân
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, NULL, 'Lê Thị Hương', '0912345678', 'Thu ngân',
    'Active', false, 'PerShift', 30000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- 3. Phạm Văn Đức - Phục vụ ca sáng
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, NULL, 'Phạm Văn Đức', '0923456789', 'Phục vụ ca sáng',
    'Active', false, 'PerShift', 28000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- ─── VÃNG LAI STAFF (is_external = true) ────────────────────

-- 4. Trần Thị Mai - Phục vụ ca tối (sinh viên Đại học FPT)
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, 4, 'Trần Thị Mai', '0934567890', 'Phục vụ ca tối',
    'Active', true, 'PerShift', 30000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- 5. Nguyễn Duy Khôi - Nhân viên pha chế ca sáng
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, NULL, 'Nguyễn Duy Khôi', '0945678901', 'Nhân viên pha chế ca sáng',
    'Active', true, 'PerShift', 32000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- 6. Lương Hoàng Thông - Giao hàng ca gãy (đã kết thúc)
INSERT INTO management_employees (
    business_id, user_id, full_name, phone_number, position,
    status, is_external, payment_type, hourly_rate, monthly_salary,
    created_at, created_by, is_deleted
) VALUES (
    5, NULL, 'Lương Hoàng Thông', '0956789012', 'Giao hàng ca gãy',
    'Active', true, 'PerShift', 35000, NULL,
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

-- ─── Verify data ─────────────────────────────────────────────
-- SELECT id, full_name, position, status, is_external, phone_number
-- FROM management_employees
-- WHERE business_id = 5
-- ORDER BY is_external, id;
