import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const AdminDashboardController = {
  getSummary: async (req, res) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        // Basic counts
        totalProviders,
        totalCustomers,
        totalUsers,
        activeBookings,
        pendingBookings,
        confirmedBookings,
        ongoingBookings,
        completedBookings,
        cancelledBookings,
        pendingApprovals,
        completedThisMonth,
        completedLastMonth,
        pendingPayments,
        openTickets,
        resolvedTickets,
        totalPayments,
        paidPayments,
        failedPayments,
        recentSignups,
        verifiedProviders,
        featuredProviders,
        totalReviews,
        avgProviderRating
      ] = await Promise.all([
        // Provider and customer counts
        prisma.provider.count(),
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.user.count(),
        
        // Booking status counts
        prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } } }),
        prisma.booking.count({ where: { status: 'PENDING' } }),
        prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma.booking.count({ where: { status: 'ONGOING' } }),
        prisma.booking.count({ where: { status: 'COMPLETED' } }),
        prisma.booking.count({ where: { status: 'CANCELLED' } }),
        
        // Service requests
        prisma.providerServiceRequest.count({ where: { status: 'PENDING' } }),
        
        // Monthly comparisons
        prisma.booking.count({ where: { status: 'COMPLETED', createdAt: { gte: monthStart } } }),
        prisma.booking.count({ 
          where: { 
            status: 'COMPLETED', 
            createdAt: { 
              gte: lastMonthStart, 
              lte: lastMonthEnd 
            } 
          } 
        }),
        
        // Payments
        prisma.booking.count({ where: { paymentStatus: 'PENDING' } }),
        
        // Tickets
        prisma.ticket.count({ where: { status: 'OPEN' } }),
        prisma.ticket.count({ where: { status: 'RESOLVED' } }),
        
        // Payment counts
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'PAID' } }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        
        // Recent signups (last 7 days)
        prisma.user.count({ 
          where: { 
            createdAt: { 
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            } 
          } 
        }),
        
        // Provider stats
        prisma.provider.count({ where: { isVerified: true } }),
        prisma.provider.count({ where: { isFeatured: true } }),
        
        // Reviews
        prisma.review.count(),
        prisma.provider.aggregate({
          _avg: { rating: true }
        })
      ]);

      // Calculate growth metrics
      const bookingGrowth = completedLastMonth > 0 
        ? ((completedThisMonth - completedLastMonth) / completedLastMonth * 100).toFixed(1)
        : completedThisMonth > 0 ? 100 : 0;

      const summary = {
        // User metrics
        users: {
          total: totalUsers,
          customers: totalCustomers,
          providers: totalProviders,
          verifiedProviders,
          featuredProviders,
          recentSignups
        },
        
        // Booking metrics
        bookings: {
          active: activeBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          ongoing: ongoingBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          completedThisMonth,
          completedLastMonth,
          growth: parseFloat(bookingGrowth)
        },
        
        // Payment metrics
        payments: {
          total: totalPayments,
          paid: paidPayments,
          failed: failedPayments,
          pending: pendingPayments
        },
        
        // Support metrics
        tickets: {
          open: openTickets,
          resolved: resolvedTickets
        },
        
        // Service metrics
        services: {
          pendingApprovals
        },
        
        // Quality metrics
        quality: {
          totalReviews,
          averageRating: avgProviderRating?._avg?.rating?.toFixed(1) || 0
        }
      };

      // Aggregate booking amount for escrow volume (Prisma aggregate supports _sum).
      const [escrowAgg, paidAgg, disputedTickets] = await Promise.all([
        prisma.booking.aggregate({
          _sum: { amount: true },
          where: { paymentStatus: { in: ['PENDING', 'PAID'] } }
        }),
        prisma.booking.aggregate({
          _sum: { amount: true },
          where: { paymentStatus: 'PAID' }
        }),
        prisma.ticket.count({
          where: { status: 'OPEN', subject: { contains: 'dispute', mode: 'insensitive' } }
        })
      ]);

      const sumAmount = escrowAgg?._sum?.amount ?? 0;
      const paidAmount = paidAgg?._sum?.amount ?? 0;

      summary.aggregates = {
        grossEscrowVolume: Number(sumAmount),
        adminNetPayout: Number(paidAmount),
        vettingBacklogCount: pendingApprovals,
        disputeTicketsCount: disputedTickets
      };

      sendApiSuccess(res, 200, summary);
    } catch (err) {
      console.error('[AdminDashboardController] Error:', err);
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load dashboard metrics', err.message);
    }
  },

  // Audit logs endpoint
  getAuditLogs: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.auditLog.count()
      ]);

      // Collect targetIds that don't already have a stored targetName
      const providerIds = [...new Set(
        logs.filter(l => !l.targetName && l.targetType === 'Provider').map(l => l.targetId)
      )];
      const requestIds = [...new Set(
        logs.filter(l => !l.targetName && l.targetType === 'ProviderServiceRequest').map(l => l.targetId)
      )];

      const [providers, requests] = await Promise.all([
        providerIds.length ? prisma.provider.findMany({
          where: { id: { in: providerIds } },
          select: { id: true, user: { select: { name: true } } }
        }) : [],
        requestIds.length ? prisma.providerServiceRequest.findMany({
          where: { id: { in: requestIds } },
          select: { id: true, provider: { select: { user: { select: { name: true } } } } }
        }) : []
      ]);

      const providerNameMap = {};
      for (const p of providers) providerNameMap[p.id] = p.user?.name || '';

      const requestNameMap = {};
      for (const req of requests) requestNameMap[req.id] = req.provider?.user?.name || '';

      const enriched = logs.map(log => ({
        ...log,
        targetName: log.targetName
          || providerNameMap[log.targetId]
          || requestNameMap[log.targetId]
          || ''
      }));

      sendApiSuccess(res, 200, {
        logs: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (err) {
      console.error('[AdminDashboardController] getAuditLogs Error:', err);
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load audit logs', err.message);
    }
  },

  // Paginated providers for admin reports
  getPaginatedProviders: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
      const skip = (page - 1) * limit;

      const [providers, total] = await Promise.all([
        prisma.provider.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
            reviews: true,
            badges: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.provider.count()
      ]);

      sendApiSuccess(res, 200, {
        providers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (err) {
      console.error('[AdminDashboardController] getPaginatedProviders Error:', err);
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load providers', err.message);
    }
  },

  // Additional analytics endpoint
  getAnalytics: async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      if (!['7d', '30d', '90d'].includes(period)) {
        return sendApiError(res, 400, 'INVALID_PERIOD', 'period must be one of: 7d, 30d, 90d.');
      }
      
      let startDate = new Date();
      if (period === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (period === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }

      // Get booking trends
      const bookingsByDay = await prisma.booking.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: { gte: startDate }
        }
      });

      // Get top providers by completed bookings
      const topProviders = await prisma.booking.groupBy({
        by: ['providerId'],
        _count: true,
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        orderBy: {
          _count: {
            providerId: 'desc'
          }
        },
        take: 10
      });

      // Get top services by bookings
      const topServices = await prisma.booking.groupBy({
        by: ['serviceCategory'],
        _count: true,
        where: {
          createdAt: { gte: startDate }
        },
        orderBy: {
          _count: {
            serviceCategory: 'desc'
          }
        },
        take: 10
      });

      // Get rating distribution
      const ratings = await prisma.review.findMany({
        select: { rating: true },
        where: {
          createdAt: { gte: startDate }
        }
      });

      const ratingDistribution = {
        5: ratings.filter(r => r.rating === 5).length,
        4: ratings.filter(r => r.rating === 4).length,
        3: ratings.filter(r => r.rating === 3).length,
        2: ratings.filter(r => r.rating === 2).length,
        1: ratings.filter(r => r.rating === 1).length
      };

      sendApiSuccess(res, 200, {
        period,
        startDate,
        bookingsByStatus: bookingsByDay,
        topProviders,
        topServices,
        ratingDistribution,
        totalReviewsThisPeriod: ratings.length
      });
    } catch (err) {
      console.error('[AdminDashboardController] Analytics Error:', err);
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load analytics', err.message);
    }
  }
};
