const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadSubcollectionSingle } = require('../middleware/upload');
const { handleValidationErrors, isValidObjectId } = require('../middleware/validation');
const {
    getByCollectionPublic,
    getAllAdmin,
    getById,
    createSubCollection,
    updateSubCollection,
    updateSubCollectionImage,
    deleteSubCollection,
    reorderSubCollections,
} = require('../controllers/subCollectionController');

const router = express.Router();

router.get('/by-collection/:collectionId', [
    param('collectionId').custom(isValidObjectId).withMessage('Invalid collection id'),
    handleValidationErrors,
], getByCollectionPublic);

router.get('/', [
    authenticateToken,
    requireAdmin,
    query('collection').optional().custom(isValidObjectId),
    handleValidationErrors,
], getAllAdmin);

router.get('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId),
    handleValidationErrors,
], getById);

router.post('/', [
    authenticateToken,
    requireAdmin,
    uploadSubcollectionSingle,
    body('collection').custom(isValidObjectId).withMessage('Valid collection id required'),
    body('name').notEmpty().isLength({ max: 150 }),
    handleValidationErrors,
], createSubCollection);

router.put('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId),
    handleValidationErrors,
], updateSubCollection);

router.put('/:id/image', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId),
    uploadSubcollectionSingle,
    handleValidationErrors,
], updateSubCollectionImage);

router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId),
    handleValidationErrors,
], deleteSubCollection);

router.post('/reorder', [
    authenticateToken,
    requireAdmin,
    body('ids').isArray({ min: 1 }),
    body('ids.*').custom(isValidObjectId),
    handleValidationErrors,
], reorderSubCollections);

module.exports = router;
