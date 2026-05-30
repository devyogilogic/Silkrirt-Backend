const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { isS3Enabled, uploadBuffer, deleteStoredObject } = require('../utils/s3Client');

const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 1048576;

const webpFileFilter = (req, file, cb) => {
    if (file.mimetype !== 'image/webp') {
        return cb(new Error('Only WebP images are allowed'), false);
    }
    cb(null, true);
};

function diskStorageFor(subfolder) {
    return multer.diskStorage({
        destination(req, file, cb) {
            const typeDir = path.join(uploadDir, subfolder);
            if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
            cb(null, typeDir);
        },
        filename(req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname) || '.webp';
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
    });
}

const memoryWebp = multer({
    storage: multer.memoryStorage(),
    fileFilter: webpFileFilter,
    limits: { fileSize: maxSize, files: parseInt(process.env.MAX_FILES_PER_PRODUCT, 10) || 5 },
});

const diskCategory = multer({
    storage: diskStorageFor('categories'),
    fileFilter: webpFileFilter,
    limits: { fileSize: maxSize, files: 1 },
});

async function persistWebpBuffer(buffer, originalName, mimetype, folder) {
    const ext = path.extname(originalName) || '.webp';
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    if (isS3Enabled()) {
        return uploadBuffer(key, buffer, mimetype || 'image/webp');
    }
    const typeDir = path.join(uploadDir, folder);
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
    const filename = path.basename(key);
    fs.writeFileSync(path.join(typeDir, filename), buffer);
    return `/uploads/${folder}/${filename}`;
}

function handleMulterError(err, res) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File size too large.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, message: 'Too many files uploaded.' });
        }
    }
    return res.status(400).json({ success: false, message: err.message });
}

const uploadSingle = (req, res, next) => {
    const run = isS3Enabled()
        ? (cb) => memoryWebp.single('photo')(req, res, cb)
        : (cb) => {
            req.uploadType = 'categories';
            diskCategory.single('photo')(req, res, cb);
        };

    run(async (err) => {
        if (err) return handleMulterError(err, res);
        try {
            if (req.file) {
                if (isS3Enabled()) {
                    req.fileUrl = await persistWebpBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, 'collections');
                } else {
                    req.fileUrl = `/uploads/categories/${req.file.filename}`;
                }
            }
            next();
        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, message: 'Upload failed' });
        }
    });
};

const uploadSubcollectionSingle = (req, res, next) => {
    const run = isS3Enabled()
        ? (cb) => memoryWebp.single('photo')(req, res, cb)
        : (cb) => {
            const d = multer({
                storage: diskStorageFor('subcollections'),
                fileFilter: webpFileFilter,
                limits: { fileSize: maxSize, files: 1 },
            });
            d.single('photo')(req, res, cb);
        };

    run(async (err) => {
        if (err) return handleMulterError(err, res);
        try {
            if (req.file) {
                if (isS3Enabled()) {
                    req.fileUrl = await persistWebpBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, 'subcollections');
                } else {
                    req.fileUrl = `/uploads/subcollections/${req.file.filename}`;
                }
            }
            next();
        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, message: 'Upload failed' });
        }
    });
};

const uploadMultiple = (req, res, next) => {
    const maxFiles = parseInt(process.env.MAX_FILES_PER_PRODUCT, 10) || 5;
    const run = isS3Enabled()
        ? (cb) => memoryWebp.array('images', maxFiles)(req, res, cb)
        : (cb) => {
            const d = multer({
                storage: diskStorageFor('products'),
                fileFilter: webpFileFilter,
                limits: { fileSize: maxSize, files: maxFiles },
            });
            d.array('images', maxFiles)(req, res, cb);
        };

    run(async (err) => {
        if (err) return handleMulterError(err, res);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one image file' });
        }
        try {
            if (isS3Enabled()) {
                req.fileUrls = [];
                for (const f of req.files) {
                    const url = await persistWebpBuffer(f.buffer, f.originalname, f.mimetype, 'products');
                    req.fileUrls.push(url);
                }
            } else {
                req.fileUrls = req.files.map((file) => `/uploads/products/${file.filename}`);
            }
            next();
        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, message: 'Upload failed' });
        }
    });
};

const deleteFile = (filePath) => {
    try {
        if (!filePath || typeof filePath !== 'string') return false;
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) return false;
        const fullPath = path.join(__dirname, '..', filePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

async function deleteStoredFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        await deleteStoredObject(filePath);
        return;
    }
    deleteFile(filePath);
}

async function deleteStoredFiles(filePaths) {
    if (!Array.isArray(filePaths)) filePaths = [filePaths];
    await Promise.all(filePaths.map((p) => deleteStoredFile(p)));
}

const deleteFiles = (filePaths) => {
    if (!Array.isArray(filePaths)) filePaths = [filePaths];
    return filePaths.map((p) => deleteFile(p));
};

const blogImageMime = new Set(['image/webp', 'image/jpeg', 'image/jpg', 'image/png']);
const blogMaxSize = parseInt(process.env.BLOG_MAX_FILE_SIZE, 10) || 2097152;

const blogStorage = multer.diskStorage({
    destination(req, file, cb) {
        const typeDir = path.join(uploadDir, 'blogs');
        if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
        cb(null, typeDir);
    },
    filename(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '.webp';
        cb(null, `blog-${uniqueSuffix}${ext}`);
    },
});

const blogFileFilter = (req, file, cb) => {
    if (!blogImageMime.has(file.mimetype)) {
        return cb(new Error('Only WebP, JPEG, or PNG images are allowed'), false);
    }
    cb(null, true);
};

const uploadBlogMulter = multer({
    storage: blogStorage,
    fileFilter: blogFileFilter,
    limits: { fileSize: blogMaxSize, files: 1 },
});

const uploadBlogSingle = (req, res, next) => {
    uploadBlogMulter.single('image')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`,
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (req.file) req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        next();
    });
};

const uploadBlogCover = (req, res, next) => {
    uploadBlogMulter.single('cover')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`,
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (req.file) req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        next();
    });
};

const uploadTestimonialAvatar = (req, res, next) => {
    uploadBlogMulter.single('avatar')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`,
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (req.file) req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        next();
    });
};

module.exports = {
    uploadSingle,
    uploadSubcollectionSingle,
    uploadMultiple,
    uploadBlogSingle,
    uploadBlogCover,
    uploadTestimonialAvatar,
    deleteFile,
    deleteFiles,
    deleteStoredFile,
    deleteStoredFiles,
};
