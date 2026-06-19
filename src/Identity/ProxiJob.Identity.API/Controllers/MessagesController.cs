using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/messages")]
    public class MessagesController : ControllerBase
    {
        private readonly IdentityDbContext _dbContext;
        private readonly ICurrentUserService _currentUserService;

        public MessagesController(IdentityDbContext dbContext, ICurrentUserService currentUserService)
        {
            _dbContext = dbContext;
            _currentUserService = currentUserService;
        }

        /// <summary>
        /// GET /api/messages/{userId}
        /// Fetches the conversation history between the current user and target user
        /// </summary>
        [HttpGet("{userId:int}")]
        public async Task<IActionResult> GetMessages(int userId, CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.UserId;
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            var messages = await _dbContext.Messages
                .Where(m => (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                            (m.SenderId == userId && m.ReceiverId == currentUserId))
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    m.SenderId,
                    m.ReceiverId,
                    m.Content,
                    m.CreatedAt,
                    m.IsRead
                })
                .ToListAsync(cancellationToken);

            return Ok(messages);
        }

        /// <summary>
        /// GET /api/messages/conversations
        /// Fetches the list of active conversations for the current user
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
        {
            var currentUserId = _currentUserService.UserId;
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            // Get distinct user IDs that the current user has chatted with
            var sentToUserIds = await _dbContext.Messages
                .Where(m => m.SenderId == currentUserId)
                .Select(m => m.ReceiverId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var receivedFromUserIds = await _dbContext.Messages
                .Where(m => m.ReceiverId == currentUserId)
                .Select(m => m.SenderId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var partnerIds = sentToUserIds.Union(receivedFromUserIds).Distinct().ToList();

            var users = await _dbContext.Users
                .Where(u => partnerIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.AvatarUrl,
                    u.PhoneNumber
                })
                .ToListAsync(cancellationToken);

            var list = new List<object>();

            foreach (var user in users)
            {
                // Find last message
                var lastMsg = await _dbContext.Messages
                    .Where(m => (m.SenderId == currentUserId && m.ReceiverId == user.Id) ||
                                (m.SenderId == user.Id && m.ReceiverId == currentUserId))
                    .OrderByDescending(m => m.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);

                var unreadCount = await _dbContext.Messages
                    .CountAsync(m => m.SenderId == user.Id && m.ReceiverId == currentUserId && !m.IsRead, cancellationToken);

                list.Add(new
                {
                    UserId = user.Id,
                    Name = user.FullName,
                    Email = user.Email,
                    Avatar = user.AvatarUrl,
                    Phone = user.PhoneNumber,
                    LastMessage = lastMsg?.Content ?? "",
                    Time = lastMsg != null ? lastMsg.CreatedAt.ToString("HH:mm") : "",
                    Unread = unreadCount
                });
            }

            return Ok(list);
        }
    }
}
