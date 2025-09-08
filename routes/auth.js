const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors, isValidEmail, isValidPassword } = require('../middleware/validation');
const {
    login,
    register,
    getProfile,
    updateProfile,
    logout,
    verifyToken
} = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email')
        .notEmpty().withMessage('Email is required')
        .custom(isValidEmail).withMessage('Please enter a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .custom(isValidPassword).withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
], login);

// @route   POST /api/auth/register
// @desc    Register new admin user
// @access  Private (Admin only)
router.post('/register', [
    authenticateToken,
    requireAdmin,
    body('email')
        .notEmpty().withMessage('Email is required')
        .custom(isValidEmail).withMessage('Please enter a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .custom(isValidPassword).withMessage('Password must be at least 6 characters long'),
    body('role')
        .optional()
        .isIn(['admin', 'user']).withMessage('Role must be either admin or user'),
    handleValidationErrors
], register);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
    authenticateToken,
    body('email')
        .optional()
        .custom(isValidEmail).withMessage('Please enter a valid email'),
    body('password')
        .optional()
        .custom(isValidPassword).withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
], updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, logout);

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.post('/verify', authenticateToken, verifyToken);

module.exports = router;
