const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const proxySecret = process.env.PROXY_SECRET;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

const _supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            // Sent on every request — the Cloudflare Worker validates this
            // before forwarding to Supabase
            ...(proxySecret ? { 'x-proxy-secret': proxySecret } : {}),
        },
    },
});

// 🔒 SAFETY GUARD: Wrap client to block ALL delete operations.
// Claude and any MCP tool is strictly READ + WRITE only — never DELETE.
function makeReadWriteOnly(obj) {
    return new Proxy(obj, {
        get(target, prop) {
            if (prop === 'delete') {
                throw new Error(
                    '🚫 DELETE operation is permanently disabled on this MCP server. ' +
                    'Claude is not permitted to delete any database records.'
                );
            }
            const value = target[prop];
            if (typeof value === 'function') {
                return function (...args) {
                    const result = value.apply(target, args);
                    if (result && typeof result === 'object') {
                        return makeReadWriteOnly(result);
                    }
                    return result;
                };
            }
            if (value && typeof value === 'object') {
                return makeReadWriteOnly(value);
            }
            return value;
        }
    });
}

const supabase = makeReadWriteOnly(_supabase);

module.exports = { supabase };

