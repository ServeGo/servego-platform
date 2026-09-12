import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../prisma/client.js';
import { generateTokenPair, verifyRefreshToken, isAuthBlocked, recordFailedAuthAttempt } from '../utils/auth.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { validatePasswordStrength } from '../utils/validation.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { nextBusinessNumber } from '../utils/businessNumber.js';

export const UserController = {
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || !String(email).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please enter your email address.');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      // Always return success to prevent email enumeration
      if (!user) {
        return sendApiSuccess(res, 200, { message: 'If an account with that email exists, a reset link has been sent.' });
      }

      // Generate a random token and store its SHA-256 hash
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: tokenHash, resetTokenExpiry: expiry }
      });

      // Send email
      try {
        const emailResult = await sendPasswordResetEmail(normalizedEmail, rawToken);
        console.log('[forgotPassword] Email sent successfully:', emailResult?.messageId);
      } catch (emailErr) {
        console.error('[forgotPassword] Failed to send email:', emailErr.message);
        console.error('[forgotPassword] Full error:', emailErr);
        // Clear the reset token since the user will never receive it
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: null, resetTokenExpiry: null }
        });
        return sendApiError(res, 500, 'EMAIL_FAILED', 'Failed to send reset email. Please try again later.');
      }

      return sendApiSuccess(res, 200, { message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (err) {
      console.error('[forgotPassword] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again later.');
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body || {};

      if (!token || !String(token).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Reset token is required.');
      }
      if (!password) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please enter a new password.');
      }

      const passwordErrors = validatePasswordStrength(password);
      if (passwordErrors.length > 0) {
        return sendApiError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 8 characters and include a lowercase letter and a number', passwordErrors);
      }

      // Hash the incoming token to match the stored hash
      const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          resetToken: tokenHash,
          resetTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        return sendApiError(res, 400, 'INVALID_TOKEN', 'This reset link is invalid or has expired. Please request a new one.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      return sendApiSuccess(res, 200, { message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (err) {
      console.error('[resetPassword] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again later.');
    }
  },

  getUsers: async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return sendApiError(res, 403, 'FORBIDDEN', 'Admin access required.');
      }

      const { page = 1, limit = 50, role, status, search } = req.query;
      const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));

      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            status: true,
            address: true,
            pincode: true,
            referralCode: true,
            referredBy: true,
            referralsCount: true,
            referralDiscountBalance: true,
            referralBonusEarned: true, profileComplete: true,
            providerId: true,
            customerNumber: true,
            providerNumber: true,
            createdAt: true,
            updatedAt: true,
            // Admin tables render profile scalars only. Don't pull the large
            // JSON array columns (specialties, serviceAreas, timeSlots,
            // availableDays) for every user on the page.
            customerProfile: {
              select: { id: true, address: true, pincode: true, createdAt: true }
            },
            providerProfile: {
              select: {
                id: true,
                category: true,
                rating: true,
                reviewCount: true,
                accountStatus: true,
                isVerified: true,
                verificationLevel: true,
                providerLevel: true,
                profileComplete: true,
                createdAt: true
              }
            }
          },
          skip,
          take: Math.min(100, Math.max(1, parseInt(limit))),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      return sendApiSuccess(res, 200, {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
        }
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve users', err.message);
    }
  },

  register: async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        role,
        password,
        confirmPassword,
        address,
        pincode,
        latitude,
        longitude,
        imageUrl
      } = req.body;

      // Basic validation
      if (!name || !email || !phone || !role || !password) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please fill in all required fields');
      }

      if (!confirmPassword) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please confirm your password');
      }

      if (password !== confirmPassword) {
        return sendApiError(res, 400, 'PASSWORD_MISMATCH', 'Passwords do not match. Please try again.');
      }

      // Password strength validation
      const passwordErrors = validatePasswordStrength(password);
      if (passwordErrors.length > 0) {
        return sendApiError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 8 characters and include a lowercase letter and a number', passwordErrors);
      }

      if (role !== 'customer' && role !== 'provider') {
        return sendApiError(res, 400, 'INVALID_ROLE', 'Account type must be customer or provider');
      }

      if (role === 'customer') {
        if (!address) {
          return sendApiError(res, 400, 'MISSING_FIELDS', 'Please enter your service address.');
        }
        if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
          return sendApiError(res, 400, 'MISSING_FIELDS', 'Please choose your service location on the map.');
        }
        if (pincode != null && pincode !== '' && !/^[0-9]{5,6}$/.test(String(pincode))) {
          return sendApiError(res, 400, 'INVALID_PINCODE', 'Please enter a valid 5-6 digit pincode.');
        }
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        return sendApiError(res, 400, 'EMAIL_EXISTS', 'An account with this email already exists. Try logging in instead.');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const referralCode = `SERVEGO-${role === 'provider' ? 'PRO' : 'CUST'}-${name.substring(0, 3).toUpperCase().replace(/\s/g, 'X')}${Math.floor(10 + Math.random() * 90)}`;
      const avatar = (imageUrl && String(imageUrl).trim())
        ? String(imageUrl).trim()
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F172A&color=fff&size=150`;
      const verificationCode = role === 'customer' ? String(Math.floor(1000 + Math.random() * 9000)) : null;

      // Business display identifiers — CID-0001 (customer), PID-0001 (provider).
      const customerNumber = role === 'customer' ? await nextBusinessNumber('CUSTOMER') : null;
      const providerNumber = role === 'provider' ? await nextBusinessNumber('PROVIDER') : null;

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: String(phone).trim(),
          role,
          password: hashedPassword,
          avatar,
          status: 'ACTIVE',
          address: address?.trim() || null,
          pincode: pincode ? String(pincode).trim() : null,
          latitude: latitude != null && !Number.isNaN(Number(latitude)) ? Number(latitude) : null,
          longitude: longitude != null && !Number.isNaN(Number(longitude)) ? Number(longitude) : null,
          referralCode,
          verificationCode,
          customerNumber,
          providerNumber,
          referralsCount: 0,
          referralDiscountBalance: 0
        }
      });

      let customerProfile = null;
      let providerProfile = null;

      if (role === 'customer') {
        customerProfile = await prisma.customer.create({
          data: {
            userId: newUser.id,
            address: address.trim(),
            pincode: pincode ? String(pincode).trim() : null,
            preferences: []
          }
        });

        // The signup address becomes the customer's first saved address,
        // labelled HOME and marked as the default (Blinkit-style).
        if (address && String(address).trim()) {
          await prisma.customerAddress.create({
            data: {
              userId: newUser.id,
              label: 'HOME',
              address: String(address).trim(),
              pincode: pincode ? String(pincode).trim() : null,
              latitude: latitude != null && !Number.isNaN(Number(latitude)) ? Number(latitude) : null,
              longitude: longitude != null && !Number.isNaN(Number(longitude)) ? Number(longitude) : null,
              isDefault: true
            }
          });
        }
      } else {
        // New providers start in the GENERAL sector (every provider stays
        // GENERAL for now). They request their own service(s) from their
        // dashboard after signup; a provider only receives leads once at
        // least one service is admin-approved (see leadService).
        const provider = await prisma.provider.create({
          data: {
            userId: newUser.id,
            category: 'General',
            sector: 'GENERAL',
            isOnline: true,
            acceptingBookings: true,
            maxRadiusKm: 50,
            profileComplete: false,
            isVerified: false,
            accountStatus: 'ACTIVE',
            specialties: [],
            serviceAreas: [],
            availableDays: [],
            timeSlots: []
          }
        });

        await prisma.user.update({ where: { id: newUser.id }, data: { providerId: provider.id } });

        await prisma.wallet.create({ data: { userId: newUser.id } });

        await prisma.providerLevelHistory.create({
          data: { providerId: provider.id, level: 'BRONZE', reason: 'INITIAL', completedJobs: 0 }
        });

        providerProfile = {
          id: provider.id,
          category: provider.category,
          sector: provider.sector,
          accountStatus: provider.accountStatus,
          isVerified: provider.isVerified,
          profileComplete: provider.profileComplete,
          rating: provider.rating,
          reviewCount: provider.reviewCount,
          providerLevel: provider.providerLevel,
          createdAt: provider.createdAt
        };
      }

      await prisma.authEvent.create({
        data: {
          userId: newUser.id,
          email: newUser.email,
          eventType: 'SIGNUP',
          success: true,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      const safeUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        avatar: newUser.avatar,
        status: newUser.status,
        profileComplete: newUser.profileComplete,
        address: newUser.address,
        pincode: newUser.pincode,
        verificationCode: newUser.verificationCode,
        providerId: role === 'provider' ? providerProfile?.id : null,
        customerNumber: newUser.customerNumber,
        providerNumber: newUser.providerNumber,
        customerProfile: customerProfile,
        providerProfile: providerProfile,
        referralCode: newUser.referralCode,
        referredBy: newUser.referredBy,
        referralsCount: newUser.referralsCount,
        referralDiscountBalance: newUser.referralDiscountBalance,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      const tokens = generateTokenPair(newUser);

      return sendApiSuccess(res, 201, { user: safeUser, ...tokens });
    } catch (err) {
      console.error('Signup registration error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Server signup registration failed',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please enter your email and password');
      }

      const clientIp = req.ip || req.connection?.remoteAddress;
      if (isAuthBlocked(clientIp)) {
        return sendApiError(res, 429, 'AUTH_BLOCKED', 'Too many login attempts. Please try again after 15 minutes');
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          customerProfile: true,
          providerProfile: true
        }
      });

      const isValidCredentials = user && await bcrypt.compare(password, user.password);
      
      if (!isValidCredentials) {
        await prisma.authEvent.create({
          data: {
            email: normalizedEmail,
            eventType: 'LOGIN',
            success: false,
            ip: clientIp,
            userAgent: req.get('user-agent')
          }
        });
        
        recordFailedAuthAttempt(clientIp);
        
        return sendApiError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      if (user.status !== 'ACTIVE') {
        const blockedReason = user.status === 'INACTIVE' || user.status === 'SUSPENDED' ? 'inactive_or_suspended' : 'under_review';
        return sendApiError(res, 403, 'ACCOUNT_NOT_ACTIVE', 'Your account is not active. Please contact support for assistance', { blockedReason });
      }
      if (user.role === 'provider' && user.providerProfile?.accountStatus === 'BLOCKED') {
        return sendApiError(res, 403, 'PROVIDER_BLOCKED', 'This provider account has been blocked. Please contact support.');
      }

      await prisma.authEvent.create({
        data: {
          userId: user.id,
          email: user.email,
          eventType: 'LOGIN',
          success: true,
          ip: clientIp,
          userAgent: req.get('user-agent')
        }
      });

      const { password: _, ...safeUser } = user;
      const tokens = generateTokenPair(user);
      
      return sendApiSuccess(res, 200, { user: safeUser, ...tokens });
    } catch (err) {
      console.error('Login error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again later',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return sendApiError(res, 400, 'MISSING_TOKEN', 'Refresh token is required.');
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return sendApiError(res, 401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        return sendApiError(res, 401, 'ACCOUNT_INACTIVE', 'User account is not active.');
      }

      const tokens = generateTokenPair(user);

      return sendApiSuccess(res, 200, tokens);
    } catch (err) {
      console.error('Token refresh error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to refresh token',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          avatar: true, status: true, profileComplete: true, address: true, pincode: true,
          referralCode: true, referredBy: true, referralsCount: true,
          referralDiscountBalance: true, referralBonusEarned: true,
          verificationCode: true,
          providerId: true, createdAt: true, updatedAt: true,
          customerProfile: true,
          customerAddresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
          },
          providerProfile: {
            select: {
              id: true, category: true, rating: true, reviewCount: true,
              verificationLevel: true, accountStatus: true, experienceYears: true,
              jobsCompleted: true, bio: true, specialties: true, serviceAreas: true,
              photo: true, isVerified: true, isFeatured: true,
              availableDays: true, timeSlots: true
            }
          }
        }
      });
      if (!user) return sendApiError(res, 404, 'NOT_FOUND', 'User not found.');
      return sendApiSuccess(res, 200, { user });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch user profile', err.message);
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, address, pincode, avatar } = req.body;

      if (req.user?.role !== 'admin' && req.user?.id !== id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only update your own profile.');
      }

      const user = await prisma.user.findUnique({ where: { id }, include: { customerProfile: true } });
      if (!user) {
        return sendApiError(res, 404, 'USER_NOT_FOUND', 'User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name: name?.trim() ?? user.name,
          phone: phone?.trim() ?? user.phone,
          address: address?.trim() ?? user.address,
          pincode: pincode?.trim() ?? user.pincode,
          avatar: avatar !== undefined && avatar !== null ? String(avatar).trim() || null : user.avatar
        },
        include: {
          customerProfile: true,
          providerProfile: true
        }
      });

      if (user.role === 'customer') {
        if (user.customerProfile) {
          await prisma.customer.update({
            where: { id: user.customerProfile.id },
            data: {
              address: address?.trim() ?? user.customerProfile.address,
              pincode: pincode?.trim() ?? user.customerProfile.pincode
            }
          });
        } else if (address && pincode) {
          await prisma.customer.create({
            data: {
              userId: user.id,
              address: address.trim(),
              pincode: pincode.trim(),
              preferences: []
            }
          });
        }

        // Keep the saved-address list consistent with the profile address: if a
        // customer has no saved address yet (pre-existing account), their
        // profile address becomes the default HOME entry.
        if (address && String(address).trim()) {
          const hasSaved = await prisma.customerAddress.count({ where: { userId: user.id } });
          if (hasSaved === 0) {
            await prisma.customerAddress.create({
              data: {
                userId: user.id,
                label: 'HOME',
                address: String(address).trim(),
                pincode: pincode ? String(pincode).trim() : null,
                isDefault: true
              }
            });
          }
        }
      }

      const refreshed = await prisma.user.findUnique({
        where: { id },
        include: {
          customerProfile: true,
          customerAddresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
          providerProfile: true
        }
      });
      const { password: __, ...safeUser } = refreshed;
      return sendApiSuccess(res, 200, { user: safeUser });
    } catch (err) {
      console.error('Failed to update user profile:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update user profile',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  }
};
