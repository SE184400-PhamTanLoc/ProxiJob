using System;
using Npgsql;

namespace DbSequenceFixTemp
{
    class Program
    {
        static void Main(string[] args)
        {
            string connString = "Host=aws-1-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.jjruquhoqcwcmogpfvhf;Password=ProxiJob@12346;Maximum Pool Size=4;";
            
            using var conn = new NpgsqlConnection(connString);
            conn.Open();
            
            Console.WriteLine("--- Business QR Codes ---");
            string qrQuery = @"
                SELECT id, business_id, allowed_radius_meters, latitude, longitude, is_active, qr_token
                FROM public.management_business_qr_codes;
            ";
            using (var cmd = new NpgsqlCommand(qrQuery, conn))
            {
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Console.WriteLine($"ID: {reader["id"]}, BusinessID: {reader["business_id"]}, Radius: {reader["allowed_radius_meters"]}, Lat: {reader["latitude"]}, Lng: {reader["longitude"]}, Active: {reader["is_active"]}, Token: {reader["qr_token"]}");
                }
            }

            Console.WriteLine("\n--- Recent Timekeepings ---");
            string tkQuery = @"
                SELECT id, employee_id, work_schedule_id, check_in_time, in_latitude, in_longitude, status, check_out_time
                FROM public.management_timekeepings
                ORDER BY id DESC
                LIMIT 5;
            ";
            using (var cmd = new NpgsqlCommand(tkQuery, conn))
            {
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Console.WriteLine($"ID: {reader["id"]}, EmpID: {reader["employee_id"]}, SchedID: {reader["work_schedule_id"]}, CheckIn: {reader["check_in_time"]}, CheckOut: {reader["check_out_time"]}, Lat: {reader["in_latitude"]}, Lng: {reader["in_longitude"]}, Status: {reader["status"]}");
                }
            }
        }
    }
}
