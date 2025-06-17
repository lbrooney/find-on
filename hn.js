// Shared Hacker News API helper used in popup.js and background.js
import { searchCache, cache, getOptions } from './chrome.js';
import { DEFAULT_CACHE_PERIOD_MINS } from './query.js';

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

export async function fetchHnHits(url, useCache = true) {
    const cleanUrlStr = cleanUrl(url);
    const cachedData = await searchCache(cleanUrlStr);
    const cacheData = cachedData[cleanUrlStr] || {};
    
    if (useCache && await checkCacheValidity(cacheData)) {
        return cacheData.hits || [];
    }

    const params = new URLSearchParams({
        query: cleanUrlStr,
        restrictSearchableAttributes: 'url',
        analytics: false
    });
    const res = await fetch(`${HN_API_URL}?${params}`);
    const responseData = await res.json();
    const hits = responseData.hits || [];

    // Cache the results
    try {
        await cacheHits(cleanUrlStr, hits);
    } catch (e) {
        console.error('Error caching HN hits:', e);
    }

    return hits;
}

async function cacheHits(query, hits) {
    const old_cache = await searchCache(query);
    let objectToStore = {};
    let data = old_cache[query] || {};
    data.hits = hits;
    data.time = Date.now();
    objectToStore[query] = data;
    await cache(objectToStore);
}

async function checkCacheValidity(cache) {
    if (!cache.hasOwnProperty('hits') || !cache.hasOwnProperty('time')) {
        return false;
    }
    const diff = Date.now() - cache.time;
    const query = { cache: { period: DEFAULT_CACHE_PERIOD_MINS } };
    const opts = await getOptions(query);
    return diff < +(opts.cache.period) * 60000;
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
