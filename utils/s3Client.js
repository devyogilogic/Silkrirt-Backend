const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

function isS3Enabled() {
    // In Lambda, AWS_REGION + credentials are provided automatically by the runtime;
    // only AWS_BUCKET needs to be explicitly configured.
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return Boolean(process.env.AWS_BUCKET);
    }
    return Boolean(
        process.env.AWS_BUCKET &&
        process.env.AWS_REGION &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
    );
}

let client;
function getS3() {
    if (!isS3Enabled()) return null;
    if (!client) {
        const config = { region: process.env.AWS_REGION };
        // In Lambda, the SDK automatically uses the IAM execution role.
        // Passing explicit credentials would miss the session token and break auth.
        if (!process.env.AWS_LAMBDA_FUNCTION_NAME &&
            process.env.AWS_ACCESS_KEY_ID &&
            process.env.AWS_SECRET_ACCESS_KEY) {
            config.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
        }
        client = new S3Client(config);
    }
    return client;
}

function publicUrlForKey(key) {
    const base = (process.env.AWS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    if (base) return `${base}/${key}`;
    const bucket = process.env.AWS_BUCKET;
    const region = process.env.AWS_REGION;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBuffer(key, body, contentType) {
    const s3 = getS3();
    if (!s3) throw new Error('S3 is not configured');
    await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
    }));
    return publicUrlForKey(key);
}

async function deleteStoredObject(storedUrl) {
    if (!storedUrl || typeof storedUrl !== 'string') return;
    const base = (process.env.AWS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const bucketUrl = process.env.AWS_BUCKET
        ? `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`
        : '';

    let key = null;
    if (base && storedUrl.startsWith(base)) {
        key = storedUrl.slice(base.length + 1);
    } else if (bucketUrl && storedUrl.startsWith(bucketUrl)) {
        key = storedUrl.slice(bucketUrl.length);
    }

    if (!key) return;

    const s3 = getS3();
    if (!s3) return;
    await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
    }));
}

module.exports = {
    isS3Enabled,
    getS3,
    publicUrlForKey,
    uploadBuffer,
    deleteStoredObject,
};
