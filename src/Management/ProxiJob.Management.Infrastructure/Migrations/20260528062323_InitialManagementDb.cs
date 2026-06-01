using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProxiJob.Management.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialManagementDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "management_business_qr_codes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    business_id = table.Column<int>(type: "integer", nullable: false),
                    qr_token = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    allowed_radius_meters = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_management_business_qr_codes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "management_employees",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    business_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    position = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    is_external = table.Column<bool>(type: "boolean", nullable: false),
                    payment_type = table.Column<string>(type: "text", nullable: false),
                    hourly_rate = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    monthly_salary = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_management_employees", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "management_payrolls",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employee_id = table.Column<int>(type: "integer", nullable: false),
                    total_hours = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    base_amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    adjustment = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    adjustment_note = table.Column<string>(type: "text", nullable: true),
                    final_amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    pay_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_management_payrolls", x => x.id);
                    table.ForeignKey(
                        name: "FK_management_payrolls_management_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "management_employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "management_work_schedules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employee_id = table.Column<int>(type: "integer", nullable: false),
                    job_shift_id = table.Column<int>(type: "integer", nullable: true),
                    job_shift_salary = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_management_work_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_management_work_schedules_management_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "management_employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "management_timekeepings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employee_id = table.Column<int>(type: "integer", nullable: false),
                    work_schedule_id = table.Column<int>(type: "integer", nullable: false),
                    check_in_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    check_out_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    in_latitude = table.Column<double>(type: "double precision", nullable: true),
                    in_longitude = table.Column<double>(type: "double precision", nullable: true),
                    out_latitude = table.Column<double>(type: "double precision", nullable: true),
                    out_longitude = table.Column<double>(type: "double precision", nullable: true),
                    check_in_photo = table.Column<string>(type: "text", nullable: true),
                    check_out_photo = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    is_manual = table.Column<bool>(type: "boolean", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_management_timekeepings", x => x.id);
                    table.ForeignKey(
                        name: "FK_management_timekeepings_management_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "management_employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_management_timekeepings_management_work_schedules_work_sche~",
                        column: x => x.work_schedule_id,
                        principalTable: "management_work_schedules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_management_business_qr_codes_business_id",
                table: "management_business_qr_codes",
                column: "business_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_management_business_qr_codes_qr_token",
                table: "management_business_qr_codes",
                column: "qr_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_management_payrolls_employee_id",
                table: "management_payrolls",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_management_timekeepings_employee_id",
                table: "management_timekeepings",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_management_timekeepings_work_schedule_id",
                table: "management_timekeepings",
                column: "work_schedule_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_management_work_schedules_employee_id",
                table: "management_work_schedules",
                column: "employee_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "management_business_qr_codes");

            migrationBuilder.DropTable(
                name: "management_payrolls");

            migrationBuilder.DropTable(
                name: "management_timekeepings");

            migrationBuilder.DropTable(
                name: "management_work_schedules");

            migrationBuilder.DropTable(
                name: "management_employees");
        }
    }
}
