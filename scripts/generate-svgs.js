const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public/environments');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const colors = {
    bg: '#0F0F0F',
    neon: '#39FF14',
    white: '#FFFFFF',
    black: '#000000'
};

const icons = [
    {
        name: 'icon_random',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <circle cx="256" cy="256" r="180" fill="none" stroke="${colors.white}" stroke-width="24"/>
      <path d="M 176 176 L 336 336 M 336 176 L 176 336" stroke="${colors.neon}" stroke-width="32" stroke-linecap="round"/>
    </svg>`
    },
    {
        name: 'icon_data_science',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <path d="M 120 400 L 120 200 M 256 400 L 256 120 M 392 400 L 392 280" stroke="${colors.white}" stroke-width="48" stroke-linecap="round"/>
      <circle cx="120" cy="200" r="32" fill="${colors.neon}"/>
      <circle cx="256" cy="120" r="32" fill="${colors.neon}"/>
      <circle cx="392" cy="280" r="32" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'icon_ai',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <rect x="156" y="156" width="200" height="200" rx="40" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <circle cx="216" cy="216" r="24" fill="${colors.neon}"/>
      <circle cx="296" cy="216" r="24" fill="${colors.neon}"/>
      <path d="M 216 296 L 296 296" stroke="${colors.white}" stroke-width="24" stroke-linecap="round"/>
    </svg>`
    },
    {
        name: 'icon_scaling',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <path d="M 120 400 L 400 120" stroke="${colors.white}" stroke-width="48" stroke-linecap="round"/>
      <path d="M 250 120 L 400 120 L 400 270" fill="none" stroke="${colors.neon}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'icon_politics',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <path d="M 120 300 L 120 150 C 120 120 150 120 150 120 L 362 120 C 392 120 392 150 392 150 L 392 300 C 392 330 362 330 362 330 L 256 330 L 180 400 L 180 330 L 150 330 C 120 330 120 300 120 300 Z" fill="none" stroke="${colors.white}" stroke-width="32" stroke-linejoin="round"/>
      <path d="M 200 225 L 312 225" stroke="${colors.neon}" stroke-width="32" stroke-linecap="round"/>
    </svg>`
    },
    {
        name: 'icon_app_dev',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <rect x="160" y="80" width="192" height="352" rx="32" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 230 140 L 282 140" stroke="${colors.neon}" stroke-width="16" stroke-linecap="round"/>
      <rect x="192" y="190" width="128" height="180" rx="8" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'icon_memes',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <circle cx="256" cy="256" r="160" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 190 200 L 230 240 M 230 200 L 190 240" stroke="${colors.neon}" stroke-width="24" stroke-linecap="round"/>
      <path d="M 282 200 L 322 240 M 322 200 L 282 240" stroke="${colors.neon}" stroke-width="24" stroke-linecap="round"/>
      <path d="M 190 320 Q 256 380 322 320" fill="none" stroke="${colors.white}" stroke-width="32" stroke-linecap="round"/>
    </svg>`
    },
    {
        name: 'icon_collaboration',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <circle cx="200" cy="256" r="100" fill="none" stroke="${colors.neon}" stroke-width="32"/>
      <circle cx="312" cy="256" r="100" fill="none" stroke="${colors.white}" stroke-width="32"/>
    </svg>`
    },
    {
        name: 'icon_idea_validation',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <path d="M 256 120 C 180 120 150 180 150 230 C 150 280 200 320 200 380 L 312 380 C 312 320 362 280 362 230 C 362 180 332 120 256 120 Z" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 220 420 L 292 420 M 236 460 L 276 460" stroke="${colors.white}" stroke-width="24" stroke-linecap="round"/>
      <path d="M 200 230 L 240 270 L 320 170" fill="none" stroke="${colors.neon}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'icon_mvp',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <polygon points="256,120 360,340 152,340" fill="none" stroke="${colors.white}" stroke-width="32" stroke-linejoin="round"/>
      <circle cx="256" cy="260" r="40" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'icon_web_dev',
        svg: `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${colors.bg}"/>
      <rect x="100" y="140" width="312" height="232" rx="24" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 100 220 L 412 220" stroke="${colors.white}" stroke-width="32"/>
      <circle cx="150" cy="180" r="16" fill="${colors.neon}"/>
      <circle cx="196" cy="180" r="16" fill="${colors.white}"/>
      <path d="M 160 280 L 200 320 L 160 360" fill="none" stroke="${colors.neon}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 230 360 L 310 360" stroke="${colors.neon}" stroke-width="24" stroke-linecap="round"/>
    </svg>`
    }
];

const banners = [
    {
        name: 'banner_random',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <circle cx="200" cy="200" r="120" fill="none" stroke="${colors.white}" stroke-width="40"/>
      <rect x="500" y="120" width="160" height="160" fill="${colors.neon}"/>
      <polygon points="900,100 1050,300 750,300" fill="none" stroke="${colors.white}" stroke-width="40" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'banner_data_science',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <path d="M 200 300 L 200 150 M 400 300 L 400 100 M 600 300 L 600 200 M 800 300 L 800 80 M 1000 300 L 1000 220" stroke="${colors.white}" stroke-width="60" stroke-linecap="round"/>
      <path d="M 200 150 L 400 100 L 600 200 L 800 80 L 1000 220" fill="none" stroke="${colors.neon}" stroke-width="20" stroke-linejoin="round"/>
      <circle cx="200" cy="150" r="20" fill="${colors.neon}"/><circle cx="400" cy="100" r="20" fill="${colors.neon}"/><circle cx="600" cy="200" r="20" fill="${colors.neon}"/><circle cx="800" cy="80" r="20" fill="${colors.neon}"/><circle cx="1000" cy="220" r="20" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'banner_ai',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <path d="M 0 200 Q 300 100 600 200 T 1200 200" fill="none" stroke="${colors.neon}" stroke-width="16"/>
      <path d="M 0 250 Q 300 350 600 250 T 1200 250" fill="none" stroke="${colors.white}" stroke-width="16"/>
      <rect x="450" y="100" width="300" height="200" rx="60" fill="${colors.bg}" stroke="${colors.white}" stroke-width="32"/>
      <circle cx="530" cy="200" r="30" fill="${colors.neon}"/>
      <circle cx="670" cy="200" r="30" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'banner_scaling',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <path d="M 100 300 L 400 300 L 400 200 L 700 200 L 700 100 L 1000 100" fill="none" stroke="${colors.white}" stroke-width="40" stroke-linejoin="round"/>
      <path d="M 700 300 L 1050 50" stroke="${colors.neon}" stroke-width="40" stroke-linecap="round"/>
      <path d="M 850 50 L 1050 50 L 1050 250" fill="none" stroke="${colors.neon}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'banner_politics',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <rect x="250" y="80" width="400" height="200" rx="40" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 350 280 L 300 350 L 400 280" fill="${colors.white}"/>
      <rect x="550" y="120" width="400" height="200" rx="40" fill="${colors.neon}"/>
      <path d="M 850 320 L 900 390 L 800 320" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'banner_app_dev',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <rect x="500" y="40" width="200" height="320" rx="40" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 570 100 L 630 100" stroke="${colors.neon}" stroke-width="16" stroke-linecap="round"/>
      <rect x="540" y="150" width="40" height="40" rx="10" fill="${colors.neon}"/>
      <rect x="620" y="150" width="40" height="40" rx="10" fill="${colors.white}"/>
      <rect x="540" y="230" width="40" height="40" rx="10" fill="${colors.white}"/>
      <rect x="620" y="230" width="40" height="40" rx="10" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'banner_memes',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <rect x="200" y="100" width="250" height="200" fill="none" stroke="${colors.neon}" stroke-width="32"/>
      <rect x="500" y="100" width="250" height="200" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <rect x="800" y="100" width="250" height="200" fill="${colors.neon}"/>
      <circle cx="325" cy="200" r="50" fill="${colors.white}"/>
      <circle cx="625" cy="200" r="50" fill="${colors.neon}"/>
      <path d="M 880 160 L 920 200 L 880 240 M 970 160 L 930 200 L 970 240" fill="none" stroke="${colors.bg}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'banner_collaboration',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <circle cx="450" cy="200" r="140" fill="none" stroke="${colors.white}" stroke-width="40"/>
      <circle cx="600" cy="200" r="140" fill="none" stroke="${colors.neon}" stroke-width="40"/>
      <circle cx="750" cy="200" r="140" fill="none" stroke="${colors.white}" stroke-width="40"/>
    </svg>`
    },
    {
        name: 'banner_idea_validation',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <path d="M 400 200 L 800 200" stroke="${colors.white}" stroke-width="8" stroke-dasharray="24 24"/>
      <circle cx="300" cy="200" r="100" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <circle cx="900" cy="200" r="100" fill="${colors.neon}"/>
      <path d="M 860 200 L 890 230 L 950 160" fill="none" stroke="${colors.bg}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
    },
    {
        name: 'banner_mvp',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <rect x="450" y="50" width="300" height="300" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <rect x="525" y="125" width="150" height="150" fill="${colors.neon}"/>
    </svg>`
    },
    {
        name: 'banner_web_dev',
        svg: `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="400" fill="${colors.bg}"/>
      <rect x="200" y="80" width="800" height="240" rx="20" fill="none" stroke="${colors.white}" stroke-width="32"/>
      <path d="M 200 160 L 1000 160" stroke="${colors.white}" stroke-width="32"/>
      <circle cx="260" cy="120" r="16" fill="${colors.neon}"/>
      <circle cx="320" cy="120" r="16" fill="${colors.white}"/>
      <circle cx="380" cy="120" r="16" fill="${colors.white}"/>
      <path d="M 280 220 L 500 220 M 280 260 L 400 260" stroke="${colors.neon}" stroke-width="24" stroke-linecap="round"/>
      <rect x="650" y="190" width="300" height="100" rx="10" fill="${colors.neon}"/>
    </svg>`
    }
];

[...icons, ...banners].forEach(item => {
    fs.writeFileSync(path.join(outDir, item.name + '.svg'), item.svg);
    console.log('Generated ' + item.name + '.svg');
});
