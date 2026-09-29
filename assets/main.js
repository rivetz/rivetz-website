class Main {
    constructor() {
        this.headerNav = document.querySelector('header nav');
        this.bodyElement = document.querySelector('main');
        this.footerNav = document.querySelector('footer .footer-grid');
        this.parsePath(document.location.href);
        window.addEventListener("hashchange",async (e)=>{
            let currentPage = this.page;
            this.parsePath(e.newURL);
            if (this.page !== currentPage) await this.drawBody();
            if (!this.anchor) {
                window.scrollTo(0,0);
                try {
                    let clean = this.page === 'home' ? '/' : '/' + this.page;
                    if (document.location.pathname !== clean)
                        history.replaceState(null, '', clean);
                } catch(e) {}
            }
        });
        
        // Add mobile menu toggle functionality
        this.initMobileMenu();
    }
    
    // Initialize mobile menu functionality
    initMobileMenu() {
        // Check if mobile menu button already exists, if not create it
        if (!document.querySelector('.mobile-menu-toggle')) {
            console.log('Creating mobile menu button');
            const headerContent = document.querySelector('.header-content');
            const mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.className = 'mobile-menu-toggle';
            mobileMenuBtn.setAttribute('aria-label', 'Toggle menu');
            mobileMenuBtn.innerHTML = `
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            `;
            headerContent.appendChild(mobileMenuBtn);
            console.log('Mobile menu button created');
            
            // Add click event listener
            mobileMenuBtn.addEventListener('click', () => {
                console.log('Mobile menu clicked');
                const nav = document.querySelector('header nav');
                nav.classList.toggle('mobile-active');
                mobileMenuBtn.classList.toggle('active');
            });
            
            // Close mobile menu when a link is clicked
            document.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' && e.target.closest('nav') && 
                    document.querySelector('nav.mobile-active')) {
                    document.querySelector('nav.mobile-active').classList.remove('mobile-active');
                    document.querySelector('.mobile-menu-toggle.active').classList.remove('active');
                }
            });
        } else {
            console.log('Mobile menu button already exists');
        }
    }
    
    static async mint() {
        let instance = new Main();
        let request = await fetch('/manifest.json');
        instance.manifest = await request.json();
        return instance;
    }
    
    async drawHeader() {
        let html = '<ul>';
        for (let item of this.manifest.header.menu) {
            html += `<li><a href="${item.path}">${item.name}</a></li>`;
        }
        html += '</ul>';
        this.headerNav.innerHTML = html;
    }
    
    async drawFooter() {
        let html = '';
        for (let category of Object.keys(this.manifest.footer)) {
            html += `<div class="footer-col"><h4>${category}</h4><ul>`;
            for (let item of this.manifest.footer[category]) {
                html += `<li><a href="${item.path}">${item.name}</a></li>`;
            }
            html += '</ul></div>';
        }
        this.footerNav.innerHTML = html;
    }
    
    async drawBody() {
        let pageBody='Page not found';
        let pageStyle = '';
        try {
            let bodyRequest = await fetch(`/pages/${this.page}.html`);
            if (bodyRequest.ok) pageBody = await bodyRequest.text();
            let styleRequest = await fetch(`/pages/${this.page}.css`);
            if (styleRequest.ok) pageStyle = `<style>${await styleRequest.text()}</style>`;
        } catch(e) {}
        
        this.bodyElement.innerHTML = pageStyle+'\n'+pageBody;

        // Keep the tab title in step with client-side navigation. The server sets
        // it on first load; this covers every hop after that.
        let pageMeta = (this.manifest && this.manifest.pages) ? this.manifest.pages[this.page] : null;
        if (pageMeta && pageMeta.title) document.title = pageMeta.title;
        
        if (this.anchor) document.location.href = '#'+this.hash;
    }

    // Which page to draw. A hash wins when present (in-page nav). Otherwise the
    // page came from a clean server-rendered URL like /rules — take it from the
    // meta tag the server injected, falling back to the path itself.
    serverPage() {
        let tag = document.querySelector('meta[name="rivetz-page"]');
        if (tag && tag.content) return tag.content;
        let seg = (document.location.pathname || '/').split('/').filter(Boolean)[0];
        return seg || 'home';
    }

    parsePath(location = '') {
        this.hash = location.split('#')[1];
        if (!this.hash || this.hash === '') {
            this.page = this.serverPage();
            this.anchor = '';
        } else {
            let match = this.hash.match(/^([A-Za-z0-9-_]*)(?:\.)?(.*)?/);
            this.page = match[1] || "home";
            this.anchor = match[2];
        }
    }
}
(async ()=>{
    let main = await Main.mint();
    await main.drawHeader();
    await main.drawFooter();
    await main.drawBody();
})();