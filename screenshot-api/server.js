const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
  console.log(`Created screenshots directory: ${screenshotsDir}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Screenshot API endpoint
app.post('/api/screenshot', async (req, res) => {
  const { url, highQuality = false } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  let browser = null;
  const startTime = Date.now();
  
  try {
    // Validate URL
    new URL(url);
    
    // Generate unique filenames for desktop and mobile screenshots
    const timestamp = Date.now();
    const desktopFilename = `desktop-${timestamp}.png`;
    const mobileFilename = `mobile-${timestamp}.png`;
    
    const desktopFilePath = path.join(screenshotsDir, desktopFilename);
    const mobileFilePath = path.join(screenshotsDir, mobileFilename);
    
    console.log(`Taking screenshots of ${url}...`);
    console.log(`Quality mode: ${highQuality ? 'High' : 'Normal'}`);
    
    // Launch browser with appropriate settings based on quality
    const launchOptions = {
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-notifications',
        '--disable-web-security',
      ]
    };
    
    // Add performance optimizations for normal quality
    if (!highQuality) {
      launchOptions.args.push(
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-smooth-scrolling',
        '--disable-extensions'
      );
    }
    
    browser = await puppeteer.launch(launchOptions);
    
    // 1. Capture desktop screenshot
    console.log('Capturing desktop version...');
    const desktopPage = await browser.newPage();
    
    // Optimize network and resource loading
    if (!highQuality) {
      await desktopPage.setRequestInterception(true);
      desktopPage.on('request', (req) => {
        // Block non-essential resources for speed in normal quality mode
        const resourceType = req.resourceType();
        if (resourceType === 'font' || resourceType === 'media' || 
            (resourceType === 'image' && req.url().includes('.gif'))) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }
    
    // Set timeouts based on quality
    const navigationTimeout = highQuality ? 30000 : 20000;
    await desktopPage.setDefaultNavigationTimeout(navigationTimeout);
    
    // Set desktop user agent
    await desktopPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Set viewport based on quality
    await desktopPage.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: highQuality ? 1 : 1
    });
    
    console.log(`Navigating to ${url} for desktop screenshot...`);
    try {
      // Use faster loading strategy for normal quality
      const waitUntil = highQuality ? 'networkidle2' : 'domcontentloaded';
      await desktopPage.goto(url, { 
        waitUntil: waitUntil,
        timeout: navigationTimeout
      });
      
      // Wait based on quality
      await new Promise(resolve => setTimeout(resolve, highQuality ? 3000 : 1000));
      
    } catch (navigationError) {
      console.warn(`Navigation timed out, but continuing: ${navigationError.message}`);
      // We'll still try to take a screenshot even if navigation times out
    }
    
    // Scroll to load lazy content - faster for normal quality
    if (highQuality) {
      console.log('Scrolling page to load lazy content...');
      await autoScroll(desktopPage, highQuality);
    } else {
      console.log('Quick scroll for normal quality...');
      await quickScroll(desktopPage);
    }
    
    // Take desktop screenshot
    console.log(`Taking desktop screenshot to ${desktopFilePath}`);
    await desktopPage.screenshot({ 
      path: desktopFilePath,
      fullPage: true,
      // JPG for normal quality (smaller file size), PNG for high quality
      type: highQuality ? 'png' : 'jpeg',
      quality: highQuality ? undefined : 70
    });
    
    // Verify desktop screenshot was created
    if (fs.existsSync(desktopFilePath)) {
      const stats = fs.statSync(desktopFilePath);
      console.log(`Desktop screenshot saved: ${desktopFilePath} (${stats.size} bytes)`);
    } else {
      throw new Error(`Failed to save desktop screenshot to ${desktopFilePath}`);
    }
    
    // 2. Capture mobile screenshot
    console.log('Capturing mobile version...');
    const mobilePage = await browser.newPage();
    
    // Optimize network and resource loading for mobile
    if (!highQuality) {
      await mobilePage.setRequestInterception(true);
      mobilePage.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'font' || resourceType === 'media' || 
            (resourceType === 'image' && req.url().includes('.gif'))) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }
    
    // Set timeouts
    await mobilePage.setDefaultNavigationTimeout(navigationTimeout);
    
    // Set mobile user agent
    await mobilePage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    // Set mobile viewport
    await mobilePage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: highQuality ? 2 : 1 // Lower resolution for normal quality
    });
    
    console.log(`Navigating to ${url} for mobile screenshot...`);
    try {
      const waitUntil = highQuality ? 'networkidle2' : 'domcontentloaded';
      await mobilePage.goto(url, {
        waitUntil: waitUntil,
        timeout: navigationTimeout
      });
      
      // Wait based on quality
      await new Promise(resolve => setTimeout(resolve, highQuality ? 3000 : 1000));
      
    } catch (navigationError) {
      console.warn(`Mobile navigation timed out, but continuing: ${navigationError.message}`);
    }
    
    // Scroll for mobile - faster for normal quality
    if (highQuality) {
      await autoScroll(mobilePage, highQuality);
    } else {
      await quickScroll(mobilePage);
    }
    
    // Take mobile screenshot
    console.log(`Taking mobile screenshot to ${mobileFilePath}`);
    await mobilePage.screenshot({
      path: mobileFilePath,
      fullPage: true,
      type: highQuality ? 'png' : 'jpeg',
      quality: highQuality ? undefined : 70
    });
    
    // Verify mobile screenshot was created
    if (fs.existsSync(mobileFilePath)) {
      const stats = fs.statSync(mobileFilePath);
      console.log(`Mobile screenshot saved: ${mobileFilePath} (${stats.size} bytes)`);
    } else {
      throw new Error(`Failed to save mobile screenshot to ${mobileFilePath}`);
    }
    
    // Calculate total time
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2); // in seconds, with 2 decimal places
    
    // Construct URLs for the screenshots
    const desktopUrl = `http://localhost:${port}/screenshots/${desktopFilename}`;
    const mobileUrl = `http://localhost:${port}/screenshots/${mobileFilename}`;
    
    console.log(`Screenshots completed successfully in ${totalTime} seconds`);
    console.log(`Desktop URL: ${desktopUrl}`);
    console.log(`Mobile URL: ${mobileUrl}`);
    
    // Send the final response
    res.json({
      success: true,
      desktopUrl: desktopUrl,
      mobileUrl: mobileUrl,
      totalTime: totalTime
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ 
      error: 'Failed to generate screenshots',
      message: error.message 
    });
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error('Error closing browser:', err));
    }
  }
});

