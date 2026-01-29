// SUPABASE REALTIME CONFIGURATION
let supabaseClient = null;

async function initSupabase() {
    if (typeof createClient === 'undefined') {
        console.error('Supabase JS library not loaded.');
        return;
    }

    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();

        if (config.supabaseUrl && config.supabaseAnonKey) {
            supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
            console.log('Supabase Realtime Initialized');

            // Subscribe to Nation Banners
            supabaseClient
                .channel('public:nation_banners')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'nation_banners' }, (payload) => {
                    console.log('Realtime update detected (Banners):', payload);
                    fetchBanners();
                    if (payload.new && payload.new.nation_key === 'news') {
                        fetchNews();
                    }
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
        } else {
            console.warn('Supabase config missing. Please set Vercel Environment Variables.');
        }
    } catch (e) {
        console.error('Error initializing Supabase:', e);
    }
}

// Initialize on load
window.addEventListener('load', initSupabase);

const SUPABASE_TABLE = 'nation_banners';

// Helper to call our server-side API proxy
async function callAdminApi(action, params = {}) {
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, params })
        });

        // First check if the response is actually JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON API Response:", text);
            throw new Error(`API returned non-JSON response (${response.status}). Are you running on Vercel?`);
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Request Failed with status ${response.status}`);
        }

        return data;
    } catch (err) {
        console.error(`API Error (${action}):`, err);
        throw err;
    }
}

// Initialize Lottie Animation Management
let mainAnimation = null;
const animationContainer = document.getElementById('lottie-animation');

/**
 * Plays a Lottie animation from the /admin/assets/json/ folder.
 * Returns a Promise that resolves when the animation is LOADED.
 */
function playLoginAnimation(fileName, loop = true, callback = null) {
    if (!animationContainer) return Promise.resolve();

    // Set internal padding to shrink the icon content without changing the container's layout size
    if (fileName === 'lock.json') {
        animationContainer.style.padding = "22px";
    } else if (fileName === 'check.json' || fileName === 'wrong.json') {
        animationContainer.style.padding = "45px";
    } else if (fileName === 'loading.json') {
        animationContainer.style.padding = "35px";
    } else {
        animationContainer.style.padding = "0px";
    }

    // Destroy previous animation if exists
    if (mainAnimation) {
        mainAnimation.destroy();
    }

    return new Promise((resolve, reject) => {
        fetch(`/admin/assets/json/${fileName}`)
            .then(response => response.json())
            .then(data => {
                mainAnimation = lottie.loadAnimation({
                    container: animationContainer,
                    renderer: 'svg',
                    loop: loop,
                    autoplay: true,
                    animationData: data
                });

                if (callback) {
                    mainAnimation.addEventListener('complete', callback);
                }

                // Resolve when it's ready to play
                // We listen for DOMLoaded or firstFrame to ensure it's visible
                mainAnimation.addEventListener('DOMLoaded', () => resolve(mainAnimation));
                // Fallback resolve if DOMLoaded already happened or missed
                setTimeout(() => resolve(mainAnimation), 100);
            })
            .catch(err => {
                console.error(`Failed to load animation ${fileName}:`, err);
                reject(err);
            });
    });
}

// Load default lock animation
if (animationContainer) {
    playLoginAnimation('lock.json', true);
}

const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginError = document.getElementById('login-error');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnKeyLogin = document.getElementById('btn-key-login');
const emailInput = document.getElementById('email-input');
const keyInput = document.getElementById('access-key-input');
const btnLogout = document.getElementById('btn-logout');

const bannerTableBody = document.getElementById('banner-table-body');
const bannerForm = document.getElementById('banner-form');
const adminCardTitle = document.querySelector('.admin-card h3');

let isEditing = false;
let currentEditId = null;
let allBanners = [];
let isLoggingIn = false; // Add flag to prevent multiple login attempts
const filterNation = document.getElementById('filter-nation');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const btnDeleteSelected = document.getElementById('btn-delete-selected');

const bannerType = document.getElementById('banner-type');
const bannerNationKey = document.getElementById('banner-nation-key');
const bannerEndDate = document.getElementById('banner-end-date');
const toggleBannerForm = document.getElementById('toggle-banner-form');
const adminCard = document.querySelector('.admin-card');
const cardHeader = document.querySelector('.card-header');

const tabLinks = document.querySelectorAll('.tab-link');
const tabPanes = document.querySelectorAll('.tab-pane');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');

const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-active');
        dashboardContainer.classList.add('sidebar-open');
    });
}

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-active');
            dashboardContainer.classList.remove('sidebar-open');
        } else {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-active');
        dashboardContainer.classList.remove('sidebar-open');
    });
}

if (window.innerWidth > 1024) {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');
}

tabLinks.forEach(link => {
    link.addEventListener('click', () => {
        const tabId = link.dataset.tab;

        tabLinks.forEach(l => l.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        link.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Close on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-active');
        }
    });
});

const homeSettingsForm = document.getElementById('home-settings-form');
const homeBgPc = document.getElementById('home-bg-pc');
const homeBgMobile = document.getElementById('home-bg-mobile');

async function checkSession() {
    if (localStorage.getItem('admin_granted') === 'true') {
        showDashboard();
    } else {
        showLogin();
    }
}
async function checkWhitelist(email) {
    if (!email) return null;
    try {
        const data = await callAdminApi('fetch_admin_list');
        return data.find(a => a.email === email) || null;
    } catch (err) {
        return null;
    }
}

async function handleGoogleLogin() {
    alert('Google Login is currently being secured. Please use Email/Key login for now.');
    // In a full implementation, this would redirect to a server-side auth route
}

async function handleKeyLogin() {
    if (isLoggingIn) return;

    const email = emailInput.value.trim();
    const key = keyInput.value.trim();

    // 1. Dùng flag để chặn click liên tục + Hiện "Checking..." + Chạy hiệu ứng ngay lập tức
    isLoggingIn = true;
    btnKeyLogin.disabled = true;
    showChecking('Checking...');

    // Play loading.json exactly 2 times
    try {
        await new Promise((resolve) => {
            let count = 0;
            playLoginAnimation('loading.json', true).then(anim => {
                if (!anim) {
                    resolve();
                    return;
                }
                const onLoop = () => {
                    count++;
                    if (count >= 2) {
                        anim.removeEventListener('loopComplete', onLoop);
                        anim.pause();
                        resolve();
                    }
                };
                anim.addEventListener('loopComplete', onLoop);
            }).catch(() => resolve()); // Safety fallback
        });

        // 2. Sau khi chạy 2 vòng hiệu ứng xong mới bắt đầu kiểm tra Validation
        if (!email && !key) {
            showError('Please Enter Your Email And Password.');
            await playLoginAnimation('wrong.json', false, () => playLoginAnimation('lock.json', true));
            return;
        }
        if (!email) {
            showError('Please Enter Your Email');
            await playLoginAnimation('wrong.json', false, () => playLoginAnimation('lock.json', true));
            return;
        }
        if (!key) {
            showError('Please Enter Your Password.');
            await playLoginAnimation('wrong.json', false, () => playLoginAnimation('lock.json', true));
            return;
        }

        // 3. Nếu validate OK thì mới gọi API
        const isValid = await callAdminApi('verify_admin_key', {
            p_email: email,
            p_key: key
        });

        if (!isValid) {
            showError('Email Or Access Key Is Not Correct!');
            await playLoginAnimation('wrong.json', false, () => playLoginAnimation('lock.json', true));
        } else {
            localStorage.setItem('admin_granted', 'true');
            localStorage.setItem('admin_email', email);
            localStorage.setItem('admin_key', key);

            // Fetch and store role
            const adminData = await checkWhitelist(email);
            localStorage.setItem('admin_role', (adminData && adminData.role) ? adminData.role : 'admin');

            // Success flow
            showSuccess('Please Wait...');
            await playLoginAnimation('check.json', false, () => {
                setTimeout(() => showDashboard(), 800);
            });
        }
    } catch (err) {
        showError(err.message || 'An error occurred during login.');
        await playLoginAnimation('wrong.json', false, () => playLoginAnimation('lock.json', true));
    } finally {
        isLoggingIn = false;
        btnKeyLogin.disabled = false;
    }
}

window.addEventListener('load', () => {
    checkSession();
});

function showLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';

    // Role-based UI visibility
    const role = localStorage.getItem('admin_role') || 'admin';
    const grantTabLink = document.getElementById('tab-link-grant-access');
    if (grantTabLink) {
        grantTabLink.style.display = (role === 'senior_admin') ? 'flex' : 'none';
    }

    fetchBanners().then(() => {
        autoCleanupBanners();
    });
    fetchHomeSettings();
}

async function autoCleanupBanners() {
    if (allBanners.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiredIds = allBanners.filter(banner => {
        if (!banner.end_date) return false;
        const end = parseDateString(banner.end_date);
        if (!end) return false;

        const diffTime = today.getTime() - end.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 30;
    }).map(b => parseInt(b.id));

    if (expiredIds.length > 0) {
        console.log(`Auto-cleaning ${expiredIds.length} expired banners older than 30 days.`);
        const email = localStorage.getItem('admin_email');
        const key = localStorage.getItem('admin_key');

        try {
            await callAdminApi('manage_banner_delete', {
                p_email: email,
                p_key: key,
                p_ids: expiredIds
            });
            fetchBanners();
        } catch (error) {
            console.error('Auto-cleanup error:', error);
        }
    }
}

function showError(msg) {
    loginError.textContent = msg;
    loginError.className = 'error-message';
    loginError.style.display = 'block';
}

function showSuccess(msg) {
    loginError.textContent = msg;
    loginError.className = 'success-message';
    loginError.style.display = 'block';
}

function showChecking(msg) {
    loginError.textContent = msg;
    loginError.className = 'checking-message';
    loginError.style.display = 'block';
}

btnGoogleLogin.addEventListener('click', handleGoogleLogin);
btnKeyLogin.addEventListener('click', handleKeyLogin);

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('admin_granted');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_key');
    window.location.reload();
});

async function fetchBanners() {
    try {
        const data = await callAdminApi('fetch_banners');
        allBanners = data;
        filterAndRender();
        fetchExpiredBanners();
    } catch (error) {
        console.error('Error fetching banners:', error);
    }
}

function parseDateString(dateStr) {
    if (!dateStr || !dateStr.trim()) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
}

function filterAndRender() {
    const selectedNation = filterNation.value;
    const dateFromStr = filterDateFrom ? filterDateFrom.value : '';
    const dateToStr = filterDateTo ? filterDateTo.value : '';

    let filtered = allBanners;

    if (selectedNation !== 'all') {
        filtered = filtered.filter(b => b.nation_key === selectedNation);
    }

    const dateFrom = parseDateString(dateFromStr);
    const dateTo = parseDateString(dateToStr);

    if (dateFrom || dateTo) {
        filtered = filtered.filter(b => {
            const bannerDate = parseDateString(b.start_date);
            if (!bannerDate) return false;

            if (dateFrom && bannerDate < dateFrom) return false;
            if (dateTo && bannerDate > dateTo) return false;

            return true;
        });
    }

    renderBanners(filtered);
}

if (filterNation) {
    filterNation.addEventListener('change', filterAndRender);
}

if (filterDateFrom) {
    filterDateFrom.addEventListener('input', filterAndRender);
}

if (filterDateTo) {
    filterDateTo.addEventListener('input', filterAndRender);
}

const btnApplyFilter = document.getElementById('btn-apply-filter');
if (btnApplyFilter) {
    btnApplyFilter.addEventListener('click', filterAndRender);
}


document.querySelectorAll('.card-header').forEach(header => {
    header.addEventListener('click', () => {
        const card = header.closest('.admin-card');
        card.classList.toggle('collapsed');

        const icon = header.querySelector('.toggle-btn');
        if (icon) {
            if (card.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        }
    });
});

function renderBanners(banners) {
    bannerTableBody.innerHTML = '';
    banners.forEach(banner => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="banner-checkbox" data-id="${banner.id}"></td>
            <td><img src="${banner.url}" alt="Banner" style="height: 50px; object-fit: cover;"></td>
            <td>${banner.title || 'No Title'}</td>
            <td><span class="badge badge-info">${banner.nation_key}</span></td>
            <td>${banner.start_date || '--/--/----'}</td>
            <td>${banner.end_date || '--/--/----'}</td>
            <td>
                <button class="action-btn btn-edit" onclick="openEditModal('${banner.id}', '${banner.title || ''}', '${banner.url}', '${banner.banner_link || ''}', '${banner.nation_key}', '${banner.start_date || ''}', '${banner.end_date || ''}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" onclick="deleteBanner('${banner.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        bannerTableBody.appendChild(tr);
    });

    updateCheckboxListeners();
    updateDeleteButtonVisibility();
}

window.deleteBanner = async (id) => {
    if (confirm('Are you sure you want to delete it?')) {
        const email = localStorage.getItem('admin_email');
        const key = localStorage.getItem('admin_key');

        try {
            await callAdminApi('manage_banner_delete', {
                p_email: email,
                p_key: key,
                p_ids: [parseInt(id)]
            });
            fetchBanners();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};

window.openEditModal = (id, title, url, link, nation, startDate, endDate) => {
    isEditing = true;
    currentEditId = id;
    if (adminCardTitle) adminCardTitle.textContent = 'Edit Banner';

    document.getElementById('banner-title').value = title;
    document.getElementById('banner-url').value = url;
    document.getElementById('banner-link').value = link;
    document.getElementById('banner-nation-key').value = nation;
    document.getElementById('banner-start-date').value = startDate;
    document.getElementById('banner-end-date').value = endDate || '';

    if (nation === 'news') {
        bannerNationKey.disabled = true;
    } else {
        bannerNationKey.disabled = false;
    }

    const saveBtn = document.getElementById('btn-save-banner');
    if (saveBtn) saveBtn.textContent = 'Update Banner';

    const adminCard = document.querySelector('.admin-card');
    if (adminCard) {
        adminCard.scrollIntoView({ behavior: 'smooth' });
    }
};

function resetForm() {
    isEditing = false;
    currentEditId = null;
    if (adminCardTitle) adminCardTitle.textContent = 'Add New Banner';
    bannerForm.reset();
    const saveBtn = document.getElementById('btn-save-banner');
    if (saveBtn) saveBtn.textContent = 'Add Banner';
    if (bannerNationKey) bannerNationKey.disabled = false;
}

bannerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('banner-title').value;
    const url = document.getElementById('banner-url').value;
    const banner_link = document.getElementById('banner-link').value;
    const nation_key = document.getElementById('banner-nation-key').value;
    const start_date = document.getElementById('banner-start-date').value;

    const email = localStorage.getItem('admin_email');
    const key = localStorage.getItem('admin_key');

    const rpcPayload = {
        p_email: email,
        p_key: key,
        p_id: isEditing ? parseInt(currentEditId) : null,
        p_title: title,
        p_url: url,
        p_banner_link: banner_link,
        p_nation_key: nation_key,
        p_start_date: start_date,
        p_end_date: document.getElementById('banner-end-date').value
    };

    try {
        await callAdminApi('manage_banner_upsert', rpcPayload);
        resetForm();
        fetchBanners();
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

async function fetchHomeSettings() {
    try {
        const data = await callAdminApi('fetch_home_settings');
        if (data) {
            if (homeBgPc) homeBgPc.value = data.bg_pc_url || '';
            if (homeBgMobile) homeBgMobile.value = data.bg_mobile_url || '';
        }
    } catch (error) {
        console.error('Error fetching home settings:', error);
    }
}

if (homeSettingsForm) {
    homeSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pcUrl = homeBgPc.value.trim();
        const mobileUrl = homeBgMobile.value.trim();

        const email = localStorage.getItem('admin_email');
        const key = localStorage.getItem('admin_key');

        try {
            await callAdminApi('manage_home_settings', {
                p_email: email,
                p_key: key,
                p_bg_pc_url: pcUrl,
                p_bg_mobile_url: mobileUrl
            });
            alert('Settings saved successfully!');
            fetchHomeSettings();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

function updateCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.banner-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateDeleteButtonVisibility);
    });
}

function updateDeleteButtonVisibility() {
    const checkboxes = document.querySelectorAll('.banner-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (btnDeleteSelected) {
        btnDeleteSelected.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
}

if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.banner-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateDeleteButtonVisibility();
    });
}

if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async function () {
        const checkboxes = document.querySelectorAll('.banner-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) return;

        if (confirm(`Delete ${ids.length} selected banner(s)?`)) {
            const email = localStorage.getItem('admin_email');
            const key = localStorage.getItem('admin_key');

            try {
                await callAdminApi('manage_banner_delete', {
                    p_email: email,
                    p_key: key,
                    p_ids: ids.map(id => parseInt(id))
                });
                fetchBanners();
            } catch (error) {
                console.error('Error deleting banners:', error);
                alert('Error deleting: ' + error.message);
            }
        }
    });
}

// ============ NEWS MANAGEMENT ============
const newsForm = document.getElementById('news-form');
const newsTableBody = document.getElementById('news-table-body');
const filterNewsFrom = document.getElementById('filter-news-from');
const filterNewsTo = document.getElementById('filter-news-to');
const btnApplyNewsFilter = document.getElementById('btn-apply-news-filter');
const selectAllNews = document.getElementById('select-all-news');
const btnDeleteNewsSelected = document.getElementById('btn-delete-news-selected');

let allNews = [];
let isEditingNews = false;
let currentEditNewsId = null;

async function fetchNews() {
    try {
        const data = await callAdminApi('fetch_banners', { nation_key: 'news' });
        allNews = data;
        filterAndRenderNews();
    } catch (error) {
        console.error('Error fetching news:', error);
    }
}

function filterAndRenderNews() {
    const dateFromStr = filterNewsFrom ? filterNewsFrom.value : '';
    const dateToStr = filterNewsTo ? filterNewsTo.value : '';

    let filtered = allNews;

    const dateFrom = parseDateString(dateFromStr);
    const dateTo = parseDateString(dateToStr);

    if (dateFrom || dateTo) {
        filtered = filtered.filter(n => {
            const newsDate = parseDateString(n.start_date);
            if (!newsDate) return false;

            if (dateFrom && newsDate < dateFrom) return false;
            if (dateTo && newsDate > dateTo) return false;

            return true;
        });
    }

    renderNews(filtered);
}

function renderNews(news) {
    if (!newsTableBody) return;
    newsTableBody.innerHTML = '';
    news.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="news-checkbox" data-id="${item.id}"></td>
            <td><img src="${item.url}" alt="News" style="height: 50px; object-fit: cover;"></td>
            <td>${item.title || 'No Title'}</td>
            <td>${item.start_date || '--/--/----'}</td>
            <td>
                <button class="action-btn btn-edit" onclick="openEditNewsModal('${item.id}', '${item.title || ''}', '${item.url}', '${item.banner_link || ''}', '${item.start_date || ''}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" onclick="deleteNews('${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        newsTableBody.appendChild(tr);
    });

    updateNewsCheckboxListeners();
}

window.deleteNews = async (id) => {
    if (confirm('Are you sure you want to delete this news?')) {
        const email = localStorage.getItem('admin_email');
        const key = localStorage.getItem('admin_key');

        try {
            await callAdminApi('manage_banner_delete', {
                p_email: email,
                p_key: key,
                p_ids: [parseInt(id)]
            });
            fetchNews();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};

window.openEditNewsModal = (id, title, url, link, postingDate) => {
    isEditingNews = true;
    currentEditNewsId = id;

    document.getElementById('news-title').value = title;
    document.getElementById('news-url').value = url;
    document.getElementById('news-link').value = link;
    document.getElementById('news-posting-date').value = postingDate;

    const saveBtn = document.getElementById('btn-save-news');
    if (saveBtn) saveBtn.textContent = 'Update News';

    const newsCard = document.querySelector('#news-tab .admin-card');
    if (newsCard) newsCard.scrollIntoView({ behavior: 'smooth' });
};

function resetNewsForm() {
    isEditingNews = false;
    currentEditNewsId = null;
    if (newsForm) newsForm.reset();
    const saveBtn = document.getElementById('btn-save-news');
    if (saveBtn) saveBtn.textContent = 'Add News';
}

if (newsForm) {
    newsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('news-title').value;
        const url = document.getElementById('news-url').value;
        const banner_link = document.getElementById('news-link').value;
        const start_date = document.getElementById('news-posting-date').value;

        const email = localStorage.getItem('admin_email');
        const key = localStorage.getItem('admin_key');

        const rpcPayload = {
            p_email: email,
            p_key: key,
            p_title: title,
            p_url: url,
            p_banner_link: banner_link,
            p_nation_key: 'news',
            p_start_date: start_date,
            p_end_date: ''
        };

        if (isEditingNews) {
            rpcPayload.p_id = parseInt(currentEditNewsId);
        }

        try {
            await callAdminApi('manage_banner_upsert', rpcPayload);
            resetNewsForm();
            fetchNews();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

if (btnApplyNewsFilter) {
    btnApplyNewsFilter.addEventListener('click', filterAndRenderNews);
}

function updateNewsCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.news-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateNewsDeleteButtonVisibility);
    });
}

function updateNewsDeleteButtonVisibility() {
    const checkboxes = document.querySelectorAll('.news-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (btnDeleteNewsSelected) {
        btnDeleteNewsSelected.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
    }

    if (selectAllNews) {
        selectAllNews.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        selectAllNews.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
}

if (selectAllNews) {
    selectAllNews.addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.news-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateNewsDeleteButtonVisibility();
    });
}

if (btnDeleteNewsSelected) {
    btnDeleteNewsSelected.addEventListener('click', async function () {
        const checkboxes = document.querySelectorAll('.news-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) return;

        if (confirm(`Delete ${ids.length} selected news item(s)?`)) {
            const email = localStorage.getItem('admin_email');
            const key = localStorage.getItem('admin_key');

            try {
                await callAdminApi('manage_banner_delete', {
                    p_email: email,
                    p_key: key,
                    p_ids: ids.map(id => parseInt(id))
                });
                fetchNews();
            } catch (error) {
                console.error('Error deleting news:', error);
                alert('Error deleting: ' + error.message);
            }
        }
    });
}

// ============ EXPIRED BANNERS ============
const expiredTableBody = document.getElementById('expired-table-body');
const selectAllExpired = document.getElementById('select-all-expired');
const btnDeleteExpired = document.getElementById('btn-delete-expired');

async function fetchExpiredBanners() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expired = allBanners.filter(banner => {
        if (!banner.end_date) return false;
        const end = parseDateString(banner.end_date);
        if (!end) return false;

        const diffTime = today.getTime() - end.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 10 && diffDays <= 30;
    });

    renderExpiredBanners(expired);
}

function renderExpiredBanners(banners) {
    if (!expiredTableBody) return;
    expiredTableBody.innerHTML = '';
    banners.forEach(banner => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="expired-checkbox" data-id="${banner.id}"></td>
            <td><img src="${banner.url}" alt="Banner" style="height: 50px; object-fit: cover;"></td>
            <td>${banner.title || 'No Title'}</td>
            <td><span class="badge badge-info">${banner.nation_key}</span></td>
            <td>${banner.end_date || '--/--/----'}</td>
            <td>
                <button class="action-btn btn-delete" onclick="deleteBanner('${banner.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        expiredTableBody.appendChild(tr);
    });

    updateExpiredCheckboxListeners();
}

function updateExpiredCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.expired-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateExpiredDeleteButtonVisibility);
    });
}

function updateExpiredDeleteButtonVisibility() {
    const checkboxes = document.querySelectorAll('.expired-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (btnDeleteExpired) {
        btnDeleteExpired.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
    }

    if (selectAllExpired) {
        selectAllExpired.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        selectAllExpired.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
}

if (selectAllExpired) {
    selectAllExpired.addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.expired-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateExpiredDeleteButtonVisibility();
    });
}

if (btnDeleteExpired) {
    btnDeleteExpired.addEventListener('click', async function () {
        const checkboxes = document.querySelectorAll('.expired-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) return;

        if (confirm(`Delete ${ids.length} expired banner(s)?`)) {
            const email = localStorage.getItem('admin_email');
            const key = localStorage.getItem('admin_key');

            try {
                await callAdminApi('manage_banner_delete', {
                    p_email: email,
                    p_key: key,
                    p_ids: ids.map(id => parseInt(id))
                });
                fetchBanners();
            } catch (error) {
                console.error('Error deleting expired banners:', error);
                alert('Error deleting: ' + error.message);
            }
        }
    });
}

// ============ GRANT ACCESS ============
const grantAccessForm = document.getElementById('grant-access-form');
const adminListBody = document.getElementById('admin-list-body');

async function fetchAdminList() {
    try {
        const data = await callAdminApi('fetch_admin_list');
        renderAdminList(data);
    } catch (error) {
        console.error('Error fetching admin list:', error);
    }
}

let isEditingAdmin = false;

function renderAdminList(admins) {
    if (!adminListBody) return;
    adminListBody.innerHTML = '';
    admins.forEach(admin => {
        // Mask email for security: test@gmail.com -> te***@gmail.com
        const [user, domain] = admin.email.split('@');
        const maskedEmail = user.length > 2
            ? user.substring(0, 2) + '*'.repeat(user.length - 2) + '@' + domain
            : admin.email;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${maskedEmail}</td>
            <td><span class="badge ${admin.role === 'senior_admin' ? 'badge-warning' : 'badge-info'}">${admin.role === 'senior_admin' ? 'Senior Admin' : 'Admin'}</span></td>
            <td>
                <button class="action-btn btn-edit" onclick="openEditAdminModal('${admin.email}', '${admin.role}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" onclick="deleteAdmin('${admin.email}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        adminListBody.appendChild(tr);
    });
}

window.openEditAdminModal = (email, role) => {
    isEditingAdmin = true;
    document.getElementById('grant-email').value = email;
    document.getElementById('grant-email').readOnly = true;
    document.getElementById('grant-password').value = ''; // Don't show password
    document.getElementById('grant-password').placeholder = 'Leave blank to keep current';
    document.getElementById('grant-password').required = false;
    document.getElementById('grant-role').value = role;

    const submitBtn = grantAccessForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'UPDATE ADMIN';

    grantAccessForm.scrollIntoView({ behavior: 'smooth' });
};

window.deleteAdmin = async (email) => {
    if (confirm(`Are you sure you want to remove ${email}?`)) {
        const adminEmail = localStorage.getItem('admin_email');
        const adminKey = localStorage.getItem('admin_key');

        try {
            await callAdminApi('manage_admin_access', {
                p_email: adminEmail,
                p_key: adminKey,
                p_action: 'DELETE',
                p_target_email: email
            });
            fetchAdminList();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};

if (grantAccessForm) {
    grantAccessForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetEmail = document.getElementById('grant-email').value;
        const targetPassword = document.getElementById('grant-password').value;
        const targetRole = document.getElementById('grant-role').value;

        const adminEmail = localStorage.getItem('admin_email');
        const adminKey = localStorage.getItem('admin_key');

        const action = isEditingAdmin ? 'UPDATE' : 'ADD';
        const payload = {
            p_email: adminEmail,
            p_key: adminKey,
            p_action: action,
            p_target_email: targetEmail,
            p_target_role: targetRole
        };

        if (targetPassword) {
            payload.p_target_password = targetPassword;
        }

        try {
            await callAdminApi('manage_admin_access', payload);
            alert(`Admin ${isEditingAdmin ? 'updated' : 'added'} successfully!`);
            resetGrantForm();
            fetchAdminList();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

// ============ PASSWORD VISIBILITY TOGGLE ============
function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.toggle-password');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
}

// Call setup on load
window.addEventListener('load', () => {
    setupPasswordToggles();
});

function resetGrantForm() {
    isEditingAdmin = false;
    grantAccessForm.reset();
    document.getElementById('grant-email').readOnly = false;
    document.getElementById('grant-password').required = true;
    document.getElementById('grant-password').placeholder = '';
    const submitBtn = grantAccessForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'ADD ADMIN';
}

// Update showDashboard to fetch all data
const originalShowDashboard = showDashboard;
showDashboard = function () {
    originalShowDashboard();
    fetchNews();
    fetchAdminList();
};

// ==========================================
// AUTO RELOAD ON INACTIVITY (30s)
// ==========================================
let adminInactivityTimeout;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // User left the tab -> Start 30s timer
        console.log('Admin Tab hidden. Auto-reload timer started (30s).');
        adminInactivityTimeout = setTimeout(() => {
            console.log('30s verified. Reloading Admin...');
            window.location.reload();
        }, 30000); // 30 seconds
    } else {
        // User returned -> Clear timer
        if (adminInactivityTimeout) {
            clearTimeout(adminInactivityTimeout);
            console.log('Admin Tab active. Timer cleared.');
        }
    }
});