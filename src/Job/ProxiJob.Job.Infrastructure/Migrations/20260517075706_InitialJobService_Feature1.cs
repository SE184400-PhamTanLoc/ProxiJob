using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProxiJob.Job.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialJobService_Feature1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_skills",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_skills",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_jobshifts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_jobshifts",
                type: "text",
                nullable: true);

            migrationBuilder.DropColumn(
                name: "businessid",
                table: "job_jobposts");
                
            migrationBuilder.AddColumn<int>(
                name: "businessid",
                table: "job_jobposts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_jobposts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_jobposts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_joblocations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_joblocations",
                type: "text",
                nullable: true);

            migrationBuilder.DropColumn(
                name: "studentid",
                table: "job_applications");
                
            migrationBuilder.AddColumn<int>(
                name: "studentid",
                table: "job_applications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "job_applicationhistories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "job_applicationhistories",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "job_jobcategories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    createdby = table.Column<string>(type: "text", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updatedby = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    deletedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deletedby = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_jobcategories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "job_jobpostskills",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    jobpostid = table.Column<int>(type: "integer", nullable: false),
                    skillid = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    createdby = table.Column<string>(type: "text", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updatedby = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    deletedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deletedby = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_jobpostskills", x => x.id);
                    table.ForeignKey(
                        name: "FK_job_jobpostskills_job_jobposts_jobpostid",
                        column: x => x.jobpostid,
                        principalTable: "job_jobposts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_jobpostskills_job_skills_skillid",
                        column: x => x.skillid,
                        principalTable: "job_skills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_job_jobposts_categoryid",
                table: "job_jobposts",
                column: "categoryid");

            migrationBuilder.CreateIndex(
                name: "IX_job_jobpostskills_jobpostid",
                table: "job_jobpostskills",
                column: "jobpostid");

            migrationBuilder.CreateIndex(
                name: "IX_job_jobpostskills_skillid",
                table: "job_jobpostskills",
                column: "skillid");

            migrationBuilder.AddForeignKey(
                name: "FK_job_jobposts_job_jobcategories_categoryid",
                table: "job_jobposts",
                column: "categoryid",
                principalTable: "job_jobcategories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_job_jobposts_job_jobcategories_categoryid",
                table: "job_jobposts");

            migrationBuilder.DropTable(
                name: "job_jobcategories");

            migrationBuilder.DropTable(
                name: "job_jobpostskills");

            migrationBuilder.DropIndex(
                name: "IX_job_jobposts_categoryid",
                table: "job_jobposts");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_skills");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_skills");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_jobshifts");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_jobshifts");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_jobposts");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_jobposts");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_joblocations");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_joblocations");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_applications");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_applications");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "job_applicationhistories");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "job_applicationhistories");

            migrationBuilder.AlterColumn<Guid>(
                name: "businessid",
                table: "job_jobposts",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<Guid>(
                name: "studentid",
                table: "job_applications",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");
        }
    }
}
