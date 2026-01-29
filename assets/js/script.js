// SUPABASE REALTIME CONFIGURATION
let supabaseClient = null;

async function initSupabase() {
    if (typeof createClient === 'undefined') {
        // Can fail silently on main site, but log for dev
        // console.error('Supabase JS library not loaded.');
        return;
    }

    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();

        if (config.supabaseUrl && config.supabaseAnonKey) {
            supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
            console.log('Supabase Realtime Initialized (Main Site)');

            // Subscribe to Nation Banners
            supabaseClient
                .channel('public:nation_banners')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'nation_banners' }, (payload) => {
                    console.log('Realtime update detected (Banners):', payload);
                    fetchDataFromAPI();
                })
                .subscribe();

            // Subscribe to Home Settings
            supabaseClient
                .channel('public:home_settings')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'home_settings' }, (payload) => {
                    console.log('Realtime update detected (Home Settings):', payload);
                    fetchHomeSettings();
                })
                .subscribe();
        }
    } catch (e) {
        console.error('Error initializing Supabase (Main):', e);
    }
}

// Initialize on load
window.addEventListener('load', initSupabase);

// Secure API Caller helper
async function callApi(action, params = {}) {
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, params })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Request Failed');
        return data;
    } catch (err) {
        console.error(`API Error (${action}):`, err);
        throw err;
    }
}

const translations = {
    'vietnam': {
        'home_link': 'TRANG CHỦ',
        'nation_link': 'QUỐC GIA',
        'news_link': 'TIN TỨC',
        'contact_link': 'LIÊN HỆ',
        'select_country': 'QUỐC GIA ĐANG CHỌN',
        'news_heading': 'TIN TỨC',
        'contact_heading': 'LIÊN HỆ VỚI CHÚNG TÔI',
        'contact_info': 'THÔNG TIN LIÊN HỆ Ở ĐÂY.',
        'operating_policy': 'CHÍNH SÁCH VẬN HÀNH',
        'terms_of_use': 'ĐIỀU KHOẢN SỬ DỤNG',
        'select_prompt': 'VUI LÒNG CHỌN MỘT QUỐC GIA',
        'update_banner': 'DỮ LIỆU BIỂU NGỮ ĐANG ĐƯỢC CẬP NHẬT.',
        'update_news': 'DỮ LIỆU TIN TỨC ĐANG ĐƯỢC CẬP NHẬT.',
        'start_date': 'NGÀY BẮT ĐẦU',
        'date_posting': 'NGÀY ĐĂNG',
        'link_access': 'TRUY CẬP LIÊN KẾT',
        'no_title': 'KHÔNG CÓ TIÊU ĐỀ',
        'active': 'ĐANG HOẠT ĐỘNG',
        'upcoming': 'SẮP DIỄN RA',
        'ending': 'SẮP KẾT THÚC',
        'check_back': 'VUI LÒNG KIỂM TRA LẠI SAU.',
        'check_back_news': 'VUI LÒNG KIỂM TRA LẠI SAU ĐỂ CẬP NHẬT TIN TỨC MỚI NHẤT.',
        'download_image': 'TẢI ẢNH VỀ THIẾT BỊ'
    },
    'default': {
        'home_link': 'HOME',
        'nation_link': 'NATION',
        'news_link': 'NEWS',
        'contact_link': 'CONTACT',
        'select_country': 'CURRENT NATION',
        'news_heading': 'NEWS',
        'contact_heading': 'CONTACT US',
        'contact_info': 'CONTACT INFORMATION HERE.',
        'operating_policy': 'OPERATING POLICY',
        'terms_of_use': 'TERMS OF USE',
        'select_prompt': 'PLEASE SELECT A COUNTRY',
        'update_banner': 'BANNER DATA IS CURRENTLY BEING UPDATED.',
        'update_news': 'NEWS DATA IS CURRENTLY BEING UPDATED.',
        'start_date': 'START DATE',
        'date_posting': 'DATE OF POSTING',
        'link_access': 'LINK ACCESS',
        'no_title': 'NO TITLE',
        'active': 'ACTIVE',
        'upcoming': 'UPCOMING',
        'ending': 'ENDING',
        'check_back': 'PLEASE CHECK BACK LATER.',
        'check_back_news': 'PLEASE CHECK BACK LATER FOR THE LATEST NEWS.',
        'download_image': 'DOWNLOAD IMAGE'
    }
};

let currentLanguage = localStorage.getItem('currentLang') || 'default';
let userInteracted = false;

