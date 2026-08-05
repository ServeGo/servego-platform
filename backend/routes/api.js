import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { ProviderController } from '../controllers/providerController.js';
import { BookingController } from '../controllers/bookingController.js';
import { TicketController } from '../controllers/ticketController.js';
import { NotificationController } from '../controllers/notificationController.js';
import { ReviewController } from '../controllers/reviewController.js';
import { ServiceController } from '../controllers/serviceController.js';
import { AdminProviderServiceController } from '../controllers/adminProviderServiceController.js';
import { AdminProviderServiceItemsController } from '../controllers/adminProviderServiceItemsController.js';
import { AdminDashboardController } from '../controllers/adminDashboardController.js';
import { AdminProviderStatusController } from '../controllers/adminProviderStatusController.js';
import { ReferralsController } from '../controllers/referralsController.js';
import { ProviderServiceDiscoveryController } from '../controllers/providerServiceDiscoveryController.js';
import { ProviderAnalyticsController } from '../controllers/providerAnalyticsController.js';
import { SavedProController } from '../controllers/savedProController.js';
import { ImageController } from '../controllers/imageController.js';
import { LeadController } from '../controllers/leadController.js';
import { PermanentServiceRequestController } from '../controllers/permanentServiceRequestController.js';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { ProviderBusinessController } from '../controllers/providerBusinessController.js';
import { AdminBusinessController } from '../controllers/adminBusinessController.js';
import { WalletController } from '../controllers/walletController.js';
import { DisputeController } from '../controllers/disputeController.js';
import { uploadImage } from '../middleware/upload.js';
import { requireAuth, requireRole, optionalAuth } from '../utils/auth.js';
import { authRateLimiter, bookingRateLimiter, reviewRateLimiter, supportTicketRateLimiter } from '../middleware/security.js';
import { validate, registerValidation, loginValidation, createBookingValidation, createReviewValidation, createTicketValidation, createAuthenticatedTicketValidation, createServiceValidation, updateServiceValidation, updateAvailabilityValidation, registerProviderServiceValidation, updateProviderProfileValidation, updateUserProfileValidation, forgotPasswordValidation, resetPasswordValidation, createPermanentServiceRequestValidation, updatePermanentServiceRequestValidation, updateBookingLocationValidation, requestWithdrawalValidation, processWithdrawalValidation, adminCreditWalletValidation, createDisputeValidation, addDisputeMessageValidation, resolveDisputeValidation } from '../middleware/validation.js';

const apiRouter = Router();

// --- Authentication & Users ---
apiRouter.post('/auth/register', validate(registerValidation), UserController.register);
apiRouter.post('/auth/login', authRateLimiter, validate(loginValidation), UserController.login);
apiRouter.post('/auth/forgot-password', authRateLimiter, validate(forgotPasswordValidation), UserController.forgotPassword);
apiRouter.post('/auth/reset-password', authRateLimiter, validate(resetPasswordValidation), UserController.resetPassword);
apiRouter.post('/auth/refresh', UserController.refreshToken);
apiRouter.get('/auth/me', requireAuth, UserController.getMe);
apiRouter.get('/users', requireAuth, requireRole('admin'), UserController.getUsers);
apiRouter.patch('/users/:id/profile', requireAuth, validate(updateUserProfileValidation), UserController.updateProfile);

// --- Service Providers (Partners) ---
apiRouter.get('/providers', optionalAuth, ProviderController.getAll);
apiRouter.get('/providers/by-approved-service', ProviderServiceDiscoveryController.getApprovedProvidersByServiceName);
apiRouter.get('/providers/:id', optionalAuth, ProviderController.getById);
apiRouter.get('/providers/:id/services', optionalAuth, ProviderController.getProviderServices);

apiRouter.put('/providers/me/availability', requireAuth, requireRole('provider'), validate(updateAvailabilityValidation), ProviderController.updateMyAvailability);

apiRouter.post('/providers/:id/services/register', requireAuth, validate(registerProviderServiceValidation), ProviderController.registerProviderService);
apiRouter.patch('/providers/:id/profile', requireAuth, validate(updateProviderProfileValidation), ProviderController.updateProfile);
apiRouter.patch('/providers/:id/availability', requireAuth, validate(updateAvailabilityValidation), ProviderController.updateAvailability);
apiRouter.put('/providers/:id/availability', requireAuth, validate(updateAvailabilityValidation), ProviderController.updateAvailability);
apiRouter.patch('/providers/:id/verify', requireAuth, requireRole('admin'), ProviderController.verify);
apiRouter.post('/provider-services', requireAuth, requireRole('provider'), validate(registerProviderServiceValidation), ProviderController.registerOwnProviderService);
apiRouter.get('/provider-services/mine', requireAuth, requireRole('provider'), ProviderController.getMyProviderServices);
apiRouter.get('/provider-services', requireAuth, requireRole('admin'), AdminProviderServiceController.getPendingRequests);

