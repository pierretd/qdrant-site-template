// Script to download featured product images
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Read the featured products data
const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/data/featuredProducts.json'), 'utf8'));
const outputDir = path.join(__dirname, '../public/images/featured');

// Make sure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const filePath = path.join(outputDir, filename);
    
    console.log(`Downloading ${url} to ${filePath}`);
    
    const file = fs.createWriteStream(filePath);
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${filename}`);
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlinkSync(filePath);
      console.error(`Error downloading ${url}: ${err.message}`);
      reject(err);
    });
  });
}

// Process all categories and download images
async function downloadAllImages() {
  const imageMap = {};
  const downloadPromises = [];
  
  // For each category
  Object.keys(productsData).forEach(category => {
    // For each product in the category
    productsData[category].forEach(product => {
      if (product.image_url && product.article_id) {
        const imageUrl = product.image_url;
        const articleId = product.article_id;
        const extension = imageUrl.split('.').pop();
        const filename = `${articleId}.${extension}`;
        
        // Keep track of the mapping from original URLs to local paths
        imageMap[imageUrl] = `/images/featured/${filename}`;
        
        // Add to download queue
        downloadPromises.push(downloadImage(imageUrl, filename));
      }
    });
  });
  
  // Download all images
  try {
    await Promise.all(downloadPromises);
    console.log('All images downloaded successfully');
    
    // Save the image mapping for later use
    fs.writeFileSync(
      path.join(__dirname, '../app/data/imageMap.json'), 
      JSON.stringify(imageMap, null, 2),
      'utf8'
    );
    
    // Create a modified version of the products data with local image URLs
    const localProductsData = JSON.parse(JSON.stringify(productsData));
    
    Object.keys(localProductsData).forEach(category => {
      localProductsData[category].forEach(product => {
        if (product.image_url && imageMap[product.image_url]) {
          product.image_url = imageMap[product.image_url];
        }
      });
    });
    
    // Save the modified products data
    fs.writeFileSync(
      path.join(__dirname, '../app/data/localFeaturedProducts.json'), 
      JSON.stringify(localProductsData, null, 2),
      'utf8'
    );
    
    console.log('Image mapping and local products data saved');
  } catch (error) {
    console.error('Error downloading images:', error);
  }
}

// Run the download
downloadAllImages().catch(console.error); 