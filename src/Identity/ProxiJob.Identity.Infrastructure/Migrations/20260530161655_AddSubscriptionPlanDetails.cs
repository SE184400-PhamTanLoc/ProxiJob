using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProxiJob.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionPlanDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "billingtype",
                table: "identity_subscriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "identity_subscriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "grossmargin",
                table: "identity_subscriptions",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "hashrmanagement",
                table: "identity_subscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "hasprioritydisplay",
                table: "identity_subscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "variablecost",
                table: "identity_subscriptions",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "billingtype",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "description",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "grossmargin",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "hashrmanagement",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "hasprioritydisplay",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "variablecost",
                table: "identity_subscriptions");
        }
    }
}
