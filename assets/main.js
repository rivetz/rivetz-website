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
            if (!this.anchor) window.scrollTo(0,0);
        });
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
        if (this.anchor) document.location.href = '#'+this.hash;
    }

    parsePath(location = '') {
        this.hash = location.split('#')[1];
        if (!this.hash || this.hash === '') {
            this.page = "home";
            this.anchor = '';
        } else {
            let match = this.hash.match(/^([A-Za-z0-9-_]*)(?:\.)?(.*)?/);
            this.page = match[1];
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
