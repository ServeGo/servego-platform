import { body, param, query, validationResult } from 'express-validator';
import { sendApiError } from '../utils/response.js';

/**
 * Validation middleware that processes express-validator results
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    return sendApiError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', extractedErrors);
  };
};

// ==================== Authentication Validations ====================

export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Please enter your full name')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Please enter your email address')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email address is too long'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Please enter your phone number')
    .matches(/^[+]?[\d\s-]{10,15}$/).withMessage('Please enter a valid phone number'),
  body('password')
    .notEmpty().withMessage('Please enter a password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*\d)/).withMessage('Password must contain a lowercase letter and a number'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('role')
    .notEmpty().withMessage('Please select your account type')
    .isIn(['customer', 'provider']).withMessage('Account type must be customer or provider'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address is too long')
    .escape(),
  body('pincode')
    .optional()
    .trim()
    .matches(/^[0-9]{5,6}$/).withMessage('Please enter a valid 5-6 digit pincode'),
  body('acceptedTerms')
    .optional()
    .custom((value) => {
      if (value === true || value === 'true' || value === 1 || value === '1') {
        return true;
      }
      throw new Error('Please accept the Terms & Conditions');
    })
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Please enter your email address')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Please enter your password')
];

// ==================== Booking Validations ====================

export const createBookingValidation = [
  body('providerId')
    .optional()
    .trim()
    .notEmpty().withMessage('Provider ID is required'),
  body('serviceCategory')
    .trim()
    .notEmpty().withMessage('Service category is required')
    .isLength({ max: 200 }).withMessage('Service category too long')
    .escape(),
  body('locationAddress')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address too long')
    .escape(),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long')
    .escape(),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Instructions too long')
    .escape(),
  body('amount')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) throw new Error('Amount must be a non-negative number');
      return true;
    })
];

export const createPermanentServiceRequestValidation = [
  body('serviceCategory')
    .trim()
    .notEmpty().withMessage('Service category is required')
    .isLength({ max: 200 }).withMessage('Service category too long')
    .escape(),
  body('engagementType')
    .trim()
    .notEmpty().withMessage('Engagement type is required')
    .isIn(['PERMANENT', 'CONTRACT']).withMessage('Engagement type must be PERMANENT or CONTRACT'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .custom((value) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new Error('Start date must be a valid date');
      return true;
    }),
  body('contractDurationYears')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('Contract years must be a whole number between 1 and 99');
      return true;
    }),
  body('contractDurationDays')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 3650) throw new Error('Contract days must be a whole number between 1 and 3650');
      return true;
    }),
  body('monthlyBudget')
    .notEmpty().withMessage('Monthly budget is required')
    .custom((value) => {
      const n = Number(value);
      if (Number.isNaN(n) || n <= 0) throw new Error('Monthly budget must be a positive number');
      return true;
    }),
  body('additionalInfo')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Additional information too long')
    .escape()
];

export const updatePermanentServiceRequestValidation = [
  body('status')
    .optional()
    .isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
  body('assignedProviderId')
    .optional({ values: 'falsy' })
    .trim(),
  body('adminNote')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Admin note too long')
    .escape()
];

export const updateBookingStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid booking status'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Note too long')
    .escape()
];

export const updateBookingLocationValidation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('accuracy')
    .optional()
    .toFloat()
    .isFloat({ min: 0, max: 100000 }).withMessage('Accuracy must be a non-negative number of meters')
];

// ==================== Wallet Validations ====================

export const requestWithdrawalValidation = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .toFloat()
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('accountDetails')
    .optional()
    .isObject().withMessage('Account details must be an object'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long')
    .escape()
];

export const processWithdrawalValidation = [
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['APPROVED', 'REJECTED', 'PAID']).withMessage('Action must be APPROVED, REJECTED or PAID'),
  body('adminNote')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Admin note too long')
    .escape()
];

export const adminCreditWalletValidation = [
  body('userId')
    .trim()
    .notEmpty().withMessage('User ID is required'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .toFloat()
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .isIn(['PROMOTIONAL_CREDIT', 'ADJUSTMENT', 'BOOKING_REFUND', 'DISPUTE_REFUND']).withMessage('Invalid credit category'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long')
    .escape()
];

// ==================== Review Validations ====================

export const createReviewValidation = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('providerId')
    .trim()
    .notEmpty().withMessage('Provider ID is required'),
  body('bookingId')
    .optional()
    .trim()
    .notEmpty().withMessage('Booking ID must not be empty if provided'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Comment too long')
    .escape(),
  body('serviceCategory')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Service category too long')
    .escape()
];

// ==================== Ticket Validations ====================

export const createTicketValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters')
    .escape(),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
    .escape()
];

export const resolveTicketValidation = [
  body('response')
    .trim()
    .notEmpty().withMessage('Response is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Response must be between 10 and 2000 characters')
    .escape()
];

// ==================== Provider Validations ====================

export const registerProviderServiceValidation = [
  body('serviceName')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ max: 200 }).withMessage('Service name too long'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('popularIssues')
    .optional()
    .isArray().withMessage('Popular issues must be an array'),
  body('experienceYears')
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage('Experience years must be between 1 and 50')
];

export const updateProviderProfileValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Bio too long')
    .escape(),
  body('specialties')
    .optional()
    .isArray().withMessage('Specialties must be an array'),
  body('serviceAreas')
    .optional()
    .isArray().withMessage('Service areas must be an array'),
  body('experienceYears')
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage('Experience years must be between 1 and 50'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s-]{10,15}$/).withMessage('Invalid phone number format')
];

export const updateAvailabilityValidation = [
  body('availableDays')
    .optional()
    .isArray().withMessage('Available days must be an array')
    .custom((days) => days.every((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(String(day).trim()))).withMessage('Available days must use Mon through Sun'),
  body('timeSlots')
    .optional()
    .isArray().withMessage('Time slots must be an array'),
  body('availabilitySlots')
    .optional()
    .isArray().withMessage('Availability slots must be an array')
    .custom((slots) => slots.every((slot) => slot && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(String(slot.dayOfWeek).trim()) && /^\d{2}:\d{2}$/.test(String(slot.startTime)) && /^\d{2}:\d{2}$/.test(String(slot.endTime)) && String(slot.startTime) < String(slot.endTime))).withMessage('Each availability slot needs a valid day and start/end time')
];

export const updateUserProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters').escape(),
  body('phone').optional().trim().matches(/^[+]?[\d\s-]{10,15}$/).withMessage('Invalid phone number format'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address is too long').escape(),
  body('pincode').optional().trim().matches(/^[0-9]{5,6}$/).withMessage('Please enter a valid 5-6 digit pincode')
];

export const createAuthenticatedTicketValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters').escape(),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters').escape(),
  body('relatedBookingId').optional().trim().isLength({ max: 100 }).withMessage('Invalid booking ID')
];

// ==================== Service Validations ====================

export const createServiceValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Service name must be between 2 and 200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description too long')
    .escape(),
  body('popularIssues')
    .optional()
    .isArray().withMessage('Popular issues must be an array')
];

export const updateServiceValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Service name must be between 2 and 200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description too long')
    .escape(),
  body('popularIssues')
    .optional()
    .isArray().withMessage('Popular issues must be an array')
];

// ==================== Chat Message Validation ====================

export const sendMessageValidation = [
  body('text')
    .trim()
    .notEmpty().withMessage('Message text is required')
    .isLength({ max: 2000 }).withMessage('Message too long')
    .escape()
];

// ==================== Password Reset Validations ====================

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Please enter your email address')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
];

export const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 10, max: 512 }).withMessage('Invalid reset token'),
  body('password')
    .notEmpty().withMessage('Please enter a new password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*\d)/).withMessage('Password must contain a lowercase letter and a number')
];

// ==================== Parameter Validations ====================

export const mongoIdParam = [
  param('id')
    .trim()
    .notEmpty().withMessage('ID is required')
    .isLength({ max: 100 }).withMessage('Invalid ID format')
];

export const serviceNameQuery = [
  query('serviceName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Service name too long')
    .escape()
];

export const dateQuery = [
  query('date')
    .optional()
    .isISO8601().withMessage('Invalid date format')
];
