using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProxiJob.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBankTransferPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "adminnote",
                table: "identity_paymentorders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "confirmedby",
                table: "identity_paymentorders",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "adminnote",
                table: "identity_paymentorders");

            migrationBuilder.DropColumn(
                name: "confirmedby",
                table: "identity_paymentorders");
        }
    }
}
