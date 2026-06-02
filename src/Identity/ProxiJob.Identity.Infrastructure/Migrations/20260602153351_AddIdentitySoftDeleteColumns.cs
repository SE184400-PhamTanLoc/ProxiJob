using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProxiJob.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentitySoftDeleteColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_wallets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_wallets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_usersubscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_usersubscriptions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_userroles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_userroles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_transactions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_subscriptions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_subscriptionfeatures",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_subscriptionfeatures",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_studentprofiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_studentprofiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_roles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_roles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_refreshtokens",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_refreshtokens",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_permissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_permissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_paymentorders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_paymentorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deletedat",
                table: "identity_businessprofiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deletedby",
                table: "identity_businessprofiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_wallets");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_wallets");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_usersubscriptions");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_usersubscriptions");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_users");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_users");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_userroles");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_userroles");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_transactions");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_transactions");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_subscriptions");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_subscriptionfeatures");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_subscriptionfeatures");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_studentprofiles");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_studentprofiles");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_roles");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_roles");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_refreshtokens");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_refreshtokens");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_permissions");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_permissions");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_paymentorders");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_paymentorders");

            migrationBuilder.DropColumn(
                name: "deletedat",
                table: "identity_businessprofiles");

            migrationBuilder.DropColumn(
                name: "deletedby",
                table: "identity_businessprofiles");
        }
    }
}
