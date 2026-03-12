import { serverApiClient } from "./serverApiClient";

/**
 * Robust utility to fetch all entities from a paginated API endpoint.
 * This is designed for server components where we need the full dataset 
 * to calculate statistics or render comprehensive charts.
 * 
 * @param endpoint The API endpoint (e.g., "/jobs")
 * @param limit The number of items to fetch per page (default 100)
 */
export async function fetchAllPages<T>(endpoint: string, limit: number = 100): Promise<T[]> {
    try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const firstUrl = `${endpoint}${separator}page=1&limit=${limit}`;
        
        const response = await serverApiClient(firstUrl, { cache: "no-store" });
        if (!response.ok) {
            console.error(`[fetchAllPages] Failed to fetch first page for ${endpoint}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        let results = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        
        const totalPages = data?.totalPages || 1;
        
        if (totalPages > 1) {
            const promises = [];
            for (let i = 2; i <= totalPages; i++) {
                const url = `${endpoint}${separator}page=${i}&limit=${limit}`;
                promises.push(
                    serverApiClient(url, { cache: "no-store" })
                        .then(res => res.ok ? res.json() : null)
                );
            }

            const pageResults = await Promise.all(promises);
            pageResults.forEach(pageData => {
                if (pageData) {
                    const arr = Array.isArray(pageData?.data) ? pageData.data : (Array.isArray(pageData) ? pageData : []);
                    results = [...results, ...arr];
                }
            });
        }

        return results;
    } catch (error) {
        console.error(`[fetchAllPages] Error fetching all pages for ${endpoint}:`, error);
        return [];
    }
}
