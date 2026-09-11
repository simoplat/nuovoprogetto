from playwright.sync_api import sync_playwright
import os

html_path = os.path.abspath('games/lupus/index.html')
file_url = 'file:///' + html_path.replace('\\', '/')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(file_url)
    
    # Verify setup view is visible
    assert page.is_visible('#view-lupus-setup')
    print('[OK] Setup view visible')
    
    # Check start game button
    page.click('#lupus-btn-start-game')
    page.wait_for_timeout(300)
    
    # Verify pass view is now visible
    assert page.is_visible('#view-lupus-pass')
    print('[OK] Pass view visible')
    
    # Verify hold button is present
    assert page.is_visible('#lupus-hold-reveal-btn')
    print('[OK] Hold button present')
    
    browser.close()
    print('[OK] Standalone Lupus Dark Fantasy page verified successfully!')
