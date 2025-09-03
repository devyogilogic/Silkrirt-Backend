const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors, isValidEmail, isValidPassword } = require('../middleware/validation');

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
], async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = user.generateAuthToken();

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    lastLogin: user.lastLogin
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

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
], async (req, res) => {
    try {
        const { email, password, role = 'admin' } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password,
            role
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

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
], async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            user.email = email.toLowerCase();
        }

        // Update password if provided
        if (password) {
            user.password = password;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // In a more advanced setup, you might want to blacklist the token
        // For now, we'll just return success and let the client remove the token
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Token is valid',
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Token verification failed'
        });
    }
});

module.exports = router;
