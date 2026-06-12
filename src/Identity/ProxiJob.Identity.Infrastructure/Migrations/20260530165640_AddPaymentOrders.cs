using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProxiJob.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "identity_paymentorders",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ordercode = table.Column<string>(type: "text", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    subscriptionid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    gateway = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    paymenturl = table.Column<string>(type: "text", nullable: true),
                    gatewaytransactionid = table.Column<string>(type: "text", nullable: true),
                    failurereason = table.Column<string>(type: "text", nullable: true),
                    expiresat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    paidat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    createdby = table.Column<string>(type: "text", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updatedby = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_identity_paymentorders", x => x.id);
                    table.ForeignKey(
                        name: "FK_identity_paymentorders_identity_subscriptions_subscriptionid",
                        column: x => x.subscriptionid,
                        principalTable: "identity_subscriptions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_identity_paymentorders_identity_users_userid",
                        column: x => x.userid,
                        principalTable: "identity_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_identity_paymentorders_ordercode",
                table: "identity_paymentorders",
                column: "ordercode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_identity_paymentorders_subscriptionid",
                table: "identity_paymentorders",
                column: "subscriptionid");

            migrationBuilder.CreateIndex(
                name: "IX_identity_paymentorders_userid",
                table: "identity_paymentorders",
                column: "userid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "identity_paymentorders");
        }
    }
}
