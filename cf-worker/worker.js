/**
 * GrabOn MCP — Cloudflare Worker Supabase Proxy
 *
 * This worker sits between your MCP server / clients and Supabase.
 * It:
 *  - Hides the real Supabase URL + service-role key from callers
 *  - Enforces a shared API secret on every inbound request
 *  - Forwards all REST / RPC / Storage / Auth sub-paths to Supabase
 *  - Handles CORS pre-flight requests
 *
 * Secrets (set via `wrangler secret put`):
 *   SUPABASE_URL          – e.g. https://hzucgufphsubwnvpzetv.supabase.co
 *   SUPABASE_SERVICE_KEY  – the service_role JWT from Supabase dashboard
 *   PROXY_SECRET          – a secret string your MCP server sends in the
 *                           `x-proxy-secret` header to authenticate itself
 */

// ─── CORS helpers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",              // tighten to your domain in prod
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, apikey, x-proxy-secret, Prefer, x-client-info",
    "Access-Control-Max-Age": "86400",
};

function corsResponse(status = 204) {
    return new Response(null, { status, headers: CORS_HEADERS });
}

function addCors(response) {
    const res = new Response(response.body, response);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default {
    async fetch(request, env) {
        // 1. Handle CORS pre-flight immediately
        if (request.method === "OPTIONS") {
            return corsResponse(204);
        }

        // 2. Validate the shared proxy secret
        const incomingSecret = request.headers.get("x-proxy-secret");
        if (!env.PROXY_SECRET || incomingSecret !== env.PROXY_SECRET) {
            return addCors(
                new Response(JSON.stringify({ error: "Unauthorized: invalid proxy secret" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            );
        }

        // 3. Build the upstream Supabase URL
        //    The worker is mounted at the root, so the full Supabase path comes
        //    after the worker's own origin.
        //    e.g.  https://my-worker.workers.dev/rest/v1/deals
        //          → https://<supabase-project>.supabase.co/rest/v1/deals
        const url = new URL(request.url);
        const supabasePath = url.pathname + url.search;   // e.g. /rest/v1/deals?select=*
        const upstreamUrl = env.SUPABASE_URL.replace(/\/$/, "") + supabasePath;

        // 4. Clone & rewrite headers — inject the service-role key
        const upstreamHeaders = new Headers(request.headers);
        upstreamHeaders.set("apikey", env.SUPABASE_SERVICE_KEY);
        upstreamHeaders.set("Authorization", `Bearer ${env.SUPABASE_SERVICE_KEY}`);
        // Remove the proxy secret so Supabase never sees it
        upstreamHeaders.delete("x-proxy-secret");
        // Preserve content-type etc. already in the request

        // 5. Forward to Supabase
        let upstreamResponse;
        try {
            upstreamResponse = await fetch(upstreamUrl, {
                method: request.method,
                headers: upstreamHeaders,
                body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
                redirect: "follow",
            });
        } catch (err) {
            return addCors(
                new Response(JSON.stringify({ error: "Upstream fetch failed", detail: err.message }), {
                    status: 502,
                    headers: { "Content-Type": "application/json" },
                })
            );
        }

        // 6. Return the Supabase response with CORS headers added
        return addCors(upstreamResponse);
    },
};
