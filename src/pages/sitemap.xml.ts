// Generate XML sitemap for SEO
import type { APIRoute } from 'astro';
import { databaseService } from '../lib/database';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.toString() || 'https://example.com';
  
  try {
    // Fetch all active businesses, categories, amenities, regions, and states
    const [businesses, categories, amenities, regions, states] = await Promise.all([
      databaseService.getBusinesses({}, { page: 1, limit: 10000, offset: 0 }),
      databaseService.getCategories(),
      databaseService.getAmenities(),
      databaseService.getRegions(),
      databaseService.getStatesWithCounts()
    ]);

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main pages -->
  <url>
    <loc>${baseUrl}businesses</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}amenities</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}regions</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Business profile pages -->
  ${businesses.map(business => `
  <url>
    <loc>${baseUrl}business/${business.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  
  <!-- Category pages -->
  ${categories.filter(cat => cat.is_active).map(category => `
  <url>
    <loc>${baseUrl}category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  
  <!-- Amenity pages -->
  ${amenities.filter(amenity => amenity.is_active).map(amenity => `
  <url>
    <loc>${baseUrl}amenity/${amenity.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  
  <!-- State pages -->
  ${states.map(state => `
  <url>
    <loc>${baseUrl}state/${state.state.toLowerCase().replace(/\s+/g, '-')}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  
  <!-- Region pages -->
  ${regions.map(region => `
  <url>
    <loc>${baseUrl}region/${region.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
};