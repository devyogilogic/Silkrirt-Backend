function slugify(text) {
    if (!text || typeof text !== 'string') return 'post';
    return text
        .toLowerCase()
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 200) || 'post';
}

module.exports = { slugify };
