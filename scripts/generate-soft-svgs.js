const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public/environments');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const bg = '#EBF0F5';
const bgDarker = '#DDE4ED';
const white = '#FFFFFF';
const black = '#1E232A';
const green = '#059669';
const greenLight = '#34D399';
const accent1 = '#3B82F6';

function softDefs() {
    return "<defs>\n" +
        "  <filter id='soft-shadow' x='-20%' y='-20%' width='140%' height='140%'>\n" +
        "    <feDropShadow dx='16' dy='16' stdDeviation='20' flood-color='#bac9d8' flood-opacity='0.8'/>\n" +
        "    <feDropShadow dx='-16' dy='-16' stdDeviation='20' flood-color='#ffffff' flood-opacity='0.9'/>\n" +
        "  </filter>\n" +
        "  <filter id='soft-shadow-sm' x='-20%' y='-20%' width='140%' height='140%'>\n" +
        "    <feDropShadow dx='8' dy='8' stdDeviation='12' flood-color='#bac9d8' flood-opacity='0.8'/>\n" +
        "    <feDropShadow dx='-8' dy='-8' stdDeviation='12' flood-color='#ffffff' flood-opacity='0.9'/>\n" +
        "  </filter>\n" +
        "  <filter id='glow-green' x='-30%' y='-30%' width='160%' height='160%'>\n" +
        "    <feDropShadow dx='0' dy='8' stdDeviation='16' flood-color='" + green + "' flood-opacity='0.4'/>\n" +
        "  </filter>\n" +
        "  <filter id='glow-black' x='-30%' y='-30%' width='160%' height='160%'>\n" +
        "    <feDropShadow dx='0' dy='8' stdDeviation='16' flood-color='" + black + "' flood-opacity='0.2'/>\n" +
        "  </filter>\n" +
        "  <filter id='glow-blue' x='-30%' y='-30%' width='160%' height='160%'>\n" +
        "    <feDropShadow dx='0' dy='8' stdDeviation='16' flood-color='" + accent1 + "' flood-opacity='0.3'/>\n" +
        "  </filter>\n" +
        "  <linearGradient id='grad-green' x1='0%' y1='0%' x2='100%' y2='100%'>\n" +
        "    <stop offset='0%' stop-color='" + greenLight + "'/>\n" +
        "    <stop offset='100%' stop-color='" + green + "'/>\n" +
        "  </linearGradient>\n" +
        "</defs>\n";
}

function wrapIcon(id, innerSVG) {
    return "<svg width='512' height='512' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>\n" +
        softDefs() +
        "  <rect width='512' height='512' fill='" + bg + "'/>\n" +
        "  <rect x='64' y='64' width='384' height='384' rx='80' fill='" + bg + "' filter='url(#soft-shadow)'/>\n" +
        innerSVG +
        "</svg>\n";
}

function wrapBanner(id, innerSVG) {
    return "<svg width='1200' height='400' viewBox='0 0 1200 400' xmlns='http://www.w3.org/2000/svg'>\n" +
        softDefs() +
        "  <rect width='1200' height='400' fill='" + bg + "'/>\n" +
        "  <rect x='100' y='60' width='1000' height='280' rx='60' fill='" + bg + "' filter='url(#soft-shadow)'/>\n" +
        innerSVG +
        "</svg>\n";
}

