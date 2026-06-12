namespace ProxiJob.Shared.Contract
{
    /// <summary>Standard API response wrapper (no payload).</summary>
    public class ApiResponse
    {
        public int StatusCode { get; set; }
        public string? Message { get; set; }
        public IEnumerable<string>? Errors { get; set; }

        public ApiResponse(int statusCode, string? message = null, IEnumerable<string>? errors = null)
        {
            StatusCode = statusCode;
            Message = message;
            Errors = errors;
        }

        // ── Factory helpers ──────────────────────────────────────────

        public static ApiResponse Success(int statusCode = 200, string? message = null)
            => new(statusCode, message);

        public static ApiResponse Fail(int statusCode, string? message = null, IEnumerable<string>? errors = null)
            => new(statusCode, message, errors);
    }

    /// <summary>Standard API response wrapper with a typed data payload.</summary>
    public class ApiResponse<T> : ApiResponse
    {
        public T? Data { get; set; }

        public ApiResponse(int statusCode, T? data = default, string? message = null, IEnumerable<string>? errors = null)
            : base(statusCode, message, errors)
        {
            Data = data;
        }

        // ── Factory helpers ──────────────────────────────────────────

        public static ApiResponse<T> Success(T data, int statusCode = 200, string? message = null)
            => new(statusCode, data, message);

        public static new ApiResponse<T> Fail(int statusCode, string? message = null, IEnumerable<string>? errors = null)
            => new(statusCode, message: message, errors: errors);
    }
}