const initialNationData = {
    brazil: { images: [] },
    india: { images: [] },
    indonesia: { images: [] },
    pakistan: { images: [] },
    singapore: { images: [] },
    taiwan: { images: [] },
    thailand: { images: [] },
    vietnam: { images: [] },
    news: { images: [] },
};
const nationData = initialNationData;

const IK_URL_ENDPOINT = "https://ik.imagekit.io/blazehunter/";

const menuToggle = document.querySelector('.menu-toggle');
const navbar = document.querySelector('.navbar');
const homeSection = document.getElementById('home-section');
const nationSection = document.getElementById('nation-section');
const nationHeading = document.getElementById('nation-heading');
const imageGrid = document.getElementById('image-grid');
const contactSection = document.getElementById('contact-section');
const logoLink = document.querySelector('.logo a');
const newsSection = document.getElementById('news-section');
const newsHeading = document.getElementById('news-heading');
const newsImageGrid = document.getElementById('news-image-grid');
const gridOverlay = document.getElementById('grid-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDate = document.getElementById('overlay-date');
const overlayLink = document.getElementById('overlay-link');
const overlayDownload = document.getElementById('overlay-download');
const closeBtn = document.querySelector('.close-btn');
const overlayImage = document.getElementById('overlay-image');
const nationDropdownLi = document.querySelector('.dropdown:not(.language-selector)');

const mobileLangSelector = document.getElementById('mobileLangSelector');
const desktopLangSelector = document.getElementById('desktopLangSelector');

const languageLinks = document.querySelectorAll('.language-menu a');
let navLinks = document.querySelectorAll('.nav-links a');

const backgroundVideo = document.getElementById('background-video');
function getIsMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
}

let imageObserver = null;
if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
}

function lazyLoadImage(img) {
    if (imageObserver && img.dataset.src) {
        imageObserver.observe(img);
    }
}

let scrollAnimationObserver = null;
if ('IntersectionObserver' in window) {
    scrollAnimationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            } else {
                entry.target.classList.remove('animated');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px'
    });
}

function observeScrollAnimation(element) {
    if (scrollAnimationObserver && element) {
        scrollAnimationObserver.observe(element);
    }
}

function applyTranslation(langKey) {
    const translationSet = translations[langKey] || translations['default'];

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translationSet[key]) {
            element.textContent = translationSet[key];
        }
    });

    document.querySelectorAll('.language-menu a[data-lang]').forEach(link => {
        link.classList.remove('active');
        link.style.removeProperty('color');
        link.style.removeProperty('background-color');
        link.onmouseover = null;
        link.onmouseout = null;
    });

    const activeLangLinks = document.querySelectorAll(`.language-menu a[data-lang="${langKey}"]`);
    if (activeLangLinks) {
        activeLangLinks.forEach(link => {
            link.classList.add('active');
        });
    }

    currentLanguage = langKey;
    const currentPath = window.location.pathname;
    const parts = currentPath.split('/');
    const key = parts[parts.length - 1];
    if (currentPath.startsWith('/nation') || currentPath === '/news') {
        updateSectionHeadings(currentPath, key);
    }
}

function changeLanguageAndReload(langKey) {
    if (langKey) {
        localStorage.setItem('currentLang', langKey);
        applyTranslation(langKey);

        // Re-render current section if needed
        const currentPath = window.location.pathname;
        const parts = currentPath.split('/');
        const key = parts[parts.length - 1];

        if (currentPath.startsWith('/nation/')) {
            displayImages(key, false);
        } else if (currentPath === '/nation') {
            displayImages('default', false);
        } else if (currentPath === '/news') {
            displayImages('news', true);
        }
    }
}

async function fetchDataFromAPI() {
    try {
        const rawData = await callApi('fetch_banners');

        Object.keys(nationData).forEach(key => nationData[key].images = []);

        rawData.forEach(item => {
            const nationKey = item.nation_key;
            if (!nationData[nationKey]) {
                nationData[nationKey] = { images: [] };
            }
            nationData[nationKey].images.push({
                url: item.url,
                startDate: item.start_date,
                bannerLink: item.banner_link,
                title: item.title,
                endDate: item.end_date,
                id: item.id
            });
        });

        // Trigger render for initial section
        const currentPath = window.location.pathname;
        const parts = currentPath.split('/');
        const key = parts[parts.length - 1];
        if (currentPath.startsWith('/nation/')) displayImages(key, false);
        else if (currentPath === '/news') displayImages('news', true);

    } catch (error) {
        console.error("Error fetching data:", error);
        if (imageGrid) {
            imageGrid.innerHTML = `<div style="text-align: center; padding: 50px; color: #d32f2f;">
                <h2>⚠️ Connection Error</h2>
                <p>Unable to load content. Please try again later.</p>
            </div>`;
        }
    }
}