// Full scroll function for high quality
async function autoScroll(page, highQuality = true) {
  return page.evaluate(async (isHighQuality) => {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = isHighQuality ? 300 : 500;
      const delay = isHighQuality ? 200 : 100;
      const maxScrolls = isHighQuality ? 100 : 50;
      let scrollCount = 0;
      
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;
        
        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, delay);
    });
  }, highQuality);
}

// Quick scroll function for normal quality
async function quickScroll(page) {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      // Fast scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
      
      // Then back to top after a short delay
      setTimeout(() => {
        window.scrollTo(0, 0);
        resolve();
      }, 500);
    });
  });
}

// Function to try dismissing common popups and cookie banners
async function dismissPopups(page) {
  try {
    await page.evaluate(() => {
      // Array of common selectors for close buttons and accept buttons
      const selectors = [
        'button[aria-label="Close"]', '.close', '.closeButton', 
        'button[aria-label="Accept cookies"]', '[aria-label="accept cookies"]',
        '[class*="cookie"] button[class*="accept"]'
      ];
      
      // Try to click each selector
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && el.offsetParent !== null) {
              el.click();
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Set overflow to visible on body to prevent hidden content
      document.body.style.overflow = 'visible';
    });
  } catch (error) {
    // Continue execution even if popup dismissal fails
  }
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Screenshot API is working!' });
});

// Directory check endpoint - useful for debugging
app.get('/api/check-dirs', (req, res) => {
  try {
    // Check screenshots directory
    const screenshotsDirExists = fs.existsSync(screenshotsDir);
    let screenshotsDirWritable = false;
    
    if (screenshotsDirExists) {
      try {
        const testFile = path.join(screenshotsDir, 'test-write.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        screenshotsDirWritable = true;
      } catch (e) {
        // Directory is not writable
      }
    }
    
    // Return directory status
    res.json({
      screenshots_dir: {
        path: screenshotsDir,
        exists: screenshotsDirExists,
        writable: screenshotsDirWritable
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List screenshots endpoint - useful for debugging
app.get('/api/list-screenshots', (req, res) => {
  try {
    if (!fs.existsSync(screenshotsDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(screenshotsDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
      .map(file => ({
        name: file,
        url: `http://localhost:${port}/screenshots/${file}`,
        size: fs.statSync(path.join(screenshotsDir, file)).size,
        created: fs.statSync(path.join(screenshotsDir, file)).birthtime
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up old screenshots (keep last 50)
function cleanupOldScreenshots() {
  try {
    if (!fs.existsSync(screenshotsDir)) return;
    
    const files = fs.readdirSync(screenshotsDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
      .map(file => ({
        name: file,
        path: path.join(screenshotsDir, file),
        created: fs.statSync(path.join(screenshotsDir, file)).birthtime
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // Keep only the newest 50 screenshots
    if (files.length > 50) {
      console.log(`Cleaning up ${files.length - 50} old screenshots...`);
      files.slice(50).forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error(`Failed to delete ${file.path}: ${e.message}`);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up screenshots:', error);
  }
}

// Start server
app.listen(port, () => {
  console.log(`Screenshot API running at http://localhost:${port}`);
  console.log(`Test the API with: http://localhost:5000/api/test`);
  
  // Run cleanup on startup and periodically
  cleanupOldScreenshots();
  setInterval(cleanupOldScreenshots, 24 * 60 * 60 * 1000); // Once a day
});