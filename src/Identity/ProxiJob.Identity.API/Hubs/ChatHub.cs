using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using ProxiJob.Identity.Infrastructure.Data;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IdentityDbContext _dbContext;

        public ChatHub(IdentityDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task SendMessage(string receiverIdStr, string messageContent)
        {
            if (string.IsNullOrWhiteSpace(messageContent) || string.IsNullOrWhiteSpace(receiverIdStr))
            {
                return;
            }

            if (!int.TryParse(Context.UserIdentifier, out var senderId))
            {
                return;
            }

            if (!int.TryParse(receiverIdStr, out var receiverId))
            {
                return;
            }

            // Save the entity asynchronously to the database
            var msgEntity = new Message 
            { 
                SenderId = senderId, 
                ReceiverId = receiverId, 
                Content = messageContent,
                IsRead = false,
                CreatedBy = Context.UserIdentifier ?? "System"
            };
            
            _dbContext.Messages.Add(msgEntity);
            await _dbContext.SaveChangesAsync();

            // Broadcast real-time event to the specific receiver's active connections
            await Clients.User(receiverIdStr).SendAsync("ReceiveMessage", senderId.ToString(), messageContent);
        }
    }
}
