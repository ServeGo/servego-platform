import prisma from '../prisma/client.js';
import { refreshProviderReputation } from '../services/providerReputationService.js';
import { canPerformAction } from '../utils/permissions.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { getRoutePlan } from '../services/providerRouteService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { providerDashboardSummary, providerDetails, providerListItem } from '../utils/serializers.js';

// User columns needed to build provider DTOs. Contact fields are fetched once
// and only ever emitted by the serializers for admins / the profile owner.
const PROVIDER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  status: true,
  referralCode: true,
  referralsCount: true,
  referralBonusEarned: true,
  referralDiscountBalance: true,
  createdAt: true
};

// Columns the provider serializers actually render (rule 12 — never pull full
// review/badge/slot rows onto a profile when only a handful of fields are read).
const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  reviewerName: true,
  serviceCategory: true,
  bookingId: true,
  date: true
};
const BADGE_SELECT = { badgeType: true, awardedAt: true };
const SLOT_SELECT = { id: true, dayOfWeek: true, startTime: true, endTime: true };

export const ProviderController = {
  registerOwnProviderService: async (req, res) => {
    const provider = await prisma.provider.findFirst({
      where: { userId: req.user.id },
      select: { id: true, profileComplete: true, isVerified: true }
    });
    if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
    if (!provider.profileComplete) {
      return sendApiError(res, 403, 'PROFILE_INCOMPLETE', 'Complete your provider profile before submitting services.');
    }
    if (!provider.isVerified) {
      return sendApiError(res, 403, 'NOT_VERIFIED', 'Your profile must be verified before registering for services.');
    }
    req.params.id = provider.id;
    return ProviderController.registerProviderService(req, res);
  },

  getProviderServices: async (req, res) => {
    try {
      const { id } = req.params;

      const provider = await prisma.provider.findUnique({ where: { id }, select: { userId: true } });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Service provider not found');
      const canViewRequests = req.user?.role === 'admin' || req.user?.id === provider.userId;

      const [approvedLinks, requests] = await Promise.all([
        prisma.providerService.findMany({
          where: { providerId: id },
          include: { service: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.providerServiceRequest.findMany({
          where: {
            providerId: id,
            // Pending/denied applications are private to the provider and
            // admins. Public provider profiles expose approved services only.
            ...(canViewRequests ? { status: { not: 'APPROVED' } } : { id: '__not_visible__' })
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const uniqueApprovedLinks = Array.from(
        new Map(approvedLinks.map((link) => [link.serviceId, link])).values()
      );

      const formattedApproved = uniqueApprovedLinks.map((link) => ({
        id: link.id,
        name: link.service.name,
        approvalStatus: 'APPROVED',
        description: link.description,
        createdAt: link.createdAt
      }));

      const approvedNameSet = new Set(
        uniqueApprovedLinks.map((link) => String(link.service.name || '').trim().toLowerCase())
      );

      const formattedRequests = requests
        .filter((r) => {
          const requestedNameNormalized = String(r.requestedServiceName || '').trim().toLowerCase();
          return !approvedNameSet.has(requestedNameNormalized);
        })
        .map((r) => ({
          id: r.id,
          name: r.requestedServiceName,
          approvalStatus: r.status,
          description: r.description,
          experienceYears: r.experienceYears,
          popularIssues: Array.isArray(r.popularIssues) ? r.popularIssues : [],
          denialReason: r.denialReason,
          createdAt: r.createdAt
        }));

      const combined = [...formattedApproved, ...formattedRequests].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return sendApiSuccess(res, 200, combined);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider services', err.message);
    }
  },

  getMyProviderServices: async (req, res) => {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
    req.params.id = provider.id;
    return ProviderController.getProviderServices(req, res);
  },

  // Provider's own dashboard contract: profile + contact + availability + the
  // review audit, via the purpose-specific ProviderDashboardSummary DTO.
  getMyDashboardSummary: async (req, res) => {
    try {
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user.id },
        include: {
          user: { select: PROVIDER_USER_SELECT },
          reviews: { select: REVIEW_SELECT, orderBy: { date: 'desc' } },
          badges: { select: BADGE_SELECT },
          availabilitySlots: { select: SLOT_SELECT }
        }
      });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      return sendApiSuccess(res, 200, providerDashboardSummary(provider));
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load provider dashboard summary', err.message);
    }
  },

  registerProviderService: async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceName, description, popularIssues, experienceYears } = req.body || {};
      const role = req.user?.role || req.body?.role || 'provider';

      if (!req.user?.id && role !== 'admin') {
        return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
      }

      if (role !== 'provider' && role !== 'admin') {
        return sendApiError(res, 403, 'FORBIDDEN', 'You are not allowed to register a provider service.');
      }

      if (!serviceName) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: serviceName');
      }
      if (!description || !String(description).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: description');
      }

      const provider = await prisma.provider.findUnique({ where: { id } });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Service provider not found');
      if (role !== 'admin' && provider.userId !== req.user?.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only manage your own provider profile.');
      }
      if (role !== 'admin' && !provider.isVerified) {
        return sendApiError(res, 403, 'NOT_VERIFIED', 'Your profile must be verified before registering for services.');
      }

      const requestedService = String(serviceName).trim();

      const existingApproved = await prisma.providerService.findFirst({
        where: {
          providerId: provider.id,
          service: {
            name: { equals: requestedService, mode: 'insensitive' }
          }
        },
        select: { id: true }
      });
      if (existingApproved) {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'Service already registered for this provider.');
      }

      const existingPending = await prisma.providerServiceRequest.findFirst({
        where: {
          providerId: provider.id,
          requestedServiceName: { equals: requestedService, mode: 'insensitive' },
          status: 'PENDING'
        },
        select: { id: true }
      });
      if (existingPending) {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'Service request already pending approval.');
      }

      const existingRequest = await prisma.providerServiceRequest.findFirst({
        where: {
          providerId: provider.id,
          requestedServiceName: { equals: requestedService, mode: 'insensitive' }
        },
        select: { status: true }
      });

      if (existingRequest && existingRequest.status !== 'DENIED') {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'Service request already submitted for this provider.');
      }

      const created = await prisma.providerServiceRequest.create({
        data: {
          providerId: provider.id,
          requestedServiceName: requestedService,
          description: String(description).trim(),
          popularIssues: Array.isArray(popularIssues) ? popularIssues : [],
          experienceYears:
            experienceYears !== undefined && experienceYears !== null && experienceYears !== ''
              ? Number(experienceYears)
              : null,
          status: 'PENDING'
        }
      });

      // Notify admin room of new approval request
      const io = req.app?.get('socketio');
      if (io) {
        io.to('room:admin').emit('newApprovalRequest', {
          requestId: created.id,
          providerId: provider.id,
          serviceName: requestedService
        });
      }
      if (
        experienceYears !== undefined &&
        experienceYears !== null &&
        experienceYears !== '' &&
        !Number.isNaN(Number(experienceYears))
      ) {
        await prisma.provider.update({
          where: { id },
          data: { experienceYears: Number(experienceYears) }
        });
      }

      return sendApiSuccess(res, 201, created);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to register provider service', err.message);
    }
  },


  getAll: async (req, res) => {
    try {
      const isAdmin = req.user?.role === 'admin';
      const isProvider = req.user?.role === 'provider';
      const publicProviderWhere = { accountStatus: 'ACTIVE', isVerified: true, user: { status: 'ACTIVE' } };

      // Providers retain access to their own profile even while it awaits
      // verification or an admin account-status decision. Resolve the owner's
      // provider row so the serializer can attach their private review audit.
      let ownProviderId = null;
      if (isProvider) {
        const own = await prisma.provider.findUnique({
          where: { userId: req.user.id },
          select: { id: true }
        });
        ownProviderId = own?.id || null;
      }

      const providers = await prisma.provider.findMany({
        where: isAdmin ? {} : isProvider ? { OR: [publicProviderWhere, { userId: req.user.id }] } : publicProviderWhere,
        include: {
          // Public rows only need id/name/avatar for the card; contact fields
          // are fetched for admins and the owner (whose row serializer emits them).
          user: {
            select: isAdmin || isProvider ? PROVIDER_USER_SELECT : { id: true, name: true, avatar: true }
          },
          badges: { select: BADGE_SELECT }
        }
      });

      // The provider's own dashboard renders the review audit from this list
      // row. Reviews for every other row are dropped (the card only uses the
      // rating/reviewCount scalars), so load them only for the owner.
      if (isProvider && ownProviderId) {
        const own = providers.find((p) => p.id === ownProviderId);
        if (own) {
          own.reviews = await prisma.review.findMany({
            where: { providerId: ownProviderId },
            orderBy: { date: 'desc' }
          });
        }
      }

      return sendApiSuccess(
        res,
        200,
        providers.map((provider) =>
          providerListItem(provider, {
            includeContact: isAdmin || provider.userId === req.user.id,
            isOwnRow: isProvider && provider.userId === req.user.id
          })
        )
      );
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch service partners', err.message);
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === 'admin';
      const provider = await prisma.provider.findUnique({
        where: { id },
        include: {
          user: { select: PROVIDER_USER_SELECT },
          reviews: { select: REVIEW_SELECT, orderBy: { date: 'desc' } },
          badges: { select: BADGE_SELECT },
          availabilitySlots: { select: SLOT_SELECT }
        }
      });
      if (!provider) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service provider not found');
      }
      const isOwner = req.user?.role === 'provider' && provider.userId === req.user.id;
      if (!isAdmin && !isOwner && (!provider.isVerified || provider.accountStatus !== 'ACTIVE' || provider.user?.status !== 'ACTIVE')) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service provider not found');
      }
      return sendApiSuccess(
        res,
        200,
        providerDetails(provider, { includeContact: isAdmin || isOwner })
      );
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve provider details', err.message);
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const { bio, specialties, serviceAreas, experienceYears, phone, avatar } = req.body;

      const existing = await prisma.provider.findUnique({ where: { id } });
      if (!existing) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service provider profile missing');
      }
      if (req.user.role !== 'admin' && existing.userId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only update your own provider profile.');
      }

      const nextBio = bio ?? existing.bio;
      const nextSpecialties = Array.isArray(specialties) ? specialties : existing.specialties;
      const nextAreas = Array.isArray(serviceAreas) ? serviceAreas : existing.serviceAreas;
      const profileComplete = Boolean(String(nextBio || '').trim() && Array.isArray(nextSpecialties) && nextSpecialties.length && Array.isArray(nextAreas) && nextAreas.length);
      const updated = await prisma.$transaction(async (tx) => {
        if (phone !== undefined) {
          await tx.user.update({ where: { id: existing.userId }, data: { phone: String(phone).trim() } });
        }
        if (avatar !== undefined && avatar !== null) {
          await tx.user.update({ where: { id: existing.userId }, data: { avatar: String(avatar).trim() || null } });
        }
        return tx.provider.update({
          where: { id },
          data: {
            bio: nextBio,
            specialties: nextSpecialties,
            serviceAreas: nextAreas,
            experienceYears: Number.isFinite(Number(experienceYears)) ? Number(experienceYears) : existing.experienceYears,
            profileComplete
          },
          include: { reviews: true, user: { select: { id: true, name: true, email: true, phone: true, avatar: true } } }
        });
      }, { maxWait: 20000, timeout: 30000 });

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update partner profile', err.message);
    }
  },


  updateMyAvailability: async (req, res) => {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
    req.params.id = provider.id;
    return ProviderController.updateAvailability(req, res);
  },

  updateAvailability: async (req, res) => {
    try {
      const { id } = req.params;
      const { availableDays, timeSlots, availabilitySlots } = req.body;
      const provider = await prisma.provider.findUnique({ where: { id }, select: { userId: true } });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Service provider profile missing');
      if (req.user.role !== 'admin' && provider.userId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only update your own availability.');
      }
      const slots = Array.isArray(availabilitySlots)
        ? availabilitySlots.map((slot) => ({ dayOfWeek: String(slot?.dayOfWeek || '').trim(), startTime: String(slot?.startTime || '').trim(), endTime: String(slot?.endTime || '').trim() }))
        : null;
      if (slots) {
        if (slots.some((slot) => !slot.dayOfWeek || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime) || slot.startTime >= slot.endTime)) {
          return sendApiError(res, 400, 'INVALID_AVAILABILITY', 'Each slot needs a day and valid start/end times (HH:MM).');
        }
        const ordered = [...slots].sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
        if (ordered.some((slot, index) => index > 0 && ordered[index - 1].dayOfWeek === slot.dayOfWeek && ordered[index - 1].endTime > slot.startTime)) {
          return sendApiError(res, 409, 'OVERLAPPING_AVAILABILITY', 'Availability slots cannot overlap on the same day.');
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        if (slots) {
          await tx.availabilitySlot.deleteMany({ where: { providerId: id } });
          if (slots.length) await tx.availabilitySlot.createMany({ data: slots.map((slot) => ({ ...slot, providerId: id })) });
        }
        return tx.provider.update({
          where: { id },
          data: {
            availableDays: Array.isArray(availableDays) ? availableDays : undefined,
            timeSlots: Array.isArray(timeSlots) ? timeSlots : undefined
          },
          include: { availabilitySlots: true }
        });
      }, { maxWait: 20000, timeout: 30000 });
      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update calendar availability schedule', err.message);
    }
  },

  // Provider base location + service radius (used as the origin for the
  // route planner and for nearby-provider matching).
  updateMyLocation: async (req, res) => {
    try {
      const { latitude, longitude, maxRadiusKm } = req.body;
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Valid latitude and longitude are required.');
      }
      const radius = Number(maxRadiusKm);
      if (!Number.isFinite(radius) || radius <= 0) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'maxRadiusKm must be a positive number.');
      }

      const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const updated = await prisma.provider.update({
        where: { id: provider.id },
        data: { latitude: Number(latitude), longitude: Number(longitude), maxRadiusKm: radius }
      });
      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update provider location', err.message);
    }
  },

  // Online / accepting-bookings toggle (powers the "Nearby Providers" matching).
  updateMyAvailabilityStatus: async (req, res) => {
    try {
      const { isOnline, acceptingBookings } = req.body;
      if (isOnline === undefined && acceptingBookings === undefined) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Provide at least one of isOnline or acceptingBookings.');
      }

      const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const updated = await prisma.provider.update({
        where: { id: provider.id },
        data: {
          ...(isOnline !== undefined ? { isOnline: Boolean(isOnline) } : {}),
          ...(acceptingBookings !== undefined ? { acceptingBookings: Boolean(acceptingBookings) } : {})
        }
      });
      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update provider availability', err.message);
    }
  },

  // Route optimization: upcoming active bookings ordered into a visit sequence.
  getMyRoutePlan: async (req, res) => {
    try {
      const route = await getRoutePlan({ providerUserId: req.user.id });
      if (!route) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      return sendApiSuccess(res, 200, route);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to build route plan', err.message);
    }
  },

  verify: async (req, res) => {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;

      const existing = await prisma.provider.findUnique({ where: { id }, select: { isVerified: true } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');

      await prisma.provider.update({ where: { id }, data: { isVerified: Boolean(isVerified) } });
      const updated = await refreshProviderReputation(id);

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: isVerified ? 'VERIFY_PROVIDER' : 'UNVERIFY_PROVIDER',
        targetType: 'Provider',
        targetId: id,
        oldValue: { isVerified: existing.isVerified },
        newValue: { isVerified: Boolean(isVerified) },
        ip: req.ip
      });

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to verify provider credentials', err.message);
    }
  }
};
