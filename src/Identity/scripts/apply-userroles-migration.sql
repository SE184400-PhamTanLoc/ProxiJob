-- Chạy trong Supabase: SQL Editor (nếu chưa chạy dotnet ef database update)
-- Tạo bảng identity_userroles cho SCRUM-16

CREATE TABLE IF NOT EXISTS identity_userroles (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
    roleid INTEGER NOT NULL REFERENCES identity_roles(id) ON DELETE RESTRICT,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    createdby TEXT NOT NULL DEFAULT 'System',
    updatedat TIMESTAMPTZ,
    updatedby TEXT,
    isdeleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_identity_userroles_userid"
    ON identity_userroles (userid);

CREATE INDEX IF NOT EXISTS "IX_identity_userroles_roleid"
    ON identity_userroles (roleid);

-- Ghi nhận migration trong EF (tránh chạy lại khi dotnet ef database update)
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT '20260529085811_AddUserRolesAndSubscriptionTier', '8.0.0'
WHERE NOT EXISTS (
    SELECT 1 FROM "__EFMigrationsHistory"
    WHERE "MigrationId" = '20260529085811_AddUserRolesAndSubscriptionTier'
);
