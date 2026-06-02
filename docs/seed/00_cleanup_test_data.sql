-- Xóa dữ liệu test @proxijob.test (chạy trước khi import lại seed)
-- Thứ tự: Job DB trước (FK nội bộ), sau đó Identity.

-- ========== JOB DATABASE ==========
-- Chạy file này khi đã \c vào database Job (proxijob_job)

DELETE FROM job_applicationhistories
WHERE applicationid IN (SELECT id FROM job_applications WHERE createdby LIKE '%@proxijob.test');

DELETE FROM job_applications WHERE createdby LIKE '%@proxijob.test' OR studentid IN (1, 2, 3, 4);
DELETE FROM job_jobshifts WHERE createdby LIKE '%@proxijob.test';
DELETE FROM job_jobpostskills WHERE createdby LIKE '%@proxijob.test';
DELETE FROM job_joblocations WHERE createdby LIKE '%@proxijob.test';
DELETE FROM job_jobposts WHERE createdby LIKE '%@proxijob.test' OR businessid IN (2, 4);
DELETE FROM job_skills WHERE createdby LIKE '%@proxijob.test';
DELETE FROM job_jobcategories WHERE createdby LIKE '%@proxijob.test';

-- ========== IDENTITY DATABASE ==========
-- Chạy khi đã \c vào database Identity (proxijob_identity)

-- Chỉ xóa user test @proxijob.test từ id 4 (giữ user 1–3)
DELETE FROM identity_users WHERE email LIKE '%@proxijob.test' AND id >= 4;