async function fetchHomeSettings() {
    console.log("%c[Background-Engine] Syncing...", "color: #00ff00; bold;");

    const cachedPc = localStorage.getItem('home_bg_pc');
    const cachedMobile = localStorage.getItem('home_bg_mobile');
    if (cachedPc || cachedMobile) {
        applyHomeBackgrounds({ bg_pc_url: cachedPc, bg_mobile_url: cachedMobile });
    }

    try {
        const settings = await callApi('fetch_home_settings');
        if (settings) {
            applyHomeBackgrounds(settings);
            if (settings.bg_pc_url) localStorage.setItem('home_bg_pc', settings.bg_pc_url);
            if (settings.bg_mobile_url) localStorage.setItem('home_bg_mobile', settings.bg_mobile_url);
        }
    } catch (error) {
        console.error("[Background-Engine] Sync Error:", error);
    }
}

function applyHomeBackgrounds(settings) {
    const section = document.getElementById('home-section');
    const pcImg = document.getElementById('background-image');
    const mobileImg = document.getElementById('background-image-mobile');
    const video = document.getElementById('background-video');

    if (!section || !settings) {
        console.error("[Background-Engine] Required elements or settings missing:", { section, settings });
        return;
    }

    const timestamp = Date.now();
    console.log("[Background-Engine] Executing UI Update...");

    const pcUrl = settings.bg_pc_url;
    if (pcUrl && pcUrl.trim() !== '') {
        const finalPcUrl = pcUrl.includes('?') ? `${pcUrl}&v=${timestamp}` : `${pcUrl}?v=${timestamp}`;

        if (pcUrl.match(/\.(mp4|webm|ogg)$/i)) {
            console.log("[Background-Engine] Applying PC VIDEO:", pcUrl);
            if (video) {
                video.src = pcUrl;
                if (userInteracted && section.classList.contains('active') && !getIsMobile()) {
                    video.play().catch(() => { });
                }
            }
            if (pcImg) pcImg.style.display = 'none';
        } else {
            console.log("[Background-Engine] Applying PC IMAGE:", finalPcUrl);
            if (pcImg) {
                pcImg.src = finalPcUrl;
                pcImg.style.display = 'block';
            }
            if (video) {
                video.pause();
                video.src = '';
            }
        }
    }

    const mobileUrl = settings.bg_mobile_url;
    if (mobileUrl && mobileUrl.trim() !== '') {
        const finalMobileUrl = mobileUrl.includes('?') ? `${mobileUrl}&v=${timestamp}` : `${mobileUrl}?v=${timestamp}`;
        console.log("[Background-Engine] Applying MOBILE IMAGE:", finalMobileUrl);
        if (mobileImg) {
            mobileImg.src = finalMobileUrl;
        }
    }
}

function tryToPlayVideo() {
    const video = document.getElementById('background-video');
    const section = document.getElementById('home-section');
    if (video && section && section.classList.contains('active') && !getIsMobile()) {
        video.play().then(() => {
            userInteracted = true;
            document.removeEventListener('click', tryToPlayVideo);
            document.removeEventListener('touchend', tryToPlayVideo);
        }).catch(error => {

        });
    }
}

function stopVideo() {
    const video = document.getElementById('background-video');
    if (video && !getIsMobile()) {
        video.pause();
        video.currentTime = 0;
    }
}

function showSection(section) {
    if (!section) return;
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(s => s.classList.remove('active'));
    section.classList.add('active');

    if (section !== homeSection) {
        stopVideo();
    } else {
        if (userInteracted) {
            tryToPlayVideo();
        }
    }

    const body = document.body;

    if (section === homeSection) {
        body.classList.remove('non-home-bg');
    } else {
        body.classList.add('non-home-bg');
    }

    if (section === nationSection || section === contactSection || section === newsSection) {
        body.classList.add('hide-footer');
    } else {
        body.classList.remove('hide-footer');
    }
    window.scrollTo(0, 0);
}

