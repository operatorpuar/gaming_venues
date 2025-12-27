// SEO integration tests to verify metadata generation across all page types
import { describe, it, expect } from 'vitest';
import { 
  generateBusinessSEO, 
  generateCategorySEO, 
  generateRegionSEO, 
  generateAmenitySEO,
  generateSearchSEO,
  generateBreadcrumbStructuredData,
  sanitizeForSEO 
} from '../lib/seo';
import { databaseService } from '../lib/database';
import type { BusinessDetail, Category, Region } from '../lib/types';

describe('SEO Integration Tests', () => {
  // Test business profile SEO generation
  describe('Business Profile SEO', () => {
    it('should generate complete SEO metadata for business profiles', async () => {
      const businesses = await databaseService.getBusinesses({}, { page: 1, limit: 1, offset: 0 });
      
      if (businesses.length > 0) {
        const businessDetail = await databaseService.getBusinessBySlug(businesses[0].slug);
        
        if (businessDetail) {
          const seoData = generateBusinessSEO(businessDetail);
          
          // Verify all required SEO fields are present
          expect(seoData.title).toBeDefined();
          expect(seoData.description).toBeDefined();
          expect(seoData.canonical).toBeDefined();
          expect(seoData.image).toBeDefined();
          expect(seoData.structuredData).toBeDefined();
          
          // Verify title length and content
          expect(seoData.title.length).toBeGreaterThan(10);
          expect(seoData.title.length).toBeLessThanOrEqual(60);
          expect(seoData.title).toContain(businessDetail.name);
          
          // Verify description length and content
          expect(seoData.description.length).toBeGreaterThan(50);
          expect(seoData.description.length).toBeLessThanOrEqual(160);
          expect(seoData.description).toContain(businessDetail.name);
          
          // Verify canonical URL format
          expect(seoData.canonical).toBe(`/business/${businessDetail.slug}`);
          
          // Verify structured data
          expect(seoData.structuredData!['@context']).toBe('https://schema.org');
          expect(seoData.structuredData!['@type']).toBe('Casino');
          expect(seoData.structuredData!.name).toBe(businessDetail.name);
          
          // Verify address structure
          expect(seoData.structuredData!.address).toBeDefined();
          expect(seoData.structuredData!.address['@type']).toBe('PostalAddress');
          expect(seoData.structuredData!.address.addressLocality).toBe(businessDetail.city);
          expect(seoData.structuredData!.address.addressRegion).toBe(businessDetail.state);
          
          // Verify rating structure if present
          if (businessDetail.rating > 0 && businessDetail.reviews_count > 0) {
            expect(seoData.structuredData!.aggregateRating).toBeDefined();
            expect(seoData.structuredData!.aggregateRating['@type']).toBe('AggregateRating');
            expect(seoData.structuredData!.aggregateRating.ratingValue).toBe(businessDetail.rating);
            expect(seoData.structuredData!.aggregateRating.reviewCount).toBe(businessDetail.reviews_count);
          }
          
          // Verify geo coordinates if present
          if (businessDetail.lat && businessDetail.lng) {
            expect(seoData.structuredData!.geo).toBeDefined();
            expect(seoData.structuredData!.geo['@type']).toBe('GeoCoordinates');
            expect(seoData.structuredData!.geo.latitude).toBe(businessDetail.lat);
            expect(seoData.structuredData!.geo.longitude).toBe(businessDetail.lng);
          }
        }
      }
    });

    it('should use custom meta fields when available', async () => {
      // Create a mock business with custom meta fields
      const businessWithCustomMeta: BusinessDetail = {
        id: 999,
        cid: 'custom-test',
        name: 'Custom Meta Casino',
        slug: 'custom-meta-casino',
        rating: 4.0,
        reviews_count: 50,
        full_address: '123 Custom St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        phone: '555-0000',
        website: 'https://custom.com',
        image_url: 'https://custom.com/image.jpg',
        lat: 40.0,
        lng: -120.0,
        maps_url: 'https://maps.google.com/custom',
        business_type: 'Casino',
        description: 'A test casino with custom meta fields',
        is_active: true,
        featured: false,
        verified: false,
        meta_title: 'Custom SEO Title for Casino',
        meta_description: 'Custom SEO description for this amazing casino with great games.',
        created_at: new Date(),
        updated_at: new Date(),
        categories: [],
        amenities: [],
        regions: []
      };
      
      const seoData = generateBusinessSEO(businessWithCustomMeta);
      
      expect(seoData.title).toBe('Custom SEO Title for Casino');
      expect(seoData.description).toBe('Custom SEO description for this amazing casino with great games.');
    });

    it('should generate fallback meta when custom fields are empty', async () => {
      // Create a mock business without custom meta fields
      const businessWithoutCustomMeta: BusinessDetail = {
        id: 998,
        cid: 'fallback-test',
        name: 'Fallback Casino',
        slug: 'fallback-casino',
        rating: 3.5,
        reviews_count: 25,
        full_address: '456 Fallback Ave',
        city: 'Fallback City',
        state: 'FB',
        zip_code: '54321',
        phone: '555-1111',
        website: 'https://fallback.com',
        image_url: 'https://fallback.com/image.jpg',
        lat: 35.0,
        lng: -110.0,
        maps_url: 'https://maps.google.com/fallback',
        business_type: 'Gaming Hall',
        description: 'A cozy gaming hall with friendly staff and good odds for all players.',
        is_active: true,
        featured: true,
        verified: true,
        meta_title: '',
        meta_description: '',
        created_at: new Date(),
        updated_at: new Date(),
        categories: [],
        amenities: [],
        regions: []
      };
      
      const seoData = generateBusinessSEO(businessWithoutCustomMeta);
      
      expect(seoData.title).toContain('Fallback Casino');
      expect(seoData.title).toContain('Fallback City');
      expect(seoData.title).toContain('FB');
      
      expect(seoData.description).toContain('Fallback Casino');
      expect(seoData.description).toContain('Gaming Hall');
      expect(seoData.description).toContain('3.5 stars');
      expect(seoData.description).toContain('25 reviews');
    });
  });

  // Test category page SEO generation
  describe('Category Page SEO', () => {
    it('should generate complete SEO metadata for category pages', async () => {
      const categoriesWithCounts = await databaseService.getCategoriesWithCounts();
      
      if (categoriesWithCounts.length > 0) {
        const category = categoriesWithCounts[0];
        const seoData = generateCategorySEO(category, category.business_count);
        
        // Verify all required SEO fields are present
        expect(seoData.title).toBeDefined();
        expect(seoData.description).toBeDefined();
        expect(seoData.canonical).toBeDefined();
        expect(seoData.structuredData).toBeDefined();
        
        // Verify title content and length
        expect(seoData.title).toContain(category.name);
        expect(seoData.title.length).toBeGreaterThan(10);
        expect(seoData.title.length).toBeLessThanOrEqual(60);
        
        // Verify description content and length
        expect(seoData.description).toContain(category.business_count.toString());
        expect(seoData.description).toContain(category.name.toLowerCase());
        expect(seoData.description.length).toBeGreaterThan(50);
        expect(seoData.description.length).toBeLessThanOrEqual(160);
        
        // Verify canonical URL
        expect(seoData.canonical).toBe(`/category/${category.slug}`);
        
        // Verify structured data
        expect(seoData.structuredData!['@context']).toBe('https://schema.org');
        expect(seoData.structuredData!['@type']).toBe('CollectionPage');
        expect(seoData.structuredData!.name).toBe(seoData.title);
        expect(seoData.structuredData!.mainEntity.numberOfItems).toBe(category.business_count);
      }
    });
  });

  // Test region page SEO generation
  describe('Region Page SEO', () => {
    it('should generate complete SEO metadata for region pages', async () => {
      const regionsWithCounts = await databaseService.getRegionsWithCounts();
      
      if (regionsWithCounts.length > 0) {
        const region = regionsWithCounts[0];
        const seoData = generateRegionSEO(region, region.business_count);
        
        // Verify all required SEO fields are present
        expect(seoData.title).toBeDefined();
        expect(seoData.description).toBeDefined();
        expect(seoData.canonical).toBeDefined();
        expect(seoData.structuredData).toBeDefined();
        
        // Verify title content and length
        expect(seoData.title).toContain(region.name);
        expect(seoData.title).toContain(region.state);
        expect(seoData.title.length).toBeGreaterThan(10);
        expect(seoData.title.length).toBeLessThanOrEqual(60);
        
        // Verify description content and length
        expect(seoData.description).toContain(region.business_count.toString());
        expect(seoData.description).toContain(region.name);
        expect(seoData.description).toContain(region.state);
        expect(seoData.description.length).toBeGreaterThan(50);
        expect(seoData.description.length).toBeLessThanOrEqual(160);
        
        // Verify canonical URL
        expect(seoData.canonical).toBe(`/region/${region.slug}`);
        
        // Verify structured data
        expect(seoData.structuredData!['@context']).toBe('https://schema.org');
        expect(seoData.structuredData!['@type']).toBe('CollectionPage');
        expect(seoData.structuredData!.about.name).toBe(region.name);
        expect(seoData.structuredData!.about.containedInPlace.name).toBe(region.state);
        expect(seoData.structuredData!.mainEntity.numberOfItems).toBe(region.business_count);
      }
    });
  });

  // Test amenity page SEO generation
  describe('Amenity Page SEO', () => {
    it('should generate complete SEO metadata for amenity pages', async () => {
      const amenitiesWithCounts = await databaseService.getAmenitiesWithCounts();
      
      if (amenitiesWithCounts.length > 0) {
        const amenity = amenitiesWithCounts[0];
        const seoData = generateAmenitySEO(amenity, amenity.business_count);
        
        // Verify all required SEO fields are present
        expect(seoData.title).toBeDefined();
        expect(seoData.description).toBeDefined();
        expect(seoData.canonical).toBeDefined();
        expect(seoData.structuredData).toBeDefined();
        
        // Verify title content and length
        expect(seoData.title).toContain(amenity.name);
        expect(seoData.title.length).toBeGreaterThan(10);
        expect(seoData.title.length).toBeLessThanOrEqual(60);
        
        // Verify description content and length
        expect(seoData.description).toContain(amenity.business_count.toString());
        expect(seoData.description).toContain(amenity.name.toLowerCase());
        expect(seoData.description.length).toBeGreaterThan(50);
        expect(seoData.description.length).toBeLessThanOrEqual(160);
        
        // Verify canonical URL
        expect(seoData.canonical).toBe(`/amenity/${amenity.slug}`);
        
        // Verify structured data
        expect(seoData.structuredData!['@context']).toBe('https://schema.org');
        expect(seoData.structuredData!['@type']).toBe('CollectionPage');
        expect(seoData.structuredData!.about.name).toBe(amenity.name);
        expect(seoData.structuredData!.about.category).toBe(amenity.category);
        expect(seoData.structuredData!.mainEntity.numberOfItems).toBe(amenity.business_count);
      }
    });
  });

  // Test search results SEO generation
  describe('Search Results SEO', () => {
    it('should generate SEO metadata for search queries', async () => {
      const query = 'casino';
      const searchCount = await databaseService.getSearchCount(query, {});
      const seoData = generateSearchSEO(query, {}, searchCount);
      
      // Verify all required SEO fields are present
      expect(seoData.title).toBeDefined();
      expect(seoData.description).toBeDefined();
      expect(seoData.canonical).toBeDefined();
      expect(seoData.structuredData).toBeDefined();
      
      // Verify title content
      expect(seoData.title).toContain(query);
      expect(seoData.title).toContain('Search Results');
      
      // Verify description content
      expect(seoData.description).toContain(query);
      expect(seoData.description).toContain(searchCount.toString());
      
      // Verify canonical URL
      expect(seoData.canonical).toBe('/businesses');
      
      // Verify structured data
      expect(seoData.structuredData!['@context']).toBe('https://schema.org');
      expect(seoData.structuredData!['@type']).toBe('SearchResultsPage');
      expect(seoData.structuredData!.mainEntity.numberOfItems).toBe(searchCount);
    });

    it('should generate SEO metadata for filtered results', async () => {
      const filters = { featured_only: true, verified_only: true };
      const filteredCount = await databaseService.getBusinessCount(filters);
      const seoData = generateSearchSEO(undefined, filters, filteredCount);
      
      expect(seoData.title).toContain('Filtered');
      expect(seoData.description).toContain(filteredCount.toString());
      expect(seoData.structuredData!.mainEntity.numberOfItems).toBe(filteredCount);
    });

    it('should generate default SEO metadata for no query or filters', async () => {
      const seoData = generateSearchSEO();
      
      expect(seoData.title).toBe('Gaming Venues Directory');
      expect(seoData.description).toBe('Discover the best gambling establishments and gaming venues');
      expect(seoData.canonical).toBe('/businesses');
    });
  });

  // Test breadcrumb structured data generation
  describe('Breadcrumb Structured Data', () => {
    it('should generate proper breadcrumb structured data', () => {
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'All Venues', url: '/businesses' },
        { name: 'Test Casino', url: '/business/test-casino' }
      ];
      
      const structuredData = generateBreadcrumbStructuredData(breadcrumbs);
      
      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('BreadcrumbList');
      expect(structuredData.itemListElement).toHaveLength(3);
      
      structuredData.itemListElement.forEach((item: any, index: number) => {
        expect(item['@type']).toBe('ListItem');
        expect(item.position).toBe(index + 1);
        expect(item.name).toBe(breadcrumbs[index].name);
        expect(item.item).toBe(breadcrumbs[index].url);
      });
    });
  });

  // Test text sanitization for SEO
  describe('Text Sanitization', () => {
    it('should sanitize HTML tags from text', () => {
      const htmlText = '<p>This is <strong>bold</strong> text with <a href="#">links</a></p>';
      const sanitized = sanitizeForSEO(htmlText);
      
      expect(sanitized).toBe('This is bold text with links');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should truncate long text at word boundaries', () => {
      const longText = 'This is a very long text that exceeds the maximum length limit and should be truncated properly at word boundaries to ensure good SEO practices and readability for users and search engines alike.';
      const sanitized = sanitizeForSEO(longText, 100);
      
      expect(sanitized.length).toBeLessThanOrEqual(100);
      expect(sanitized).toMatch(/\.\.\.$/);
      expect(sanitized).not.toMatch(/\s\.\.\.$/);
    });

    it('should handle empty or short text', () => {
      expect(sanitizeForSEO('')).toBe('');
      expect(sanitizeForSEO('Short text')).toBe('Short text');
    });

    it('should normalize whitespace', () => {
      const messyText = '  This   has    lots\n\nof   whitespace  ';
      const sanitized = sanitizeForSEO(messyText);
      
      expect(sanitized).toBe('This has lots of whitespace');
    });
  });

  // Test SEO metadata consistency across different data scenarios
  describe('SEO Metadata Consistency', () => {
    it('should handle businesses with missing optional fields', async () => {
      // Create a business with minimal data
      const minimalBusiness: BusinessDetail = {
        id: 997,
        cid: 'minimal-test',
        name: 'Minimal Casino',
        slug: 'minimal-casino',
        rating: 0,
        reviews_count: 0,
        full_address: '',
        city: 'Unknown',
        state: 'UN',
        zip_code: '',
        phone: '',
        website: '',
        image_url: '',
        lat: 0,
        lng: 0,
        maps_url: '',
        business_type: '',
        description: '',
        is_active: true,
        featured: false,
        verified: false,
        meta_title: '',
        meta_description: '',
        created_at: new Date(),
        updated_at: new Date(),
        categories: [],
        amenities: [],
        regions: []
      };
      
      const seoData = generateBusinessSEO(minimalBusiness);
      
      // Should still generate valid SEO data
      expect(seoData.title).toBeDefined();
      expect(seoData.title.length).toBeGreaterThan(0);
      expect(seoData.description).toBeDefined();
      expect(seoData.description.length).toBeGreaterThan(0);
      expect(seoData.canonical).toBe('/business/minimal-casino');
      expect(seoData.structuredData).toBeDefined();
      
      // Should handle missing rating gracefully
      expect(seoData.structuredData!.aggregateRating).toBeUndefined();
      
      // Should handle missing coordinates gracefully
      expect(seoData.structuredData!.geo).toBeUndefined();
    });

    it('should generate consistent URLs across all page types', async () => {
      const [categories, regions, amenities] = await Promise.all([
        databaseService.getCategories(),
        databaseService.getRegions(),
        databaseService.getAmenities()
      ]);
      
      // Test category URLs
      if (categories.length > 0) {
        const categorySEO = generateCategorySEO(categories[0], 10);
        expect(categorySEO.canonical).toMatch(/^\/category\/[a-z0-9-]+$/);
      }
      
      // Test region URLs
      if (regions.length > 0) {
        const regionSEO = generateRegionSEO(regions[0], 5);
        expect(regionSEO.canonical).toMatch(/^\/region\/[a-z0-9-]+$/);
      }
      
      // Test amenity URLs
      if (amenities.length > 0) {
        const amenitySEO = generateAmenitySEO(amenities[0], 3);
        expect(amenitySEO.canonical).toMatch(/^\/amenity\/[a-z0-9-]+$/);
      }
      
      // Test search URLs
      const searchSEO = generateSearchSEO('test');
      expect(searchSEO.canonical).toBe('/businesses');
    });
  });
});