// CloudFront Function: URL rewrite for Nuxt SSG
// Rewrites clean URLs to their corresponding index.html files
// e.g. /scheme → /scheme/index.html
//
// Required because S3 REST API endpoints don't resolve directory index documents.
// Without this, deep route reloads return 403 (no object at key "scheme").

function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // URIs with file extensions are served as-is (JS, CSS, JSON, images, etc.)
    if (uri.includes('.')) {
        return request;
    }

    // Append /index.html for clean URLs
    if (!uri.endsWith('/')) {
        uri += '/';
    }
    request.uri = uri + 'index.html';

    return request;
}
