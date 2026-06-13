namespace ProxiJob.Management.API.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
        public object Errors { get; set; }

        public ApiResponse(bool success, string message, T data, object errors = null)
        {
            Success = success;
            Message = message;
            Data = data;
            Errors = errors;
        }
    }

    public class ApiResponse : ApiResponse<object>
    {
        public ApiResponse(bool success, string message, object data, object errors = null)
            : base(success, message, data, errors)
        {
        }

        public static ApiResponse SuccessResponse(object data = null, string message = "Request processed successfully")
        {
            return new ApiResponse(true, message, data ?? new object(), null);
        }

        public static ApiResponse FailureResponse(string message, object errors = null)
        {
            return new ApiResponse(false, message, new object(), errors);
        }
    }
}