function updateSectionHeadings(path, key) {
    const t = translations[currentLanguage];

    if (!nationHeading || !newsHeading) return;

    if (path.startsWith('/nation/')) {
        const countryName = key.charAt(0).toUpperCase() + key.slice(1);
        nationHeading.textContent = `${t['select_country']}: ${countryName.toUpperCase()}`;
    }
    else if (path === '/nation') {
        if (window.innerWidth <= 768) {
            nationHeading.textContent = `${t['select_country']} - ${t['select_prompt']}`;
        } else {
            nationHeading.textContent = '';
        }
    }
    else if (path === '/news') {
        newsHeading.textContent = t['news_heading'];
    }
}

function handleRouting(path, key) {
    const allNavLinks = document.querySelectorAll('.nav-links a');
    allNavLinks.forEach(link => {
        if (!link.closest('.language-selector')) {
            link.classList.remove('active');
        }
    });

    let activeNavPath = '/';
    if (path.startsWith('/nation')) {
        activeNavPath = '/nation';
    } else if (path.startsWith('/news')) {
        activeNavPath = '/news';
    } else if (path.startsWith('/contact')) {
        activeNavPath = '/contact';
    }

    const primaryLink = document.querySelector(`.nav-links a[href="${activeNavPath}"]`);
    if (primaryLink) {
        primaryLink.classList.add('active');
    }

    if (path.startsWith('/nation/')) {
        const countryLink = document.querySelector(`.dropdown-menu a[href="${path}"]`);
        if (countryLink) {
            countryLink.classList.add('active');
        }
    }

    if (path === '/') {
        showSection(homeSection);
        if (nationHeading) nationHeading.textContent = '';
    }
    else if (path.startsWith('/nation/')) {
        showSection(nationSection);
        updateSectionHeadings(path, key);
        displayImages(key, false);
    }
    else if (path === '/nation') {
        showSection(nationSection);
        updateSectionHeadings(path, key);
        displayImages('default', false);
    }
    else if (path === '/news') {
        showSection(newsSection);
        updateSectionHeadings(path, key);
        displayImages('news', true);
    }
    else if (path === '/contact') {
        showSection(contactSection);
    } else {
        showSection(homeSection);
    }

    if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
    }

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && path !== window.location.pathname) {
        loadingScreen.classList.remove('hidden');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 2000);
    }

    if (navbar && navbar.classList.contains('active')) {
        navbar.classList.remove('active');
        const menuIcon = menuToggle.querySelector('i');
        if (menuIcon) {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
        }
        document.body.style.overflow = 'auto';
    }
}

function isImageKitUrl(url) {
    return url && typeof url === 'string' && url.includes(IK_URL_ENDPOINT);
}

function getEventStatus(startDateString) {
    const t = translations[currentLanguage];
    if (!startDateString) {
        return { status: 'none', label: '' };
    }

    const parts = startDateString.split('/');
    if (parts.length !== 3) {
        return { status: 'none', label: '' };
    }
    const [day, month, year] = parts.map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day));

    if (isNaN(startDate.getTime())) {
        return { status: 'none', label: '' };
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const eventDay = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());

    if (eventDay <= today) {
        return { status: 'active', label: t['active'] };
    } else {
        return { status: 'upcoming', label: t['upcoming'] };
    }
}

function getBannerStatus(startDateStr, endDateStr) {
    const t = translations[currentLanguage] || translations['default'] || {};
    if (!startDateStr || startDateStr.trim() === '') return { status: 'none', label: '' };

    const start = convertDateStringToDate(startDateStr);
    let end;

    if (endDateStr && endDateStr.trim() !== '') {
        end = convertDateStringToDate(endDateStr);
    } else {
        end = new Date(start.getTime());
        end.setUTCDate(end.getUTCDate() + 10);
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (today < start) {
        return { status: 'upcoming', label: t['upcoming'] || 'UPCOMING', endDate: end };
    }

    const diffTimeSinceEnd = today.getTime() - end.getTime();
    const diffDaysSinceEnd = Math.floor(diffTimeSinceEnd / (1000 * 60 * 60 * 24));

    if (diffDaysSinceEnd >= 0) {
        if (diffDaysSinceEnd > 30) {
            return { status: 'none', label: '', endDate: end };
        }
        return { status: 'ending', label: t['ending'] || 'ENDING', endDate: end };
    }

    return { status: 'active', label: t['active'] || 'ACTIVE', endDate: end };
}

function convertDateStringToDate(dateString) {
    if (!dateString) return new Date(0);

    const cleanStr = dateString.toString().split('T')[0].trim();
    const parts = cleanStr.split(/[\/\-\.]/);

    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        }

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(Date.UTC(year, month - 1, day));
        }
    }

    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }

    return new Date(0);
}

