using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProxiJob.Management.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollRatingAndComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "comments",
                table: "management_payrolls",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "employer_comments",
                table: "management_payrolls",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "employer_rating",
                table: "management_payrolls",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "rating",
                table: "management_payrolls",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "comments",
                table: "management_payrolls");

            migrationBuilder.DropColumn(
                name: "employer_comments",
                table: "management_payrolls");

            migrationBuilder.DropColumn(
                name: "employer_rating",
                table: "management_payrolls");

            migrationBuilder.DropColumn(
                name: "rating",
                table: "management_payrolls");
        }
    }
}
