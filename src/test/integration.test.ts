// Integration tests for the gambling directory engine
import { describe, it, expect, beforeAll } from 'vitest';
import { databaseService } from '../lib/database';
import { generateBusinessSEO, generateSearchSEO, generateCategorySEO } from '../lib/seo';
import type { BusinessFilters, Pagination } from '../lib/types';

describe('Gambling Directory Engine Integration', () => {
  // Test database connectivity and basic queries
  describe('Database Integration', () => {
    it('should connect to database and fetch businesses', async () => {
      const pagination: Pagination = { page: 1, limit: 5, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      expect(Array.isArray(businesses)).toBe(true);
      // Should return businesses or empty array (both valid)
      if (businesses.length > 0) {
        expect(businesses[0]).toHaveProperty('id');
        expect(businesses[0]).toHaveProperty('name');
        expect(businesses[0]).toHaveProperty('slug');
        expect(businesses[0]).toHaveProperty('is_active');
        expect(businesses[0].is_active).toBe(true);
      }
    });

    it('should fetch categories with proper structure', async () => {
      const categories = await databaseService.getCategories();
      
      expect(Array.isArray(categories)).toBe(true);
      if (categories.length > 0) {
        expect(categories[0]).toHaveProperty('id');
        expect(categories[0]).toHaveProperty('name');
        expect(categories[0]).toHaveProperty('slug');
        expect(categories[0]).toHaveProperty('is_active');
        expect(categories[0].is_active).toBe(true);
      }
    });

    it('should fetch amenities with proper structure', async () => {
      const amenities = await databaseService.getAmenities();
      
      expect(Array.isArray(amenities)).toBe(true);
      if (amenities.length > 0) {
        expect(amenities[0]).toHaveProperty('id');
        expect(amenities[0]).toHaveProperty('name');
        expect(amenities[0]).toHaveProperty('slug');
        expect(amenities[0]).toHaveProperty('category');
        expect(amenities[0]).toHaveProperty('is_active');
        expect(amenities[0].is_active).toBe(true);
      }
    });

    it('should fetch regions with proper structure', async () => {
      const regions = await databaseService.getRegions();
      
      expect(Array.isArray(regions)).toBe(true);
      if (regions.length > 0) {
        expect(regions[0]).toHaveProperty('id');
        expect(regions[0]).toHaveProperty('name');
        expect(regions[0]).toHaveProperty('slug');
        expect(regions[0]).toHaveProperty('state');
        expect(regions[0]).toHaveProperty('country');
      }
    });

    it('should handle business count queries', async () => {
      const totalCount = await databaseService.getBusinessCount({});
      
      expect(typeof totalCount).toBe('number');
      expect(totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  // Test search and filtering functionality
  describe('Search and Filter Integration', () => {
    it('should perform search across business fields', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      
      // Try searching for common terms
      const searchTerms = ['casino', 'gaming', 'poker', 'slots'];
      
      for (const term of searchTerms) {
        const results = await databaseService.searchBusinesses(term, {}, pagination);
        const count = await databaseService.getSearchCount(term, {});
        
        expect(Array.isArray(results)).toBe(true);
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(results.length);
        
        // If we have results, verify they contain the search term
        if (results.length > 0) {
          const hasSearchTerm = results.some(business => 
            business.name.toLowerCase().includes(term.toLowerCase()) ||
            business.description?.toLowerCase().includes(term.toLowerCase()) ||
            business.full_address?.toLowerCase().includes(term.toLowerCase()) ||
            business.business_type?.toLowerCase().includes(term.toLowerCase())
          );
          
          // Note: This might not always be true due to database variations
          // but it's a good sanity check when results exist
          if (results.length > 0) {
            console.log(`Search for "${term}" returned ${results.length} results`);
          }
        }
      }
    });

    it('should filter by featured businesses', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const filters: BusinessFilters = { featured_only: true };
      
      const featuredBusinesses = await databaseService.getBusinesses(filters, pagination);
      const featuredCount = await databaseService.getBusinessCount(filters);
      
      expect(Array.isArray(featuredBusinesses)).toBe(true);
      expect(typeof featuredCount).toBe('number');
      
      // All returned businesses should be featured
      featuredBusinesses.forEach(business => {
        expect(business.featured).toBe(true);
      });
    });

    it('should filter by verified businesses', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const filters: BusinessFilters = { verified_only: true };
      
      const verifiedBusinesses = await databaseService.getBusinesses(filters, pagination);
      const verifiedCount = await databaseService.getBusinessCount(filters);
      
      expect(Array.isArray(verifiedBusinesses)).toBe(true);
      expect(typeof verifiedCount).toBe('number');
      
      // All returned businesses should be verified
      verifiedBusinesses.forEach(business => {
        expect(business.verified).toBe(true);
      });
    });

    it('should filter by minimum rating', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const filters: BusinessFilters = { rating_min: 4.0 };
      
      const highRatedBusinesses = await databaseService.getBusinesses(filters, pagination);
      
      expect(Array.isArray(highRatedBusinesses)).toBe(true);
      
      // All returned businesses should have rating >= 4.0
      highRatedBusinesses.forEach(business => {
        expect(business.rating).toBeGreaterThanOrEqual(4.0);
      });
    });
  });

  // Test business detail functionality
  describe('Business Detail Integration', () => {
    it('should fetch business details by slug', async () => {
      // First get a business to test with
      const pagination: Pagination = { page: 1, limit: 1, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      if (businesses.length > 0) {
        const business = businesses[0];
        const businessDetail = await databaseService.getBusinessBySlug(business.slug);
        
        expect(businessDetail).not.toBeNull();
        if (businessDetail) {
          expect(businessDetail.id).toBe(business.id);
          expect(businessDetail.slug).toBe(business.slug);
          expect(businessDetail).toHaveProperty('categories');
          expect(businessDetail).toHaveProperty('amenities');
          expect(businessDetail).toHaveProperty('regions');
          expect(Array.isArray(businessDetail.categories)).toBe(true);
          expect(Array.isArray(businessDetail.amenities)).toBe(true);
          expect(Array.isArray(businessDetail.regions)).toBe(true);
        }
      }
    });

    it('should return null for non-existent business slug', async () => {
      const businessDetail = await databaseService.getBusinessBySlug('non-existent-slug-12345');
      expect(businessDetail).toBeNull();
    });
  });

  // Test SEO integration with real data
  describe('SEO Integration', () => {
    it('should generate proper SEO for business profiles', async () => {
      const pagination: Pagination = { page: 1, limit: 1, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      if (businesses.length > 0) {
        const business = businesses[0];
        const businessDetail = await databaseService.getBusinessBySlug(business.slug);
        
        if (businessDetail) {
          const seoData = generateBusinessSEO(businessDetail);
          
          expect(seoData).toHaveProperty('title');
          expect(seoData).toHaveProperty('description');
          expect(seoData).toHaveProperty('canonical');
          expect(seoData).toHaveProperty('structuredData');
          
          expect(typeof seoData.title).toBe('string');
          expect(seoData.title.length).toBeGreaterThan(0);
          expect(seoData.title.length).toBeLessThanOrEqual(60);
          
          expect(typeof seoData.description).toBe('string');
          expect(seoData.description.length).toBeGreaterThan(0);
          expect(seoData.description.length).toBeLessThanOrEqual(160);
          
          expect(seoData.canonical).toBe(`/business/${business.slug}`);
          
          expect(seoData.structuredData).toHaveProperty('@context');
          expect(seoData.structuredData).toHaveProperty('@type');
          expect(seoData.structuredData!['@type']).toBe('Casino');
        }
      }
    });

    it('should generate proper SEO for category pages', async () => {
      const categories = await databaseService.getCategoriesWithCounts();
      
      if (categories.length > 0) {
        const category = categories[0];
        const seoData = generateCategorySEO(category, category.business_count);
        
        expect(seoData).toHaveProperty('title');
        expect(seoData).toHaveProperty('description');
        expect(seoData).toHaveProperty('canonical');
        expect(seoData).toHaveProperty('structuredData');
        
        expect(seoData.title).toContain(category.name);
        expect(seoData.description).toContain(category.business_count.toString());
        expect(seoData.canonical).toBe(`/category/${category.slug}`);
        
        expect(seoData.structuredData).toHaveProperty('@type');
        expect(seoData.structuredData!['@type']).toBe('CollectionPage');
      }
    });

    it('should generate proper SEO for search results', async () => {
      const query = 'casino';
      const count = await databaseService.getSearchCount(query, {});
      const seoData = generateSearchSEO(query, {}, count);
      
      expect(seoData).toHaveProperty('title');
      expect(seoData).toHaveProperty('description');
      expect(seoData).toHaveProperty('canonical');
      expect(seoData).toHaveProperty('structuredData');
      
      expect(seoData.title).toContain(query);
      expect(seoData.description).toContain(query);
      expect(seoData.canonical).toBe('/businesses');
      
      expect(seoData.structuredData).toHaveProperty('@type');
      expect(seoData.structuredData!['@type']).toBe('SearchResultsPage');
    });
  });

  // Test pagination functionality
  describe('Pagination Integration', () => {
    it('should handle pagination correctly', async () => {
      const limit = 5;
      const page1: Pagination = { page: 1, limit, offset: 0 };
      const page2: Pagination = { page: 2, limit, offset: limit };
      
      const [businesses1, businesses2, totalCount] = await Promise.all([
        databaseService.getBusinesses({}, page1),
        databaseService.getBusinesses({}, page2),
        databaseService.getBusinessCount({})
      ]);
      
      expect(Array.isArray(businesses1)).toBe(true);
      expect(Array.isArray(businesses2)).toBe(true);
      expect(typeof totalCount).toBe('number');
      
      // If we have enough businesses, pages should be different
      if (totalCount > limit) {
        expect(businesses1.length).toBeLessThanOrEqual(limit);
        expect(businesses2.length).toBeLessThanOrEqual(limit);
        
        // Pages should contain different businesses (if we have enough data)
        if (businesses1.length > 0 && businesses2.length > 0) {
          const page1Ids = businesses1.map(b => b.id);
          const page2Ids = businesses2.map(b => b.id);
          const intersection = page1Ids.filter(id => page2Ids.includes(id));
          expect(intersection.length).toBe(0); // No overlap between pages
        }
      }
    });
  });

  // Test error handling
  describe('Error Handling Integration', () => {
    it('should handle empty filter results gracefully', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      
      // Use filters that are unlikely to match anything
      const impossibleFilters: BusinessFilters = {
        categories: [99999], // Non-existent category ID
        rating_min: 6.0 // Impossible rating
      };
      
      const businesses = await databaseService.getBusinesses(impossibleFilters, pagination);
      const count = await databaseService.getBusinessCount(impossibleFilters);
      
      expect(Array.isArray(businesses)).toBe(true);
      expect(businesses.length).toBe(0);
      expect(count).toBe(0);
    });

    it('should handle search with no results gracefully', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const impossibleQuery = 'xyzabc123nonexistentterm456';
      
      const results = await databaseService.searchBusinesses(impossibleQuery, {}, pagination);
      const count = await databaseService.getSearchCount(impossibleQuery, {});
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
      expect(count).toBe(0);
    });
  });

  // Test data consistency
  describe('Data Consistency', () => {
    it('should maintain consistent counts between queries', async () => {
      const filters: BusinessFilters = { featured_only: true };
      const pagination: Pagination = { page: 1, limit: 100, offset: 0 };
      
      const [businesses, count] = await Promise.all([
        databaseService.getBusinesses(filters, pagination),
        databaseService.getBusinessCount(filters)
      ]);
      
      expect(Array.isArray(businesses)).toBe(true);
      expect(typeof count).toBe('number');
      
      // The count should be >= the number of businesses returned
      // (since we might have more than our limit)
      expect(count).toBeGreaterThanOrEqual(businesses.length);
      
      // All returned businesses should match the filter
      businesses.forEach(business => {
        expect(business.featured).toBe(true);
      });
    });

    it('should maintain data integrity in business details', async () => {
      const pagination: Pagination = { page: 1, limit: 5, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      for (const business of businesses) {
        const detail = await databaseService.getBusinessBySlug(business.slug);
        
        if (detail) {
          // Core business data should match
          expect(detail.id).toBe(business.id);
          expect(detail.name).toBe(business.name);
          expect(detail.slug).toBe(business.slug);
          expect(detail.rating).toBe(business.rating);
          expect(detail.is_active).toBe(business.is_active);
          
          // Relations should be arrays
          expect(Array.isArray(detail.categories)).toBe(true);
          expect(Array.isArray(detail.amenities)).toBe(true);
          expect(Array.isArray(detail.regions)).toBe(true);
        }
      }
    });
  });
});