// --- Bookings ---
apiRouter.get('/bookings', requireAuth, BookingController.getAll);
apiRouter.get('/bookings/:id/timeline', requireAuth, requireRole('admin'), BookingController.getTimeline);
apiRouter.get('/bookings/:id/tracking', requireAuth, BookingController.getTracking);
apiRouter.get('/bookings/:id/track-history', requireAuth, BookingController.getTrackHistory);
apiRouter.patch('/bookings/:id/location', requireAuth, requireRole('provider'), validate(updateBookingLocationValidation), BookingController.updateLocation);
apiRouter.get('/bookings/:id', requireAuth, BookingController.getById);
apiRouter.post('/bookings', requireAuth, bookingRateLimiter, validate(createBookingValidation), BookingController.create);
apiRouter.patch('/bookings/:id/status', requireAuth, BookingController.updateStatus);
apiRouter.patch('/bookings/:id/accept', requireAuth, requireRole('provider'), BookingController.transition('CONFIRMED'));
apiRouter.patch('/bookings/:id/decline', requireAuth, requireRole('provider'), BookingController.transition('CANCELLED'));
apiRouter.patch('/bookings/:id/cancel', requireAuth, BookingController.transition('CANCELLED'));
apiRouter.patch('/bookings/:id/complete', requireAuth, requireRole('provider'), BookingController.transition('COMPLETED'));
apiRouter.post('/bookings/:id/messages', requireAuth, BookingController.addMessage);
apiRouter.get('/bookings/:id/messages', requireAuth, BookingController.getMessages);

// --- Notifications ---
apiRouter.get('/notifications', requireAuth, NotificationController.getAll);
apiRouter.post('/notifications', requireAuth, NotificationController.create);
apiRouter.patch('/notifications/read-all', requireAuth, NotificationController.readAll);
apiRouter.patch('/notifications/:id/read', requireAuth, NotificationController.read);
apiRouter.delete('/notifications', requireAuth, NotificationController.clearAll);

// --- Support Tickets ---
apiRouter.get('/tickets', requireAuth, TicketController.getAll);
apiRouter.post('/tickets', requireAuth, validate(createAuthenticatedTicketValidation), TicketController.create);
apiRouter.patch('/tickets/:id/resolve', requireAuth, requireRole('admin'), TicketController.resolve);
apiRouter.patch('/admin/tickets/:id/resolve', requireAuth, requireRole('admin'), TicketController.resolve);
apiRouter.post('/support-tickets', supportTicketRateLimiter, optionalAuth, validate(createTicketValidation), TicketController.create);
apiRouter.patch('/support-tickets/:id/status', requireAuth, requireRole('admin'), TicketController.setStatus);

// --- Reviews ---
apiRouter.get('/reviews', requireAuth, requireRole('admin'), ReviewController.getAll);
apiRouter.post('/reviews', requireAuth, reviewRateLimiter, validate(createReviewValidation), ReviewController.create);
apiRouter.get('/providers/:id/reviews', ReviewController.getByProvider);
apiRouter.delete('/reviews/:id', requireAuth, requireRole('admin'), ReviewController.deleteOne);

// --- Referrals / Ambassador ---
apiRouter.post('/referrals/apply', requireAuth, ReferralsController.applyReferral);
apiRouter.get('/referrals/me', requireAuth, ReferralsController.getMeReferral);
apiRouter.post('/referrals/generate', requireAuth, ReferralsController.generate);
apiRouter.post('/referrals/claim', requireAuth, ReferralsController.applyReferral);

// --- Services (Service Categories) ---
apiRouter.get('/services/search', ServiceController.search);
apiRouter.get('/services', ServiceController.getAll);
apiRouter.get('/categories/:slug', ServiceController.getCategoryBySlug);
apiRouter.get('/categories/:slug/providers', ProviderServiceDiscoveryController.getApprovedProvidersByCategory);
apiRouter.get('/categories/:id/active-count', ServiceController.getActiveCount);
apiRouter.post('/services', requireAuth, requireRole('admin'), validate(createServiceValidation), ServiceController.create);
apiRouter.delete('/services/:id', requireAuth, requireRole('admin'), ServiceController.deleteOne);
apiRouter.patch('/services/:id', requireAuth, requireRole('admin'), validate(updateServiceValidation), ServiceController.updateOne);
apiRouter.patch('/services/:id/hide', requireAuth, requireRole('admin'), ServiceController.hideOne);

// --- Provider Analytics ---
// Admin can also view any provider's analytics
apiRouter.get('/providers/:id/analytics', requireAuth, requireRole(['provider', 'admin']), ProviderAnalyticsController.getProviderAnalytics);