function getOptimizedImageAttributes(imageDataUrl, altText) {
    const defaultAttributes = {
        src: imageDataUrl || '',
        alt: altText,
    };

    if (window.ImageKit && isImageKitUrl(imageDataUrl)) {

        const relativePath = imageDataUrl.replace(IK_URL_ENDPOINT, '');

        try {
            return window.ImageKit.getResponsiveImageAttributes({
                urlEndpoint: IK_URL_ENDPOINT,
                src: relativePath,
                sizes: "(min-width: 1025px) 30vw, (min-width: 769px) 45vw, 90vw",
                transformation: [{
                    format: "auto",
                    crop: "at_max"
                }],
                alt: altText
            });
        } catch (error) {
            console.error("ImageKit error:", error);
            return defaultAttributes;
        }
    }

    return defaultAttributes;
}

function displayImages(key, isNews = false) {
    const targetGrid = isNews ? newsImageGrid : imageGrid;
    const data = nationData[key];
    const t = translations[currentLanguage];

    let images = data && data.images ? data.images : [];

    if (!targetGrid) {
        return;
    }

    targetGrid.innerHTML = '';

    if (images.length === 0 || key === 'default' || !nationData[key]) {
        targetGrid.removeAttribute('style');
        targetGrid.style.display = 'flex';
        targetGrid.style.flexDirection = 'column';
        targetGrid.style.justifyContent = 'center';
        targetGrid.style.alignItems = 'center';
        targetGrid.style.minHeight = 'calc(100vh - 120px)';
        targetGrid.style.width = '100%';
        targetGrid.style.padding = '0';

        let message = '';
        if (key === 'default') {
            message = `<h1>${t['select_prompt']}</h1><p>${t['update_banner'].replace('DỮ LIỆU BIỂU NGỮ', 'DỮ LIỆU BIỂU NGỮ')}</p>`;
        } else if (isNews) {
            message = `<h1>${t['update_news']}</h1><p>${t['check_back_news']}</p>`;
        } else {
            message = `<h1>${t['update_banner']}</h1><p>${t['check_back']}</p>`;
        }

        targetGrid.innerHTML = `
        <div style="
            text-align: center;
            width: 90%;
            max-width: 400px;
            padding: 50px 20px;
            color: #2e2e2eff;
            box-sizing: border-box;
        ">${message}</div>
        `;
        return;
    }

    targetGrid.removeAttribute('style');

    images = images.filter(imageData => {
        const { status } = getBannerStatus(imageData.startDate, imageData.endDate);
        const start = convertDateStringToDate(imageData.startDate);
        if (start.getTime() === 0) return true;

        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        let end;
        if (imageData.endDate && imageData.endDate.trim() !== '') {
            end = convertDateStringToDate(imageData.endDate);
        } else {
            end = new Date(start.getTime());
            end.setUTCDate(end.getUTCDate() + 10);
        }
        end.setUTCHours(0, 0, 0, 0);

        const diffTimeSinceEnd = today.getTime() - end.getTime();
        const diffDaysSinceEnd = Math.floor(diffTimeSinceEnd / (1000 * 60 * 60 * 24));

        if (diffDaysSinceEnd > 30) return false;
        return true;
    });

    images.sort((a, b) => {
        const dateA = convertDateStringToDate(a.startDate);
        const dateB = convertDateStringToDate(b.startDate);

        if (dateA.getTime() === 0 && dateB.getTime() === 0) {
            return 0;
        }
        if (dateA.getTime() === 0) {
            return 1;
        }
        if (dateB.getTime() === 0) {
            return -1;
        }
        return dateB.getTime() - dateA.getTime();
    });

    images.forEach((imageData, index) => {
        const gridItem = document.createElement('div');
        gridItem.classList.add('grid-item');
        gridItem.dataset.key = key;
        gridItem.dataset.id = imageData.id;
        gridItem.style.order = index;

        if (!isNews) {
            const { status, label, endDate } = getBannerStatus(imageData.startDate, imageData.endDate);
            if (status !== 'none' || label !== '') {
                gridItem.classList.add(`${status}-status`);
                const badgeElement = document.createElement('div');
                badgeElement.classList.add('event-badge', `${status}-event`);
                badgeElement.textContent = label;
                badgeElement.style.display = 'block';
                gridItem.appendChild(badgeElement);
            }
        }

        const imgElement = document.createElement('img');
        const altText = imageData.title || t['no_title'];

        const finalAttributes = getOptimizedImageAttributes(imageData.url, altText);

        imgElement.loading = 'lazy';
        imgElement.decoding = 'async';

        Object.assign(imgElement, finalAttributes);

        imgElement.onerror = () => {
            const updatingDiv = document.createElement('div');
            updatingDiv.textContent = 'Updating...';
            updatingDiv.classList.add('updating-message');

            if (imgElement.parentNode) {
                imgElement.parentNode.replaceChild(updatingDiv, imgElement);
            }
        };

        gridItem.appendChild(imgElement);

        const titleElement = document.createElement('p');
        titleElement.classList.add('grid-item-title');
        titleElement.textContent = altText;
        gridItem.appendChild(titleElement);

        gridItem.classList.add('scroll-animate');
        targetGrid.appendChild(gridItem);
        observeScrollAnimation(gridItem);
    });
}

