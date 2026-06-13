# SQL seed — test từ user id 4

Giữ user **1–3** (khoi, khoind, business@example.com). Tạo user test **4–7** (`@proxijob.test`, mật khẩu `Password1!`).

## Thứ tự chạy (Supabase SQL Editor)

1. `04_identity_new_users_from_id4.sql`
2. `02_job_test_data_id4plus.sql`

Chạy lại: `00_cleanup_test_data.sql` (xóa user id≥4 + job của business 5) → `04` → `02`.

## Tài khoản test

| id | email | Mật khẩu | Vai trò |
|----|-------|----------|---------|
| 4 | student@proxijob.test | Password1! | Student |
| 5 | business@proxijob.test | Password1! | Business + Standard |
| 6 | admin@proxijob.test | Password1! | Admin |
| 7 | business.trial@proxijob.test | Password1! | Đơn CK Pending |

Job API: `businessId=5`, `studentId=4`.

## HTTP

`TEST_E2E_id4.http` — REST Client trong VS Code/Cursor.

Chi tiết: `docs/TEST_MANUAL.md`
