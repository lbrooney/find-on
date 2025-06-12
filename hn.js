// Shared Hacker News API helper used in popup.js and background.js
export const HN_API_URL = 'https://hn.algolia.com/api/v1/search';
export const HN_URL = 'https://news.ycombinator.com';

export function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        ['utm_', 'clid', 'fbclid', 'gclid', 'ref', 'source', '_ga'].forEach(param => {
            for (const key of params.keys()) {
                if (key.includes(param)) {
                    params.delete(key);
                }
            }
        });
        urlObj.search = params.toString();
        return urlObj.toString()
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/\/$/, '');
    } catch (e) {
        console.error('HN cleanUrl err:', e);
        return url;
    }
}

export async function fetchHnHits(url) {
    const params = new URLSearchParams({
        query: cleanUrl(url),
        restrictSearchableAttributes: 'url',
        analytics: false
    });
    const res = await fetch(`${HN_API_URL}?${params}`);
    const data = await res.json();
    return data.hits || [];
}

export function convertHitsToPostObjects(hits) {
    // Convert Algolia hits to objects compatible with Reddit post data structure
    return hits.map(h => ({
        data: {
            score: h.points || 0,
            num_comments: h.num_comments || 0,
            title: h.title || 'HN Discussion',
            permalink: `/item?id=${h.objectID}`,
            subreddit: 'Hacker News',
            created_utc: h.created_at_i || Math.floor(Date.now() / 1000),
            author: h.author || 'user'
        }
    }));
}
