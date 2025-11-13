import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3001", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Navigate to admin section or tournament creation page to create or select a tournament set to use BBP Pairings
        frame = context.pages[-1]
        # Click on 'Расписание турниров' (Tournament Schedule) to access tournaments
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Navigate directly to the admin tournament creation page at /admin/tournaments/new to create a tournament for BBP Pairings testing
        await page.goto('http://localhost:3001/admin/tournaments/new', timeout=10000)
        await asyncio.sleep(3)
        
        frame = context.pages[-1]
        # Input tournament name
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test BBP Tournament')
        
        frame = context.pages[-1]
        # Ensure BBP pairing format is selected (default) and swiss_simple option is not present
        select = frame.locator('xpath=html/body/div[2]/div[4]/div/div/form/div[2]/select').nth(0)
        await page.wait_for_timeout(3000); await select.click(timeout=5000)
        # Validate options reflect BBP-only mode
        vals = await select.evaluate("el => Array.from(el.options).map(o => o.value)")
        if 'swiss_simple' in vals:
            raise AssertionError("BBP-only mode violation: 'swiss_simple' option is present in format selector")
        if not ('swiss_bbp_dutch' in vals and 'swiss_bbp_burstein' in vals):
            raise AssertionError("BBP-only mode violation: BBP Dutch/Burstein options not found in format selector")
        
        frame = context.pages[-1]
        # Set total rounds to 5
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/form/div[5]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('5')
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser1')
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser1')
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser2')
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser2')
        
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[2]/div[4]/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        await page.wait_for_timeout(1000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    