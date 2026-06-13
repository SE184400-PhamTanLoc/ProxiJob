-- Tạo user test MỚI từ id 4 — KHÔNG đụng user 1–3 (khoi, khoind, business@example.com)
-- Mật khẩu tất cả: Password1!
-- Hash BCrypt: $2a$11$55b38TQ8MBfqAf3JO9A7bO6Ua9GyGAovobRCWlMd33cKAdMmNo7AO

BEGIN;

-- Roles & gói (nếu chưa có)
INSERT INTO identity_roles (name, description, createdat, createdby, isdeleted)
SELECT v.name, v.description, NOW() AT TIME ZONE 'UTC', 'Seed', false
FROM (VALUES
    ('Student', 'Sinh viên'),
    ('Business', 'Doanh nghiệp'),
    ('Admin', 'Quản trị')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM identity_roles r WHERE r.name = v.name);

INSERT INTO identity_subscriptions (
    name, description, price, variablecost, grossmargin, billingtype,
    jobpostlimit, durationdays, hasprioritydisplay, hashrmanagement,
    createdat, createdby, isdeleted
)
SELECT v.name, v.description, v.price, v.vcost, v.gmargin, v.btype,
       v.jlimit, v.days, v.priority, v.hr, NOW() AT TIME ZONE 'UTC', 'Seed', false
FROM (VALUES
    ('PerShift', 'Đăng 1 ca', 15000::decimal, 5000::decimal, 10000::decimal, 0, 1, 1, false, false),
    ('Basic', 'Gói tháng cơ bản', 99000::decimal, 30000::decimal, 69000::decimal, 1, 15, 30, false, false),
    ('Standard', 'Gói tháng không giới hạn đăng tin', 199000::decimal, 50000::decimal, 149000::decimal, 1, 999, 30, false, false),
    ('Premium', 'Ưu tiên + HR', 299000::decimal, 70000::decimal, 229000::decimal, 1, 999, 30, true, true)
) AS v(name, description, price, vcost, gmargin, btype, jlimit, days, priority, hr)
WHERE NOT EXISTS (SELECT 1 FROM identity_subscriptions s WHERE s.name = v.name);

-- Xóa chỉ user @proxijob.test id >= 4 (chạy lại seed an toàn)
DELETE FROM identity_users WHERE email LIKE '%@proxijob.test' AND id >= 4;

INSERT INTO identity_users (
    id, username, email, passwordhash, fullname, phonenumber,
    isactive, jobpostsused, createdat, createdby, isdeleted
) VALUES
    (4, 'student@proxijob.test', 'student@proxijob.test',
     '$2a$11$55b38TQ8MBfqAf3JO9A7bO6Ua9GyGAovobRCWlMd33cKAdMmNo7AO',
     'SV Test ProxiJob', '0901000004', true, 0, NOW() AT TIME ZONE 'UTC', 'Seed', false),
    (5, 'business@proxijob.test', 'business@proxijob.test',
     '$2a$11$55b38TQ8MBfqAf3JO9A7bO6Ua9GyGAovobRCWlMd33cKAdMmNo7AO',
     'DN Test ProxiJob', '0911000005', true, 0, NOW() AT TIME ZONE 'UTC', 'Seed', false),
    (6, 'admin@proxijob.test', 'admin@proxijob.test',
     '$2a$11$55b38TQ8MBfqAf3JO9A7bO6Ua9GyGAovobRCWlMd33cKAdMmNo7AO',
     'Admin Test ProxiJob', '0921000006', true, 0, NOW() AT TIME ZONE 'UTC', 'Seed', false),
    (7, 'business.trial@proxijob.test', 'business.trial@proxijob.test',
     '$2a$11$55b38TQ8MBfqAf3JO9A7bO6Ua9GyGAovobRCWlMd33cKAdMmNo7AO',
     'DN Trial Test', '0931000007', true, 0, NOW() AT TIME ZONE 'UTC', 'Seed', false);

SELECT setval(
    pg_get_serial_sequence('identity_users', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM identity_users));

INSERT INTO identity_userroles (userid, roleid, createdat, createdby, isdeleted)
SELECT u.id, r.id, NOW() AT TIME ZONE 'UTC', 'Seed', false
FROM identity_users u
JOIN identity_roles r ON r.name = CASE u.id
    WHEN 4 THEN 'Student'
    WHEN 5 THEN 'Business'
    WHEN 6 THEN 'Admin'
    WHEN 7 THEN 'Business'
END
WHERE u.id IN (4, 5, 6, 7);

INSERT INTO identity_studentprofiles (
    userid, readinessstatus, dateofbirth, gender, address, city,
    school, major, yearofstudy, bio, skills,
    reputationscore, reviewcount, readyforworkat,
    createdat, createdby, isdeleted
) VALUES (
    4, 'ReadyForWork', '2002-05-15T00:00:00Z', 'Nam',
    '123 Nguyen Van Cu', 'Ho Chi Minh',
    'UEH', 'Quan tri kinh doanh', 3,
    'Sinh vien test id=4',
    'Giao tiep, Phuc vu',
    0, 0, NOW() AT TIME ZONE 'UTC',
    NOW() AT TIME ZONE 'UTC', 'Seed', false
);

INSERT INTO identity_businessprofiles (
    userid, businessname, businesstype, city, address, taxcode, description,
    readinessstatus, reputationscore, reviewcount, profilecompleteat,
    createdat, createdby, isdeleted
) VALUES
    (5, 'Cafe Proxi Test', 'Cafe', 'Ho Chi Minh', '45 Le Loi, Q1', '0123456789',
     'DN test id=5 — co goi Standard.', 'ProfileComplete', 0, 0,
     NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC', 'Seed', false),
    (7, 'Quan Trial Test', 'Nha hang', 'Ho Chi Minh', '10 Tran Hung Dao', '0987654321',
     'DN test id=7 — test payment.', 'ProfileComplete', 0, 0,
     NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC', 'Seed', false);

INSERT INTO identity_usersubscriptions (
    userid, subscriptionid, startdate, enddate, status,
    createdat, createdby, isdeleted
)
SELECT
    5, s.id,
    NOW() AT TIME ZONE 'UTC',
    (NOW() AT TIME ZONE 'UTC') + (s.durationdays || ' days')::interval,
    'Active',
    NOW() AT TIME ZONE 'UTC', 'Seed', false
FROM identity_subscriptions s
WHERE s.name = 'Standard'
LIMIT 1;

INSERT INTO identity_paymentorders (
    ordercode, userid, subscriptionid, amount, gateway, status,
    expiresat, createdat, createdby, isdeleted
)
SELECT
    'PJ-TEST-0004',
    7, s.id, s.price, 'BankTransfer', 'Pending',
    (NOW() AT TIME ZONE 'UTC') + interval '7 days',
    NOW() AT TIME ZONE 'UTC', 'Seed', false
FROM identity_subscriptions s
WHERE s.name = 'Basic'
LIMIT 1;

COMMIT;

-- | id | email                      | Password1! | Vai trò    |
-- |----|----------------------------|------------|------------|
-- | 4  | student@proxijob.test      | ✓          | Student    |
-- | 5  | business@proxijob.test     | ✓          | Business + Standard |
-- | 6  | admin@proxijob.test        | ✓          | Admin      |
-- | 7  | business.trial@proxijob.test | ✓        | Business, đơn CK Pending |
