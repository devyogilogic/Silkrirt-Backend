const express = require('express');
const { param, query } = require('express-validator');
const { handleValidationErrors, isValidObjectId } = require('../middleware/validation');
const { resolveSlug, getProductsBySubSlug, getProductsByCollectionSlug, legacyRedirect } = require('../controllers/publicController');

const router = express.Router();

router.get('/legacy-redirect', [
    query('path').notEmpty().withMessage('path is required'),
    handleValidationErrors,
], legacyRedirect);

router.get('/subcollection/:slug/products', [
    param('slug').isLength({ min: 1, max: 220 }).withMessage('Invalid slug'),
    handleValidationErrors,
], getProductsBySubSlug);

router.get('/collection/:slug/products', [
    param('slug').isLength({ min: 1, max: 220 }).withMessage('Invalid slug'),
    handleValidationErrors,
], getProductsByCollectionSlug);

router.get('/resolve/:slug', [
    param('slug').isLength({ min: 1, max: 220 }).withMessage('Invalid slug'),
    handleValidationErrors,
], resolveSlug);

module.exports = router;
