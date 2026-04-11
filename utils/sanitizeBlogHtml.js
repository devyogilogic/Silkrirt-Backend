const sanitizeHtml = require('sanitize-html');

const options = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'li',
        'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'span', 'img', 'pre', 'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height', 'class'],
        td: ['colspan', 'rowspan'],
        th: ['colspan', 'rowspan'],
        '*': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
        img: ['http', 'https']
    },
    allowProtocolRelative: false
};

function sanitizeBlogHtml(html) {
    if (!html || typeof html !== 'string') return '';
    return sanitizeHtml(html, options);
}

module.exports = { sanitizeBlogHtml };
