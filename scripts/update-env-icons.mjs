import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    const envUpdateMap = {
        'Random': 'icon_random',
        'Data Science': 'icon_data_science',
        'AI': 'icon_ai',
        'Scaling': 'icon_scaling',
        'Politics': 'icon_politics',
        'App Dev': 'icon_app_dev',
        'Memes': 'icon_memes',
        'Collaboration': 'icon_collaboration',
        'Idea Validation': 'icon_idea_validation',
        'MVP': 'icon_mvp',
        'Web Dev': 'icon_web_dev'
    };

    const bannerUpdateMap = {
        'Random': 'banner_random',
        'Data Science': 'banner_data_science',
        'AI': 'banner_ai',
        'Scaling': 'banner_scaling',
        'Politics': 'banner_politics',
        'App Dev': 'banner_app_dev',
        'Memes': 'banner_memes',
        'Collaboration': 'banner_collaboration',
        'Idea Validation': 'banner_idea_validation',
        'MVP': 'banner_mvp',
        'Web Dev': 'banner_web_dev'
    };

    const { data: envs, error } = await supabase.from('environments').select('*');
    if (error) {
        console.error(error);
        return;
    }

    const files = fs.readdirSync('../public/environments/');

    for (const env of envs) {
        const iconBase = envUpdateMap[env.name];
        const bannerBase = bannerUpdateMap[env.name];

        let updateData = {};

        if (iconBase) {
            const iconFile = files.find(f => f.startsWith(iconBase) && f.endsWith('.svg'));
            if (iconFile) {
                updateData.picture = `/environments/${iconFile}`;
            }
        }

        if (bannerBase) {
            const bannerFile = files.find(f => f.startsWith(bannerBase) && f.endsWith('.svg'));
            if (bannerFile) {
                updateData.banner = `/environments/${bannerFile}`;
            }
        }

        if (Object.keys(updateData).length > 0) {
            console.log(`Updating ${env.name}:`, updateData);
            const { error } = await supabase.from('environments').update(updateData).eq('id', env.id);
            if (error) console.error(`Error updating ${env.name}:`, error);
        }
    }

    console.log("Updates triggered.");
}

main();
