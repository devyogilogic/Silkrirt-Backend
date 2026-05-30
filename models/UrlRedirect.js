const mongoose = require('mongoose');

const urlRedirectSchema = new mongoose.Schema({
    fromPath: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
    },
    toPath: {
        type: String,
        required: true,
        trim: true,
    },
    permanent: {
        type: Boolean,
        default: true,
    },
    note: {
        type: String,
        trim: true,
        maxlength: [500, 'Note too long'],
    },
}, { timestamps: true });

module.exports = mongoose.model('UrlRedirect', urlRedirectSchema);