// --- Admin: Dashboard ---
apiRouter.get('/admin/dashboard', requireAuth, requireRole('admin'), AdminDashboardController.getSummary);
apiRouter.get('/admin/analytics', requireAuth, requireRole('admin'), AdminDashboardController.getAnalytics);
apiRouter.get('/admin/audit-logs', requireAuth, requireRole('admin'), AdminDashboardController.getAuditLogs);
apiRouter.get('/admin/bookings', requireAuth, requireRole('admin'), BookingController.getAll);
apiRouter.get('/admin/providers', requireAuth, requireRole('admin'), AdminDashboardController.getPaginatedProviders);

// --- Admin: provider service items ---
apiRouter.get('/admin/provider-service-items', requireAuth, requireRole('admin'), AdminProviderServiceItemsController.getAll);
apiRouter.get('/admin/provider-service-requests', requireAuth, requireRole('admin'), AdminProviderServiceController.getPendingRequests);
apiRouter.patch('/admin/provider-service-requests/:id/approve', requireAuth, requireRole('admin'), AdminProviderServiceController.approveService);
apiRouter.patch('/admin/provider-service-requests/:id/deny', requireAuth, requireRole('admin'), AdminProviderServiceController.denyService);
apiRouter.post('/admin/providers/reputation/refresh', requireAuth, requireRole('admin'), AdminProviderServiceController.refreshReputation);

// --- Admin: Provider Account Status ---
apiRouter.patch('/admin/providers/:id/status', requireAuth, requireRole('admin'), AdminProviderStatusController.setStatus);

// --- Saved Pros ---
apiRouter.get('/saved-pros', requireAuth, requireRole('customer'), SavedProController.getMine);
apiRouter.post('/saved-pros', requireAuth, requireRole('customer'), SavedProController.save);
apiRouter.delete('/saved-pros/:providerId', requireAuth, requireRole('customer'), SavedProController.unsave);

// --- Image Upload (optionalAuth so providers can upload during signup) ---
apiRouter.post('/images/upload', optionalAuth, uploadImage.single('image'), ImageController.upload);

// --- Leads (ServeGo business model) ---
apiRouter.get('/leads', requireAuth, LeadController.getMine);
apiRouter.get('/leads/:id', requireAuth, LeadController.getById);
apiRouter.patch('/leads/:id/view', requireAuth, requireRole('provider'), LeadController.view);
apiRouter.patch('/leads/:id/accept', requireAuth, requireRole('provider'), LeadController.accept);
apiRouter.patch('/leads/:id/reject', requireAuth, requireRole('provider'), LeadController.reject);

// --- Permanent / Contract service requests (admin-managed) ---
apiRouter.post('/permanent-service-requests', requireAuth, requireRole('customer'), validate(createPermanentServiceRequestValidation), PermanentServiceRequestController.create);
apiRouter.get('/permanent-service-requests/mine', requireAuth, requireRole('customer'), PermanentServiceRequestController.getMine);
apiRouter.get('/permanent-service-requests', requireAuth, requireRole('admin'), PermanentServiceRequestController.listAll);
apiRouter.get('/permanent-service-requests/:id', requireAuth, PermanentServiceRequestController.getById);
apiRouter.patch('/permanent-service-requests/:id', requireAuth, requireRole('admin'), validate(updatePermanentServiceRequestValidation), PermanentServiceRequestController.update);
apiRouter.post('/permanent-service-requests/:id/cancel', requireAuth, requireRole('customer'), PermanentServiceRequestController.cancel);

// --- Subscriptions (provider) ---
apiRouter.get('/subscriptions/plans', requireAuth, requireRole('provider'), SubscriptionController.getPlans);
apiRouter.get('/subscriptions/me', requireAuth, requireRole('provider'), SubscriptionController.getCurrent);
apiRouter.get('/subscriptions/remaining', requireAuth, requireRole('provider'), SubscriptionController.remaining);
apiRouter.post('/subscriptions/purchase', requireAuth, requireRole('provider'), SubscriptionController.purchase);
apiRouter.get('/subscriptions/transactions', requireAuth, requireRole('provider'), SubscriptionController.history);
apiRouter.get('/subscriptions/transactions/:id', requireAuth, SubscriptionController.getTransaction);
apiRouter.get('/subscriptions/payment/config', requireAuth, requireRole('provider'), SubscriptionController.gatewayConfig);
apiRouter.post('/subscriptions/payment/verify', requireAuth, requireRole('provider'), SubscriptionController.verify);
// Public webhook (raw body registered in server.js before the JSON parser).
apiRouter.post('/subscriptions/payment/webhook', SubscriptionController.webhook);

