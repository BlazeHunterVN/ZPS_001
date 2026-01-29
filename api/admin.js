import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase Environment Variables');
        return res.status(500).json({ error: 'Server configuration error: Missing API keys' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, params = {} } = req.body || {};

    if (!action) {
        return res.status(400).json({ error: 'Missing action in request body' });
    }

    try {
        let result;

        switch (action) {
            case 'verify_admin_key':
                result = await supabase.rpc('verify_admin_key', params);
                break;

            case 'manage_banner_upsert':
                result = await supabase.rpc('manage_banner_upsert', params);
                break;

            case 'manage_banner_delete':
                result = await supabase.rpc('manage_banner_delete', params);
                break;

            case 'manage_home_settings':
                result = await supabase.rpc('manage_home_settings', params);
                break;

            case 'manage_admin_access':
                // Specifically for admin management, we ensure service role is used correctly
                result = await supabase.rpc('manage_admin_access', params);
                break;

            case 'fetch_banners':
                // Filter by nation_key if provided in params
                let query = supabase.from('nation_banners').select('*').order('created_at', { ascending: false });
                if (params && params.nation_key) {
                    query = query.eq('nation_key', params.nation_key);
                }
                result = await query;
                break;

            case 'fetch_admin_list':
                // DO NOT return access_key to the client
                result = await supabase.from('admin_access').select('email, role').order('email', { ascending: true });
                break;

            case 'fetch_home_settings':
                result = await supabase.from('home_settings').select('*').eq('id', 1).single();
                break;

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        if (result.error) {
            console.error(`Supabase error in action ${action}:`, result.error);
            return res.status(500).json({ error: result.error.message });
        }

        return res.status(200).json(result.data);
    } catch (err) {
        console.error(`Server error in action ${action}:`, err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
