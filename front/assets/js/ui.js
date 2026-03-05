function showAuthPage(pageId) {
    document.querySelectorAll('.auth-page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

function showMainPage(pageId) {
    document.querySelectorAll('.main-page').forEach(page => {
        page.classList.add('hidden');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('fade-in');
        window.scrollTo(0, 0);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function switchNotifTab(tabElement, type) {
    document.querySelectorAll('.notification-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    tabElement.classList.add('active');

    const general = document.getElementById('generalNotif');
    const system = document.getElementById('systemNotif');
    const promo = document.getElementById('promoNotif');

    if (general) general.classList.add('hidden');
    if (system) system.classList.add('hidden');
    if (promo) promo.classList.add('hidden');

    if (type === 'general' && general) general.classList.remove('hidden');
    if (type === 'system' && system) system.classList.remove('hidden');
    if (type === 'promo' && promo) promo.classList.remove('hidden');
}

// Function to update notification badge
function updateNotificationBadge() {
    const general = document.getElementById('generalNotif');
    const system = document.getElementById('systemNotif');
    const promo = document.getElementById('promoNotif');
    
    let count = 0;
    
    // Count only if element exists and is visible (or logically exists)
    if (general) count += general.querySelectorAll('.notification-item').length;
    if (system) count += system.querySelectorAll('.notification-item').length;
    if (promo) count += promo.querySelectorAll('.notification-item').length;

    const badge = document.querySelector('.header-right .icon-btn .badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Update individual tab badges if they exist
    const generalTabBadge = document.querySelector('.notification-tab[onclick*="general"] .tab-badge');
    if (generalTabBadge && general) {
        const c = general.querySelectorAll('.notification-item').length;
        generalTabBadge.textContent = c;
        generalTabBadge.style.display = c > 0 ? 'inline-flex' : 'none';
    }
}

function selectLevel(card) {
    const cards = card.parentElement.querySelectorAll('.level-card');
    cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
}

function showModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (document.body && document.body.dataset && document.body.dataset.page === 'auth') {
        window.location.href = 'login.html';
    }
}
