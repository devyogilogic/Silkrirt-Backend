const { validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        });
    }

    next();
};

// Custom validation for MongoDB ObjectId
const isValidObjectId = (value) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(value);
};

// Custom validation for JSON string
const isValidJSON = (value) => {
    try {
        JSON.parse(value);
        return true;
    } catch (e) {
        return false;
    }
};

// Custom validation for SKU format
const isValidSKU = (value) => {
    // SKU should be alphanumeric with optional hyphens and underscores
    const skuRegex = /^[A-Z0-9_-]+$/;
    return skuRegex.test(value.toUpperCase());
};

// Custom validation for email format
const isValidEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
};

// Custom validation for password strength
const isValidPassword = (value) => {
    // At least 6 characters, can contain letters, numbers, and special characters
    return value.length >= 6;
};

// Custom validation for category option
const isValidCategoryOption = (value) => {
    return ['normal', 'gifting'].includes(value);
};

// Custom validation for image URLs array
const isValidImageUrls = (value) => {
    if (!Array.isArray(value)) return false;
    if (value.length === 0) return false;
    if (value.length > 5) return false;

    // Check if all URLs are strings and not empty
    return value.every(url => typeof url === 'string' && url.trim().length > 0);
};

// Custom validation for product categories array
const isValidProductCategories = (value) => {
    if (!Array.isArray(value)) return false;
    if (value.length === 0) return false;

    // Check if all values are valid ObjectIds
    return value.every(id => isValidObjectId(id));
};

module.exports = {
    handleValidationErrors,
    isValidObjectId,
    isValidJSON,
    isValidSKU,
    isValidEmail,
    isValidPassword,
    isValidCategoryOption,
    isValidImageUrls,
    isValidProductCategories
};