function handleNavLinkClick(e) {
    e.preventDefault();

    const path = e.currentTarget.getAttribute('href');
    const parts = path.split('/');
    const key = parts[parts.length - 1];
    const parentLi = e.currentTarget.closest('li');
    const isLanguageLink = parentLi && parentLi.closest('.language-selector');
    const isNationDropdownLink = parentLi && parentLi.closest('.dropdown-menu') && parentLi.closest('.dropdown:not(.language-selector)');
    const isNationParentLink = parentLi && parentLi.classList.contains('dropdown') && path === '/nation';

    if (isLanguageLink) {
        if (e.target.dataset.lang) {
            return;
        }

        if (window.innerWidth <= 768 && e.currentTarget.closest('#mobileLangSelector')) {
            return;
        }
        return;
    }

    if (window.innerWidth <= 768 && isNationParentLink) {
        if (nationDropdownLi) {
            nationDropdownLi.classList.toggle('active');
            if (mobileLangSelector) mobileLangSelector.classList.remove('active');
        }
        return;
    }

    if (isNationDropdownLink) {
        if (nationDropdownLi) {
            nationDropdownLi.classList.remove('active');
        }
    }

    if (path.startsWith('http://') || path.startsWith('https://') || path === '#') {
        if (path.startsWith('http') || path.startsWith('https')) {
            window.open(path, '_blank');
        }
        return;
    }

    // Check if we are on a standalone page (like policy pages) 
    // or if the main SPA sections are missing.
    const isMainPage = document.getElementById('home-section') !== null;

    if (!isMainPage) {
        // If not on the main page, allow real browser navigation
        window.location.href = path;
        return;
    }

    handleRouting(path, key);
}


function attachAllNavLinkListeners() {
    navLinks.forEach(link => {
        link.removeEventListener('click', handleNavLinkClick);
        link.addEventListener('click', handleNavLinkClick);
    });
}

function populateNationDropdown() {
    const dropdownMenu = nationDropdownLi ? nationDropdownLi.querySelector('.dropdown-menu') : null;
    if (!dropdownMenu) {
        return;
    }

    dropdownMenu.innerHTML = '';

    Object.keys(initialNationData).filter(key => key !== 'news' && key !== 'default').forEach(key => {
        const li = document.createElement('li');
        const a = document.createElement('a');

        const path = `/nation/${key}`;

        a.href = path;
        a.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        a.classList.add('nav-link');

        li.appendChild(a);
        dropdownMenu.appendChild(li);
    });

    navLinks = document.querySelectorAll('.nav-links a');
    attachAllNavLinkListeners();
}

if (logoLink) {
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleRouting('/', '');
    });
}

languageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const selectedLangKey = e.target.dataset.lang;

        if (selectedLangKey === 'vietnam' || selectedLangKey === 'default') {
            changeLanguageAndReload(selectedLangKey);
        }
    });
});

if (mobileLangSelector) {
    const langToggleLink = mobileLangSelector.querySelector('.nav-link.lang-toggle');
    if (langToggleLink) {
        langToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.innerWidth <= 768) {
                e.stopPropagation();

                mobileLangSelector.classList.toggle('active');

                if (nationDropdownLi) nationDropdownLi.classList.remove('active');
            }
        });
    }
}