const envs = [
    {
        name: 'random',
        iconContent:
            "  <circle cx='210' cy='210' r='40' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <circle cx='340' cy='180' r='30' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n" +
            "  <path d='M 160 340 L 360 300' stroke='" + black + "' stroke-width='24' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <rect x='230' y='270' width='70' height='70' rx='16' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <circle cx='300' cy='200' r='60' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <rect x='800' y='140' width='120' height='120' rx='30' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 450 250 Q 600 100 750 250' fill='none' stroke='" + black + "' stroke-width='32' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <circle cx='600' cy='175' r='30' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n"
    },
    {
        name: 'data_science',
        iconContent:
            "  <path d='M 150 360 L 150 240 M 256 360 L 256 160 M 362 360 L 362 280' stroke='" + black + "' stroke-width='40' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <circle cx='150' cy='240' r='24' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <circle cx='256' cy='160' r='32' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n" +
            "  <circle cx='362' cy='280' r='24' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 130 360 L 382 360' stroke='" + white + "' stroke-width='24' stroke-linecap='round' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <path d='M 250 280 L 250 180 M 450 280 L 450 120 M 650 280 L 650 220 M 850 280 L 850 150' stroke='" + black + "' stroke-width='40' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 250 180 L 450 120 L 650 220 L 850 150' fill='none' stroke='url(#grad-green)' stroke-width='20' stroke-linejoin='round' filter='url(#glow-green)'/>\n" +
            "  <circle cx='250' cy='180' r='24' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='450' cy='120' r='32' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n" +
            "  <circle cx='650' cy='220' r='24' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='850' cy='150' r='32' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 200 280 L 900 280' stroke='" + white + "' stroke-width='24' stroke-linecap='round' filter='url(#soft-shadow-sm)'/>\n"
    },
    {
        name: 'ai',
        iconContent:
            "  <rect x='156' y='156' width='200' height='200' rx='50' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='206' cy='220' r='20' fill='" + black + "'/>\n" +
            "  <circle cx='306' cy='220' r='20' fill='" + black + "'/>\n" +
            "  <path d='M 216 290 Q 256 320 296 290' fill='none' stroke='url(#grad-green)' stroke-width='20' stroke-linecap='round' filter='url(#glow-green)'/>\n" +
            "  <circle cx='256' cy='120' r='16' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n" +
            "  <path d='M 256 136 L 256 156' stroke='" + accent1 + "' stroke-width='8'/>\n",
        bannerContent:
            "  <rect x='450' y='110' width='300' height='180' rx='60' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='530' cy='180' r='24' fill='" + black + "'/>\n" +
            "  <circle cx='670' cy='180' r='24' fill='" + black + "'/>\n" +
            "  <path d='M 550 250 Q 600 280 650 250' fill='none' stroke='url(#grad-green)' stroke-width='20' stroke-linecap='round' filter='url(#glow-green)'/>\n" +
            "  <path d='M 250 200 L 400 200 M 800 200 L 950 200' stroke='" + bgDarker + "' stroke-width='32' stroke-linecap='round' filter='url(#soft-shadow-sm)'/>\n"
    },
    {
        name: 'scaling',
        iconContent:
            "  <path d='M 160 360 L 360 160' stroke='" + black + "' stroke-width='48' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 220 160 L 360 160 L 360 300' fill='none' stroke='url(#grad-green)' stroke-width='48' stroke-linecap='round' stroke-linejoin='round' filter='url(#glow-green)'/>\n" +
            "  <circle cx='160' cy='360' r='32' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <path d='M 250 280 L 450 280 L 450 180 L 650 180 L 650 120 M 610 120 L 650 120' fill='none' stroke='" + bgDarker + "' stroke-width='40' stroke-linejoin='round' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 610 300 L 950 120' stroke='" + black + "' stroke-width='40' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 800 120 L 950 120 L 950 270' fill='none' stroke='url(#grad-green)' stroke-width='40' stroke-linecap='round' stroke-linejoin='round' filter='url(#glow-green)'/>\n"
    },
    {
        name: 'politics',
        iconContent:
            "  <rect x='160' y='160' width='140' height='140' rx='32' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='210' y='210' width='140' height='140' rx='32' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 190 230 L 270 230 M 190 270 L 250 270' stroke='" + black + "' stroke-width='16' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 240 280 L 320 280 M 240 320 L 300 320' stroke='" + white + "' stroke-width='16' stroke-linecap='round'/>\n",
        bannerContent:
            "  <rect x='250' y='120' width='400' height='160' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 350 280 L 310 320 L 390 280' fill='" + bg + "'/>\n" +
            "  <rect x='450' y='160' width='400' height='160' rx='40' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 750 320 L 790 360 L 710 320' fill='url(#grad-green)'/>\n" +
            "  <path d='M 300 180 L 500 180 M 300 220 L 450 220' stroke='" + black + "' stroke-width='24' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 500 220 L 700 220 M 500 260 L 650 260' stroke='" + white + "' stroke-width='24' stroke-linecap='round'/>\n"
    },
    {
        name: 'app_dev',
        iconContent:
            "  <rect x='180' y='120' width='152' height='272' rx='32' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='200' y='150' width='112' height='160' rx='16' fill='" + black + "' filter='url(#glow-black)'/>\n" +
            "  <path d='M 230 200 L 260 230 L 230 260 M 280 260 L 310 260' fill='none' stroke='url(#grad-green)' stroke-width='16' stroke-linecap='round' stroke-linejoin='round' filter='url(#glow-green)'/>\n" +
            "  <circle cx='256' cy='350' r='16' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <rect x='480' y='80' width='240' height='240' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='520' y='120' width='160' height='120' rx='20' fill='" + black + "' filter='url(#glow-black)'/>\n" +
            "  <path d='M 560 160 L 600 200 L 560 240 M 620 240 L 660 240' fill='none' stroke='url(#grad-green)' stroke-width='20' stroke-linecap='round' stroke-linejoin='round' filter='url(#glow-green)'/>\n" +
            "  <rect x='350' y='160' width='80' height='80' rx='24' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='770' y='160' width='80' height='80' rx='24' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 370 200 L 410 200 M 790 200 L 830 200' stroke='" + accent1 + "' stroke-width='16' stroke-linecap='round' filter='url(#glow-blue)'/>\n"
    },
    {
        name: 'memes',
        iconContent:
            "  <circle cx='256' cy='256' r='120' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 200 220 C 210 200 230 200 240 220' fill='none' stroke='" + black + "' stroke-width='16' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 272 220 C 282 200 302 200 312 220' fill='none' stroke='" + black + "' stroke-width='16' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 200 280 Q 256 340 312 280' fill='none' stroke='url(#grad-green)' stroke-width='24' stroke-linecap='round' filter='url(#glow-green)'/>\n",
        bannerContent:
            "  <circle cx='450' cy='200' r='100' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='750' cy='200' r='100' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 400 170 Q 450 130 500 170' fill='none' stroke='" + black + "' stroke-width='20' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 410 230 Q 450 280 490 230' fill='none' stroke='url(#grad-green)' stroke-width='24' stroke-linecap='round' filter='url(#glow-green)'/>\n" +
            "  <circle cx='720' cy='180' r='16' fill='" + accent1 + "' filter='url(#glow-blue)'/><circle cx='780' cy='180' r='16' fill='" + accent1 + "' filter='url(#glow-blue)'/>\n" +
            "  <path d='M 720 240 L 780 240' stroke='" + black + "' stroke-width='20' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <path d='M 580 180 Q 600 150 620 180' fill='none' stroke='#F59E0B' stroke-width='16' stroke-linecap='round'/>\n"
    },
    {
        name: 'collaboration',
        iconContent:
            "  <circle cx='220' cy='256' r='80' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='292' cy='256' r='80' fill='url(#grad-green)' filter='url(#glow-green)' opacity='0.9'/>\n" +
            "  <circle cx='256' cy='256' r='24' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <circle cx='450' cy='200' r='120' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='600' cy='200' r='120' fill='url(#grad-green)' filter='url(#glow-green)' opacity='0.9'/>\n" +
            "  <circle cx='750' cy='200' r='120' fill='" + black + "' filter='url(#glow-black)' opacity='0.9'/>\n" +
            "  <circle cx='525' cy='200' r='30' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='675' cy='200' r='30' fill='" + white + "' filter='url(#soft-shadow-sm)'/>\n"
    },
    {
        name: 'idea_validation',
        iconContent:
            "  <rect x='216' y='140' width='80' height='120' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='236' y='270' width='40' height='30' rx='8' fill='" + black + "' filter='url(#glow-black)'/>\n" +
            "  <path d='M 216 190 A 40 40 0 0 1 296 190' fill='none' stroke='url(#grad-green)' stroke-width='16' opacity='0.8'/>\n" +
            "  <circle cx='256' cy='180' r='24' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 200 350 L 312 350 M 236 380 L 276 380' stroke='" + bgDarker + "' stroke-width='16' stroke-linecap='round' filter='url(#soft-shadow-sm)'/>\n",
        bannerContent:
            "  <circle cx='450' cy='200' r='100' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='450' cy='200' r='50' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 600 200 L 720 200' stroke='" + bgDarker + "' stroke-width='24' stroke-dasharray='24 24' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='750' y='120' width='160' height='160' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <path d='M 790 200 L 820 230 L 870 170' fill='none' stroke='" + black + "' stroke-width='24' stroke-linecap='round' stroke-linejoin='round' filter='url(#glow-black)'/>\n"
    },
    {
        name: 'mvp',
        iconContent:
            "  <rect x='200' y='180' width='112' height='152' rx='16' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <polygon points='170,260 256,150 342,260' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 180 300 L 332 300' stroke='" + black + "' stroke-width='24' stroke-linecap='round' filter='url(#glow-black)'/>\n",
        bannerContent:
            "  <rect x='350' y='100' width='200' height='200' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <rect x='650' y='100' width='200' height='200' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <polygon points='400,220 450,140 500,220' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 580 200 L 620 200' stroke='" + black + "' stroke-width='16' stroke-linecap='round' filter='url(#glow-black)'/>\n" +
            "  <polygon points='700,220 750,140 800,220' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 680 250 L 820 250' stroke='" + black + "' stroke-width='32' stroke-linecap='round' filter='url(#glow-black)'/>\n"
    },
    {
        name: 'web_dev',
        iconContent:
            "  <rect x='140' y='180' width='232' height='152' rx='24' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='170' cy='210' r='10' fill='" + black + "'/>\n" +
            "  <circle cx='200' cy='210' r='10' fill='" + black + "'/>\n" +
            "  <path d='M 140 240 L 372 240' stroke='" + bgDarker + "' stroke-width='8'/>\n" +
            "  <rect x='220' y='270' width='120' height='30' rx='8' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <path d='M 170 270 L 190 285 L 170 300' fill='none' stroke='" + accent1 + "' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'/>\n",
        bannerContent:
            "  <rect x='300' y='120' width='600' height='160' rx='40' fill='" + bg + "' filter='url(#soft-shadow-sm)'/>\n" +
            "  <circle cx='350' cy='160' r='16' fill='" + bgDarker + "'/>\n" +
            "  <circle cx='400' cy='160' r='16' fill='" + bgDarker + "'/>\n" +
            "  <path d='M 300 200 L 900 200' stroke='" + bgDarker + "' stroke-width='8'/>\n" +
            "  <rect x='350' y='230' width='300' height='24' rx='12' fill='url(#grad-green)' filter='url(#glow-green)'/>\n" +
            "  <rect x='700' y='230' width='150' height='24' rx='12' fill='" + black + "' filter='url(#glow-black)'/>\n"
    }
];

envs.forEach(env => {
    const iconSvg = wrapIcon('icon_' + env.name, env.iconContent);
    const bannerSvg = wrapBanner('banner_' + env.name, env.bannerContent);
    fs.writeFileSync(path.join(outDir, 'icon_' + env.name + '.svg'), iconSvg);
    fs.writeFileSync(path.join(outDir, 'banner_' + env.name + '.svg'), bannerSvg);
    console.log('Generated soft SVGs for: ' + env.name);
});
