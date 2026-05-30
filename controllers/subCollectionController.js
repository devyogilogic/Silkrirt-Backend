const SubCollection = require('../models/SubCollection');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { deleteStoredFile } = require('../middleware/upload');
const { upsertSubCollectionRoute, removeSubCollectionRoute } = require('../utils/seoSync');

const getByCollectionPublic = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const subs = await SubCollection.listByCollection(collectionId, true);
        res.json({ success: true, data: { subCollections: subs } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to list subcollections' });
    }
};

const getAllAdmin = async (req, res) => {
    try {
        const { collection } = req.query;
        const q = {};
        if (collection) q.collection = collection;
        const subCollections = await SubCollection.find(q)
            .populate('collection', 'collectionName slug')
            .sort({ collection: 1, sortOrder: 1, createdAt: 1 });
        res.json({ success: true, data: { subCollections } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to list subcollections' });
    }
};

const getById = async (req, res) => {
    try {
        const sub = await SubCollection.findById(req.params.id).populate('collection');
        if (!sub) return res.status(404).json({ success: false, message: 'Subcollection not found' });
        res.json({ success: true, data: { subCollection: sub } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to get subcollection' });
    }
};

const createSubCollection = async (req, res) => {
    try {
        const {
            collection: collectionId,
            name,
            slugManual,
            description,
            imageAlt,
            seoMetaTitle,
            metaDescription,
            sortOrder,
        } = req.body;

        const cat = await Category.findById(collectionId);
        if (!cat) {
            if (req.fileUrl) await deleteStoredFile(req.fileUrl);
            return res.status(400).json({ success: false, message: 'Collection not found' });
        }

        const sub = new SubCollection({
            collection: collectionId,
            name,
            slugManual: slugManual || undefined,
            description: description || '',
            imageUrl: req.fileUrl || '',
            imageAlt: imageAlt || '',
            seoMetaTitle: seoMetaTitle || '',
            metaDescription: metaDescription || '',
            sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        });

        await sub.save();
        upsertSubCollectionRoute(sub).catch((err) => console.error('SEO sync (sub create):', err));

        res.status(201).json({ success: true, message: 'Subcollection created', data: { subCollection: sub } });
    } catch (e) {
        if (req.fileUrl) await deleteStoredFile(req.fileUrl);
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Failed to create subcollection' });
    }
};

const updateSubCollection = async (req, res) => {
    try {
        const sub = await SubCollection.findById(req.params.id);
        if (!sub) return res.status(404).json({ success: false, message: 'Subcollection not found' });

        const allowed = ['name', 'slugManual', 'description', 'imageAlt', 'seoMetaTitle', 'metaDescription', 'sortOrder', 'isActive', 'collection'];
        for (const k of allowed) {
            if (req.body[k] !== undefined) sub[k] = req.body[k];
        }

        await sub.save();
        upsertSubCollectionRoute(sub).catch((err) => console.error('SEO sync (sub update):', err));

        res.json({ success: true, message: 'Subcollection updated', data: { subCollection: sub } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Failed to update subcollection' });
    }
};

const updateSubCollectionImage = async (req, res) => {
    try {
        const sub = await SubCollection.findById(req.params.id);
        if (!sub) {
            if (req.fileUrl) await deleteStoredFile(req.fileUrl);
            return res.status(404).json({ success: false, message: 'Subcollection not found' });
        }
        if (sub.imageUrl) await deleteStoredFile(sub.imageUrl);
        sub.imageUrl = req.fileUrl;
        await sub.save();
        res.json({ success: true, data: { subCollection: sub } });
    } catch (e) {
        if (req.fileUrl) await deleteStoredFile(req.fileUrl);
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to update image' });
    }
};

const deleteSubCollection = async (req, res) => {
    try {
        const sub = await SubCollection.findById(req.params.id);
        if (!sub) return res.status(404).json({ success: false, message: 'Subcollection not found' });

        const inUse = await Product.findOne({ subCollection: sub._id });
        if (inUse) {
            return res.status(400).json({ success: false, message: 'Cannot delete: products are assigned to this subcollection' });
        }

        if (sub.imageUrl) await deleteStoredFile(sub.imageUrl);
        removeSubCollectionRoute(sub).catch((err) => console.error('SEO sync (sub delete):', err));
        await SubCollection.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Subcollection deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to delete subcollection' });
    }
};

const reorderSubCollections = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids array required' });
        }
        let order = 0;
        for (const id of ids) {
            await SubCollection.findByIdAndUpdate(id, { sortOrder: order });
            order += 1;
        }
        res.json({ success: true, message: 'Order updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to reorder' });
    }
};

module.exports = {
    getByCollectionPublic,
    getAllAdmin,
    getById,
    createSubCollection,
    updateSubCollection,
    updateSubCollectionImage,
    deleteSubCollection,
    reorderSubCollections,
};
