#!/usr/bin/env node

/**
 * This script refreshes the static data for the featured products on the homepage.
 * Run it when the API data changes and you want to update the hardcoded data.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Configuration
const API_URL = 'http://localhost:8000/api/py/featured?limit_per_category=4';
const OUTPUT_DIR = path.join(__dirname, '../app/data');
const IMAGES_DIR = path.join(__dirname, '../public/images/featured');

// Make sure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Helper function to fetch API data
function fetchData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    console.log(`Fetching data from ${url}`);
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch data: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error fetching data: ${err.message}`));
    });
  });
}

// Helper function to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const filePath = path.join(IMAGES_DIR, filename);
    
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

// Main function
async function refreshStaticData() {
  try {
    // Step 1: Fetch the latest featured products data
    console.log('Fetching latest featured products data...');
    const productsData = await fetchData(API_URL);
    
    // Step 2: Save the raw data
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'featuredProducts.json'), 
      JSON.stringify(productsData, null, 2),
      'utf8'
    );
    console.log('Saved featured products data');
    
    // Step 3: Process images
    console.log('Processing images...');
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
    await Promise.all(downloadPromises);
    console.log('All images downloaded successfully');
    
    // Step 4: Save the image mapping
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'imageMap.json'), 
      JSON.stringify(imageMap, null, 2),
      'utf8'
    );
    
    // Step 5: Create a modified version of the products data with local image URLs
    const localProductsData = JSON.parse(JSON.stringify(productsData));
    
    Object.keys(localProductsData).forEach(category => {
      localProductsData[category].forEach(product => {
        if (product.image_url && imageMap[product.image_url]) {
          product.image_url = imageMap[product.image_url];
        }
      });
    });
    
    // Step 6: Save the modified products data
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'localFeaturedProducts.json'), 
      JSON.stringify(localProductsData, null, 2),
      'utf8'
    );
    
    console.log('Static data refresh completed successfully!');
    
  } catch (error) {
    console.error('Error refreshing static data:', error);
    process.exit(1);
  }
}

// Run the refresh
refreshStaticData().catch(console.error); 