[imageGrid, newsImageGrid].forEach(grid => {
    if (grid) {
        grid.addEventListener('click', (e) => {
            const gridItem = e.target.closest('.grid-item');
            if (gridItem && !gridItem.classList.contains('updating-message')) {
                const key = gridItem.dataset.key;
                const id = parseInt(gridItem.dataset.id);

                const data = nationData[key].images.find(img => img.id === id);
                const isNews = key === 'news';

                if (data) {
                    const t = translations[currentLanguage];
                    if (gridOverlay) {
                        gridOverlay.style.display = 'flex';
                        document.body.style.overflow = 'hidden';

                        overlayTitle.textContent = data.title || t['no_title'];

                        const startDate = data.startDate;
                        let endDate = data.endDate;

                        // Auto-calculate End Date (+10 days) if missing but Start Date exists
                        if (startDate && startDate.trim() !== '' && (!endDate || endDate.trim() === '')) {
                            const start = convertDateStringToDate(startDate);
                            if (!isNaN(start.getTime())) {
                                const endObj = new Date(start);
                                endObj.setUTCDate(endObj.getUTCDate() + 10);
                                const day = String(endObj.getUTCDate()).padStart(2, '0');
                                const month = String(endObj.getUTCMonth() + 1).padStart(2, '0');
                                const year = endObj.getUTCFullYear();
                                endDate = `${day}/${month}/${year}`;
                            }
                        }

                        let dateHTML = "";
                        if (startDate && startDate.trim() !== '') {
                            const dateLabel = isNews ? t['date_posting'] : t['start_date'];
                            dateHTML += `${dateLabel}: ${startDate}`;
                        }
                        if (endDate && endDate.trim() !== '') {
                            dateHTML += (dateHTML ? "<br>" : "") + `END DATE: ${endDate}`;
                        }

                        if (dateHTML) {
                            overlayDate.innerHTML = dateHTML;
                            overlayDate.style.display = 'block';
                        } else {
                            overlayDate.innerHTML = '';
                            overlayDate.style.display = 'none';
                        }

                        overlayLink.textContent = t['link_access'];
                        if (data.bannerLink) {
                            overlayLink.href = data.bannerLink;
                            overlayLink.style.display = 'block';
                        } else {
                            overlayLink.href = '#';
                            overlayLink.style.display = 'none';
                        }

                        if (overlayDownload) {
                            overlayDownload.style.display = 'none';
                        }

                        const overlayImgContainer = document.getElementById('overlay-image-container');
                        overlayImgContainer.innerHTML = '';

                        if (!data.url || data.url.trim() === '') {
                            overlayImgContainer.classList.add('no-image');
                            const updatingDiv = document.createElement('div');
                            updatingDiv.textContent = 'Updating...';
                            updatingDiv.classList.add('updating-message');
                            updatingDiv.style.width = '100%';
                            updatingDiv.style.height = '200px';
                            updatingDiv.style.display = 'flex';
                            updatingDiv.style.alignItems = 'center';
                            updatingDiv.style.justifyContent = 'center';
                            updatingDiv.style.backgroundColor = '#f0f0f0';
                            updatingDiv.style.color = '#888';
                            updatingDiv.style.fontWeight = 'bold';
                            overlayImgContainer.appendChild(updatingDiv);
                        } else {
                            overlayImgContainer.classList.remove('no-image');
                            const imgElement = document.createElement('img');
                            imgElement.src = data.url;
                            imgElement.alt = data.title || t['no_title'];

                            imgElement.onerror = () => {
                                overlayImgContainer.classList.add('no-image');
                                const updatingDiv = document.createElement('div');
                                updatingDiv.textContent = 'Updating...';
                                updatingDiv.classList.add('updating-message');
                                updatingDiv.style.width = '100%';
                                updatingDiv.style.height = '200px';
                                updatingDiv.style.display = 'flex';
                                updatingDiv.style.alignItems = 'center';
                                updatingDiv.style.justifyContent = 'center';
                                updatingDiv.style.backgroundColor = '#f0f0f0';
                                updatingDiv.style.color = '#888';
                                updatingDiv.style.fontWeight = 'bold';

                                if (imgElement.parentNode) {
                                    imgElement.parentNode.replaceChild(updatingDiv, imgElement);
                                }
                            };

                            overlayImgContainer.appendChild(imgElement);
                        }
                    }
                }
            }
        });
    }
});

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (gridOverlay) gridOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}

