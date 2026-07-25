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
    .isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters')
    .escape(),
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
    .notEmpty().withMessage('Please confirm your password'),
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
    .trim()
    .notEmpty().withMessage('Provider ID is required'),
  body('serviceCategory')
    .trim()
    .notEmpty().withMessage('Service category is required')
    .isLength({ max: 200 }).withMessage('Service category too long')
    .escape(),
  body('bookingDate')
    .notEmpty().withMessage('Booking date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const bookingDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (bookingDate < now) {
        throw new Error('Booking date cannot be in the past');
      }
      return true;
    }),
  body('bookingTimeSlot')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Time slot too long')
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
  body('paymentMethod')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Payment method too long')
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

// ==================== Review Validations ====================

export const createReviewValidation = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('providerId')
    .trim()
    .notEmpty().withMessage('Provider ID is required'),
  body('bookingId')
    .trim()
    .notEmpty().withMessage('Booking ID is required'),
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

// ==================== Payment Validations ====================

export const createPaymentValidation = [
  body('bookingId')
    .trim()
    .notEmpty().withMessage('Booking ID is required'),
  body('paymentMethod')
    .trim()
    .notEmpty().withMessage('Payment method is required')
    .isLength({ max: 50 }).withMessage('Payment method too long')
    .escape(),
  body('status')
    .optional()
    .isIn(['PENDING', 'UNPAID', 'PAID', 'FAILED']).withMessage('Invalid payment status'),
  body('transactionId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Transaction ID too long')
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
    .isInt({ min: 0, max: 50 }).withMessage('Experience years must be between 0 and 50')
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
    .isInt({ min: 0, max: 50 }).withMessage('Experience years must be between 0 and 50'),
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
