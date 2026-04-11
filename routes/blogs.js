const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadBlogSingle, uploadBlogCover } = require('../middleware/upload');
const { handleValidationErrors } = require('../middleware/validation');
const {
    getPublishedBlogs,
    getBlogBySlug,
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    uploadBlogImage
} = require('../controllers/blogController');

const router = express.Router();

// page/limit validated and capped in getPublishedBlogs (avoid express-validator rejecting limit=100, etc.)
router.get('/published', getPublishedBlogs);

router.get('/slug/:slug', [param('slug').notEmpty().trim(), handleValidationErrors], getBlogBySlug);

router.post(
    '/upload-image',
    authenticateToken,
    requireAdmin,
    uploadBlogSingle,
    uploadBlogImage
);

router.get(
    '/',
    authenticateToken,
    requireAdmin,
    [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), handleValidationErrors],
    getBlogs
);

router.get(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    getBlogById
);

router.post(
    '/',
    authenticateToken,
    requireAdmin,
    uploadBlogCover,
    [
        body('title').notEmpty().trim().isLength({ max: 200 }),
        body('excerpt').notEmpty().trim().isLength({ max: 500 }),
        body('contentHtml').notEmpty(),
        body('authorName').notEmpty().trim(),
        handleValidationErrors
    ],
    createBlog
);

router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    uploadBlogCover,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    updateBlog
);

router.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    deleteBlog
);

module.exports = router;
