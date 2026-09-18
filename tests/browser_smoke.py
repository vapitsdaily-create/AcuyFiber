"""Optional browser smoke test; Python + Playwright + Chromium required.

Start `npm run dev`, then run: python tests/browser_smoke.py
For in-memory, offline portable-preview checks: python tests/browser_smoke.py --portable
Use CHROMIUM_EXECUTABLE to select an installed browser executable.
No order, payment, message or email is submitted by this test.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import shutil

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:3000')
    parser.add_argument('--portable', action='store_true')
    parser.add_argument('--screenshots', action='store_true')
    options = parser.parse_args()
    errors: list[str] = []
    results: list[str] = []

    def passed(message: str) -> None:
        results.append(message)
        print('PASS:', message, flush=True)

    with sync_playwright() as playwright:
        executable = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        launch_options = {'headless': True}
        if executable:
            launch_options['executable_path'] = executable
        browser = playwright.chromium.launch(**launch_options)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        page.set_default_timeout(6000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        if options.portable:
            html = (ROOT / 'AcuyFiber.html').read_text(encoding='utf-8')
            # External web fonts are optional and omitted from offline QA only.
            html = re.sub(r'<link[^>]+https://[^>]*>', '', html)
            page.set_content(html, wait_until='domcontentloaded')
        else:
            page.goto(options.url, wait_until='domcontentloaded')
            page.evaluate('localStorage.clear()')
            page.reload(wait_until='domcontentloaded')
        expect(page).to_have_title(re.compile('^AcuyFiber'))
        expect(page.locator('.site-header .brand-name')).to_have_text('AcuyFiber')
        expect(page.locator('#product-grid .product-card')).to_have_count(4)
        passed('AcuyFiber branding and the four default flower-vase products')

        page.locator('.filter-tabs [data-category="all"]').click()
        expect(page.locator('#product-grid .product-card')).to_have_count(14)
        page.locator('.filter-tabs [data-category="dekorasi"]').click()
        expect(page.locator('#product-grid .product-card')).to_have_count(3)
        page.locator('.filter-tabs [data-category="taman"]').click()
        expect(page.locator('#product-grid .product-card')).to_have_count(3)
        page.locator('.filter-tabs [data-category="trofi"]').click()
        expect(page.locator('#product-grid .product-card')).to_have_count(4)
        passed('All 14 products and all four category filters')

        page.locator('.header-actions [data-action="search"]').click()
        page.locator('#search-input').fill('harimau')
        expect(page.locator('#search-results .search-result')).to_have_count(2)
        page.locator('#search-input').fill('not-a-real-product-123')
        expect(page.locator('#search-results .search-result')).to_have_count(0)
        page.keyboard.press('Escape')
        expect(page.locator('#search-dialog')).not_to_be_visible()
        passed('Search results, empty search state and Escape-to-close')

        page.locator('.filter-tabs [data-category="vas"]').click()
        page.locator('[data-product-id="vas-lilit-flora"] .product-image-button').click()
        expect(page.locator('#product-dialog')).to_be_visible()
        page.locator('#product-dialog [data-action="quantity"][data-delta="1"]').click()
        page.locator('#product-dialog [data-action="add-detail"]').click()
        expect(page.locator('.site-header [data-cart-count]')).to_have_text('2')
        page.locator('#product-dialog [data-action="favorite"]').click()
        expect(page.locator('#product-dialog [data-action="favorite"]')).to_have_attribute('aria-pressed', 'true')
        page.keyboard.press('Escape')
        page.locator('.header-actions [data-action="wishlist"]').click()
        expect(page.locator('#wishlist-items')).to_contain_text('Vas Lilit Flora')
        page.keyboard.press('Escape')
        passed('Product detail, quantity selection, cart addition and favorites')

        if not options.portable:
            page.reload(wait_until='domcontentloaded')
            expect(page.locator('.site-header [data-cart-count]')).to_have_text('2')
            expect(page.locator('.site-header [data-wishlist-count]')).to_have_text('1')
            passed('Cart and favorites survive a reload on an HTTP origin')
        else:
            passed('Features remain usable without origin-based persistent storage (in-memory preview)')

        page.locator('.header-actions [data-action="cart"]').click()
        expect(page.locator('#cart-items .cart-item')).to_have_count(1)
        page.locator('#cart-items [data-action="quantity"][data-delta="1"]').click()
        expect(page.locator('.site-header [data-cart-count]')).to_have_text('3')
        page.locator('#cart-items [data-action="quantity"][data-delta="-1"]').click()
        expect(page.locator('.site-header [data-cart-count]')).to_have_text('2')
        if options.screenshots:
            page.screenshot(path=str(ROOT / 'preview' / 'acuyfiber-keranjang.png'))
        page.locator('#cart-dialog [data-action="quote"]').click()
        page.locator('#quote-form [name="name"]').fill('Pelanggan Uji')
        page.locator('#quote-form [name="city"]').fill('Bandung')
        note = '<img src=x onerror="window.BAD=true"> Uji detail pesanan.'
        page.locator('#quote-form [name="notes"]').fill(note)
        page.locator('#quote-form [type="submit"]').click()
        expect(page.locator('#quote-output')).to_contain_text('ACUYFIBER — PERMINTAAN PENAWARAN')
        expect(page.locator('#quote-output')).to_contain_text('ACF-')
        expect(page.locator('#quote-output')).to_contain_text('Vas Lilit Flora — 2 pilihan')
        expect(page.locator('#quote-output')).to_contain_text(note)
        assert not page.evaluate('Boolean(window.BAD)')
        expect(page.locator('#quote-whatsapp')).to_have_count(0)
        expect(page.locator('#quote-output')).to_contain_text('BUKAN KONFIRMASI PESANAN')
        page.locator('[data-action="edit-quote"]').click()
        expect(page.locator('#quote-form [name="name"]')).to_have_value('Pelanggan Uji')
        page.keyboard.press('Escape')
        passed('Cart updates, quotation form, branded draft, safe text output and edit draft')

        page.locator('.header-actions [data-action="cart"]').click()
        page.locator('#cart-items [data-action="remove"]').click()
        expect(page.locator('#cart-items .cart-item')).to_have_count(0)
        expect(page.locator('.site-header [data-cart-count]')).to_have_text('0')
        page.keyboard.press('Escape')
        page.locator('.floating-consult').click()
        page.locator('#quote-form [name="name"]').fill('Pelanggan Uji')
        page.locator('#quote-form [name="notes"]').fill('Mencari dekorasi warna putih.')
        page.locator('#quote-form [type="submit"]').click()
        expect(page.locator('#quote-output')).to_contain_text('KONSULTASI DEKORASI')
        expect(page.locator('#quote-output')).not_to_contain_text('PILIHAN PRODUK')
        page.keyboard.press('Escape')
        passed('Remove cart item, empty-cart state and independent consultation')

        page.locator('[data-action="style"][data-style="minimalis"]').first.click()
        expect(page.locator('#product-grid .product-card')).to_have_count(2)
        page.locator('#clear-style').click()
        expect(page.locator('#product-grid .product-card')).to_have_count(14)
        page.locator('#sort-select').select_option('az')
        names = page.locator('#product-grid .product-title').all_text_contents()
        assert names[0].strip() == 'Angsa Harmoni'
        page.locator('[data-action="slide"][data-slide="1"]').click()
        expect(page.locator('#hero-product-name')).to_have_text('Vas Cahaya Bambu')
        page.locator('[data-action="slide"][data-slide="0"]').click()
        passed('Style filtering, sorting and hero photo controls')

        page.locator('.filter-tabs [data-category="vas"]').click()
        page.locator('#sort-select').select_option('featured')
        for width in [360, 390, 768, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.wait_for_timeout(120)
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth')
            if overflow:
                print(page.evaluate('''[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).map(e=>({tag:e.tagName,cls:e.className,id:e.id,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right})).slice(0,20)'''))
            assert not overflow, f'Horizontal overflow at {width}px'
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('.mobile-menu-button').click()
        expect(page.locator('#menu-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#menu-dialog')).not_to_be_visible()
        passed('No page overflow at 360, 390, 768, 1024 and 1440 pixels; mobile navigation')

        page.evaluate('document.querySelectorAll("img").forEach(image => { image.loading = "eager"; });')
        page.wait_for_function('[...document.images].every(image => image.complete && image.naturalWidth > 0)')
        passed('All currently rendered product and editorial images loaded')
        if options.screenshots:
            page.evaluate('scrollTo(0, 0)')
            page.screenshot(path=str(ROOT / 'preview' / 'acuyfiber-mobile.png'), full_page=True)
            page.screenshot(path=str(ROOT / 'preview' / 'acuyfiber-mobile-beranda.png'))
            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.evaluate('scrollTo(0, 0)')
            page.screenshot(path=str(ROOT / 'preview' / 'acuyfiber-desktop.png'), full_page=True)
            page.screenshot(path=str(ROOT / 'preview' / 'acuyfiber-beranda.png'))
        assert not errors, errors
        passed('No uncaught JavaScript errors')
        print(f'\n{len(results)} browser checks passed. Mode: {"portable in-memory" if options.portable else "HTTP"}.')
        browser.close()


if __name__ == '__main__':
    main()