// --- Provider levels / performance ---
apiRouter.get('/provider-performance/me', requireAuth, requireRole('provider'), ProviderBusinessController.getMyPerformance);
apiRouter.get('/level-rules', requireAuth, requireRole('provider'), ProviderBusinessController.getLevelRules);
apiRouter.get('/promotions/me', requireAuth, requireRole('provider'), ProviderBusinessController.getMyPromotions);
apiRouter.post('/promotions/:id/acknowledge', requireAuth, requireRole('provider'), ProviderBusinessController.acknowledgePromotion);
apiRouter.get('/provider-level-history/me', requireAuth, requireRole('provider'), ProviderBusinessController.getMyLevelHistory);

// --- Admin: business model ---
apiRouter.get('/admin/configs', requireAuth, requireRole('admin'), AdminBusinessController.getConfigs);
apiRouter.put('/admin/configs/:key', requireAuth, requireRole('admin'), AdminBusinessController.updateConfig);
apiRouter.patch('/admin/configs/:key', requireAuth, requireRole('admin'), AdminBusinessController.updateConfig);

apiRouter.get('/admin/subscription-plans', requireAuth, requireRole('admin'), AdminBusinessController.getPlans);
apiRouter.post('/admin/subscription-plans', requireAuth, requireRole('admin'), AdminBusinessController.createPlan);
apiRouter.patch('/admin/subscription-plans/:id', requireAuth, requireRole('admin'), AdminBusinessController.updatePlan);

apiRouter.get('/admin/level-rules', requireAuth, requireRole('admin'), AdminBusinessController.getLevelRules);
apiRouter.patch('/admin/level-rules/:id', requireAuth, requireRole('admin'), AdminBusinessController.updateLevelRule);

apiRouter.get('/admin/leads', requireAuth, requireRole('admin'), AdminBusinessController.getLeads);
apiRouter.get('/admin/leads/:id', requireAuth, requireRole('admin'), AdminBusinessController.getLeadById);
apiRouter.get('/admin/providers/performance', requireAuth, requireRole('admin'), AdminBusinessController.getProviderPerformance);
apiRouter.get('/admin/analytics/cancellations', requireAuth, requireRole('admin'), AdminBusinessController.getCancellationAnalytics);
apiRouter.get('/admin/analytics/subscriptions', requireAuth, requireRole('admin'), AdminBusinessController.getSubscriptionAnalytics);
apiRouter.get('/admin/analytics/promotions', requireAuth, requireRole('admin'), AdminBusinessController.getPromotionAnalytics);

// --- Wallet (credits) ---
apiRouter.get('/wallet', requireAuth, WalletController.getMyWallet);
apiRouter.get('/wallet/ledger', requireAuth, WalletController.getMyLedger);
apiRouter.get('/wallet/withdrawal/config', requireAuth, requireRole('provider'), WalletController.getWithdrawalConfig);
apiRouter.post('/wallet/withdrawals', requireAuth, requireRole('provider'), validate(requestWithdrawalValidation), WalletController.requestWithdrawal);
apiRouter.get('/wallet/withdrawals', requireAuth, requireRole('provider'), WalletController.getMyWithdrawals);

// Admin wallet
apiRouter.get('/admin/wallet', requireAuth, requireRole('admin'), WalletController.getAdminWallet);
apiRouter.get('/admin/wallet/ledger', requireAuth, requireRole('admin'), WalletController.getAdminLedger);
apiRouter.get('/admin/wallet/withdrawals', requireAuth, requireRole('admin'), WalletController.getAdminWithdrawals);
apiRouter.patch('/admin/wallet/withdrawals/:id/process', requireAuth, requireRole('admin'), validate(processWithdrawalValidation), WalletController.processWithdrawal);
apiRouter.post('/admin/wallet/credit', requireAuth, requireRole('admin'), validate(adminCreditWalletValidation), WalletController.adminCredit);

// --- Disputes ---
apiRouter.post('/disputes', requireAuth, validate(createDisputeValidation), DisputeController.create);
apiRouter.get('/disputes/mine', requireAuth, DisputeController.getMine);
apiRouter.get('/disputes/:id', requireAuth, DisputeController.getById);
apiRouter.post('/disputes/:id/messages', requireAuth, validate(addDisputeMessageValidation), DisputeController.addMessage);
apiRouter.patch('/disputes/:id/resolve', requireAuth, requireRole('admin'), validate(resolveDisputeValidation), DisputeController.resolve);
apiRouter.patch('/disputes/:id/reject', requireAuth, requireRole('admin'), DisputeController.reject);

// Admin disputes
apiRouter.get('/admin/disputes', requireAuth, requireRole('admin'), DisputeController.getAdminDisputes);
apiRouter.get('/admin/disputes/stats', requireAuth, requireRole('admin'), DisputeController.getAdminStats);

export default apiRouter;