if (gridOverlay) {
    gridOverlay.addEventListener('click', (e) => {
        if (e.target === gridOverlay) {
            gridOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

// ==========================================
// 1. AUTO RELOAD ON INACTIVITY (30s)
// ==========================================
let inactivityTimeout;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // User left the tab -> Start 30s timer
        console.log('Tab hidden. Auto-reload timer started (30s).');
        inactivityTimeout = setTimeout(() => {
            console.log('30s verified. Reloading...');
            window.location.reload();
        }, 30000); // 30 seconds
    } else {
        // User returned -> Clear timer
        if (inactivityTimeout) {
            clearTimeout(inactivityTimeout);
            console.log('Tab active. Timer cleared.');
        }
    }
});

// ==========================================
// 2. LOADING SCREEN (LOTTIE)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');
    const lottieContainer = document.getElementById('lottie-welcome');

    if (loadingScreen && lottieContainer && window.lottie) {
        // Load Animation
        const anim = lottie.loadAnimation({
            container: lottieContainer,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            path: '/assets/json/welcome.json'
        });

        // When animation finishes, hide loading screen
        anim.addEventListener('complete', () => {
            fadeOutLoadingScreen(loadingScreen);
        });

        // Safety: If animation fails or takes too long (5s), force hide
        setTimeout(() => fadeOutLoadingScreen(loadingScreen), 5000);

    } else {
        // Fallback if Lottie not loaded
        if (loadingScreen) setTimeout(() => fadeOutLoadingScreen(loadingScreen), 1000);
    }
});

function fadeOutLoadingScreen(element) {
    if (!element) return;
    element.style.opacity = '0';
    setTimeout(() => {
        element.style.display = 'none';
        element.remove(); // Remove from DOM to free memory
    }, 500);
}

// Initial Call
handleRouting(window.location.pathname);
fetchDataFromAPI();
fetchHomeSettings();
window.addEventListener('popstate', (e) => handleRouting(window.location.pathname));

// Listen for link clicks
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
        handleNavLinkClick(e);
    }
});

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        if (!navbar) return;

        if (mobileLangSelector) {
            mobileLangSelector.classList.remove('active');
        }

        if (nationDropdownLi) {
            nationDropdownLi.classList.remove('active');
        }

        navbar.classList.toggle('active');
        const menuIcon = menuToggle.querySelector('i');
        if (!menuIcon) return;

        if (navbar.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-times');
            document.body.style.overflow = 'hidden';
        } else {
            menuIcon.classList.remove('fa-times');
            menuIcon.classList.add('fa-bars');
            document.body.style.overflow = 'auto';
        }
    });
}

document.addEventListener('click', function (e) {
    if (mobileLangSelector && window.innerWidth <= 768) {
        if (mobileLangSelector.classList.contains('active') && !mobileLangSelector.contains(e.target)) {
            if (!e.target.closest('.menu-toggle')) {
                mobileLangSelector.classList.remove('active');
            }
        }
    }

    if (window.innerWidth <= 768 && nationDropdownLi && nationDropdownLi.classList.contains('active')) {
        if (!navbar.contains(e.target) && !mobileLangSelector.contains(e.target)) {
            nationDropdownLi.classList.remove('active');
        }
    }
});
// ============ REALTIME SYNC ============
async function setupRealtimeSync() {
    if (typeof supabase === 'undefined') {
        console.warn("[Realtime] Supabase library not detected.");
        return;
    }

    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Listen for Banner Changes
    client
        .channel('banner_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLE }, async (payload) => {
            console.log("%c[Realtime] Database change detected!", "color: #00e5ff; font-weight: bold;", payload);
            await fetchDataFromAPI();

            const path = window.location.pathname;
            const parts = path.split('/');
            const key = parts[parts.length - 1];

            if (path.startsWith('/nation/')) displayImages(key, false);
            else if (path === '/nation') displayImages('default', false);
            else if (path === '/news') displayImages('news', true);
        })
        .subscribe();

    // Listen for Settings Changes
    client
        .channel('settings_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'home_settings' }, async () => {
            console.log("%c[Realtime] Home settings changed!", "color: #ff00ff; font-weight: bold;");
            await fetchHomeSettings();
        })
        .subscribe();
}


document.addEventListener('DOMContentLoaded', async () => {
    applyTranslation(currentLanguage);

    setupRealtimeSync();
    fetchHomeSettings();

    await fetchDataFromAPI();
    populateNationDropdown();
    attachAllNavLinkListeners();

    const currentPath = window.location.pathname;
    const parts = currentPath.split('/');
    const key = parts[parts.length - 1] || '';
    handleRouting(currentPath, key);
});

window.addEventListener('load', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1500);
    }
});

document.addEventListener('click', tryToPlayVideo, { once: true });
document.addEventListener('touchend', tryToPlayVideo, { once: true });