-- Job seed cho user test id 4+ (studentId=4, businessId=5)
-- Chạy SAU 04_identity_new_users_from_id4.sql
-- User 1–3 (khoi, khoind, business@example.com) không bị xóa

BEGIN;

DELETE FROM job_applicationhistories
WHERE applicationid IN (
    SELECT id FROM job_applications
    WHERE studentid = 4 OR createdby LIKE '%@proxijob.test'
);
DELETE FROM job_applications
WHERE studentid = 4 OR createdby LIKE '%@proxijob.test';
DELETE FROM job_jobshifts
WHERE jobpostid IN (SELECT id FROM job_jobposts WHERE businessid = 5);
DELETE FROM job_jobpostskills
WHERE jobpostid IN (SELECT id FROM job_jobposts WHERE businessid = 5);
DELETE FROM job_joblocations
WHERE jobpostid IN (SELECT id FROM job_jobposts WHERE businessid = 5);
DELETE FROM job_jobposts WHERE businessid = 5;
DELETE FROM job_jobcategories WHERE createdby = 'Seed-Id4';
DELETE FROM job_skills WHERE createdby = 'Seed-Id4';

INSERT INTO job_jobcategories (name, description, createdat, createdby, isdeleted)
VALUES ('F&B Test', 'An uong (seed id4+)', NOW() AT TIME ZONE 'UTC', 'Seed-Id4', false);

INSERT INTO job_skills (name, description, createdat, createdby, isdeleted)
VALUES ('Phuc vu Test', 'Phuc vu (seed id4+)', NOW() AT TIME ZONE 'UTC', 'Seed-Id4', false);

WITH cat AS (SELECT id FROM job_jobcategories WHERE createdby = 'Seed-Id4' ORDER BY id DESC LIMIT 1),
     sk AS (SELECT id FROM job_skills WHERE createdby = 'Seed-Id4' ORDER BY id DESC LIMIT 1)
INSERT INTO job_jobposts (
    businessid, categoryid, title, description, requirements, status,
    createdat, createdby, isdeleted
)
SELECT
    5, cat.id,
    '[Test id4+] Nhan vien phuc vu',
    'Tin test cho business@proxijob.test (userid 5).',
    'Tu 18 tuoi.',
    'Published',
    NOW() AT TIME ZONE 'UTC', 'business@proxijob.test', false
FROM cat, sk;

WITH jp AS (SELECT id FROM job_jobposts WHERE businessid = 5 ORDER BY id DESC LIMIT 1)
INSERT INTO job_joblocations (jobpostid, address, latitude, longitude, createdat, createdby, isdeleted)
SELECT jp.id, '45 Le Loi, Q1', 10.7739, 106.7012,
       NOW() AT TIME ZONE 'UTC', 'business@proxijob.test', false
FROM jp;

WITH jp AS (SELECT id FROM job_jobposts WHERE businessid = 5 ORDER BY id DESC LIMIT 1),
     sk AS (SELECT id FROM job_skills WHERE createdby = 'Seed-Id4' ORDER BY id DESC LIMIT 1)
INSERT INTO job_jobpostskills (jobpostid, skillid, createdat, createdby, isdeleted)
SELECT jp.id, sk.id, NOW() AT TIME ZONE 'UTC', 'business@proxijob.test', false
FROM jp, sk;

WITH jp AS (SELECT id FROM job_jobposts WHERE businessid = 5 ORDER BY id DESC LIMIT 1)
INSERT INTO job_jobshifts (
    jobpostid, starttime, endtime, salary, slots, remainingslots,
    createdat, createdby, isdeleted
)
SELECT
    jp.id,
    (NOW() AT TIME ZONE 'UTC') + interval '3 days',
    (NOW() AT TIME ZONE 'UTC') + interval '3 days' + interval '8 hours',
    80000, 2, 2,
    NOW() AT TIME ZONE 'UTC', 'business@proxijob.test', false
FROM jp;

WITH sh AS (
    SELECT s.id FROM job_jobshifts s
    JOIN job_jobposts p ON p.id = s.jobpostid
    WHERE p.businessid = 5
    ORDER BY s.id DESC LIMIT 1
)
INSERT INTO job_applications (
    jobshiftid, studentid, introduction, cvurl, status,
    createdat, createdby, isdeleted
)
SELECT
    sh.id, 4,
    'Don test — student id 4.',
    'http://localhost:5231/api/public/students/4/cv',
    'Pending',
    NOW() AT TIME ZONE 'UTC', 'student@proxijob.test', false
FROM sh;

WITH app AS (
    SELECT a.id FROM job_applications a WHERE a.studentid = 4 ORDER BY a.id DESC LIMIT 1
)
INSERT INTO job_applicationhistories (
    applicationid, status, note, changedat, createdat, createdby, isdeleted
)
SELECT app.id, 'Pending', 'Da nop don',
       NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC', 'student@proxijob.test', false
FROM app;

COMMIT;

-- API test: businessId=5, studentId=4, CV /api/public/students/4/cv
