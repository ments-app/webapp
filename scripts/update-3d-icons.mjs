import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const brainDir = '/Users/ayushmansingh/.gemini/antigravity/brain/434a743c-b9f2-425f-8231-93d2ffcef6c4';
const publicDir = path.resolve('../public/environments/');

// Copy files
const brainFiles = fs.readdirSync(brainDir);
const generated3dFiles = brainFiles.filter(f => f.includes('3d_') && f.endsWith('.png'));

for (const file of generated3dFiles) {
    fs.copyFileSync(path.join(brainDir, file), path.join(publicDir, file));
    console.log('Copied', file);
}

const envUpdateMap = {
    'Random': 'icon_random_3d',
    'Data Science': 'icon_data_science_3d',
    'AI': 'icon_ai_3d',
    'Scaling': 'icon_scaling_3d',
    'Politics': 'icon_politics_3d',
    'App Dev': 'icon_app_dev_3d',
    'Memes': 'icon_memes_3d',
    'Collaboration': 'icon_collaboration_3d',
    'Idea Validation': 'icon_idea_validation_3d',
    'MVP': 'icon_mvp_3d',
    'Web Dev': 'icon_web_dev_3d'
};

const bannerUpdateMap = {
    'Random': 'banner_random_3d',
    'Data Science': 'banner_data_science_3d',
    'AI': 'banner_ai_3d',
    'Scaling': 'banner_scaling_3d',
    'Politics': 'banner_politics_3d',
    'App Dev': 'banner_app_dev_3d',
    'Memes': 'banner_memes_3d',
    'Collaboration': 'banner_collaboration_3d',
    'Idea Validation': 'banner_idea_validation_3d',
    'MVP': 'banner_mvp_3d',
    'Web Dev': 'banner_web_dev_3d'
};

async function main() {
    const { data: envs, error } = await supabase.from('environments').select('*');
    if (error) { console.error(error); return; }

    const files = fs.readdirSync(publicDir);

    for (const env of envs) {
        const iconBase = envUpdateMap[env.name];
        const bannerBase = bannerUpdateMap[env.name];
        let updateData = {};

        if (iconBase) {
            const iconMatches = files.filter(f => f.startsWith(iconBase));
            if (iconMatches.length > 0) {
                iconMatches.sort();
                updateData.picture = `/environments/${iconMatches[iconMatches.length - 1]}`;
            }
        }

        if (bannerBase) {
            const bannerMatches = files.filter(f => f.startsWith(bannerBase));
            if (bannerMatches.length > 0) {
                bannerMatches.sort();
                updateData.banner = `/environments/${bannerMatches[bannerMatches.length - 1]}`;
            }
        }

        if (Object.keys(updateData).length > 0) {
            console.log(`Updating ${env.name}:`, updateData);
            await supabase.from('environments').update(updateData).eq('id', env.id);
        }
    }
}

main();
