// Database optimization and performance tests
import { describe, it, expect } from 'vitest';
import { databaseService } from '../lib/database';
import type { BusinessFilters, Pagination } from '../lib/types';

describe('Database Optimization', () => {
  // Test query performance and optimization
  describe('Query Performance', () => {
    it('should execute basic business queries efficiently', async () => {
      const startTime = performance.now();
      const pagination: Pagination = { page: 1, limit: 20, offset: 0 };
      
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(Array.isArray(businesses)).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Basic business query took ${executionTime.toFixed(2)}ms`);
    });

    it('should execute filtered queries efficiently', async () => {
      const startTime = performance.now();
      const pagination: Pagination = { page: 1, limit: 20, offset: 0 };
      const filters: BusinessFilters = {
        featured_only: true,
        verified_only: true,
        rating_min: 3.0
      };
      
      const businesses = await databaseService.getBusinesses(filters, pagination);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(Array.isArray(businesses)).toBe(true);
      expect(executionTime).toBeLessThan(1500); // Should complete within 1.5 seconds
      
      console.log(`Filtered business query took ${executionTime.toFixed(2)}ms`);
    });

    it('should execute search queries efficiently', async () => {
      const startTime = performance.now();
      const pagination: Pagination = { page: 1, limit: 20, offset: 0 };
      
      const results = await databaseService.searchBusinesses('casino', {}, pagination);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(Array.isArray(results)).toBe(true);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Search query took ${executionTime.toFixed(2)}ms`);
    });

    it('should execute count queries efficiently', async () => {
      const startTime = performance.now();
      
      const count = await databaseService.getBusinessCount({});
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(typeof count).toBe('number');
      expect(executionTime).toBeLessThan(500); // Should complete within 0.5 seconds
      
      console.log(`Count query took ${executionTime.toFixed(2)}ms`);
    });

    it('should execute business detail queries efficiently', async () => {
      // First get a business slug to test with
      const pagination: Pagination = { page: 1, limit: 1, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      if (businesses.length > 0) {
        const startTime = performance.now();
        
        const detail = await databaseService.getBusinessBySlug(businesses[0].slug);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(detail).not.toBeNull();
        expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
        
        console.log(`Business detail query took ${executionTime.toFixed(2)}ms`);
      }
    });
  });

  // Test query result consistency
  describe('Query Consistency', () => {
    it('should return consistent results for repeated queries', async () => {
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      const filters: BusinessFilters = { featured_only: true };
      
      const [result1, result2, result3] = await Promise.all([
        databaseService.getBusinesses(filters, pagination),
        databaseService.getBusinesses(filters, pagination),
        databaseService.getBusinesses(filters, pagination)
      ]);
      
      expect(result1.length).toBe(result2.length);
      expect(result2.length).toBe(result3.length);
      
      // Results should be identical
      for (let i = 0; i < result1.length; i++) {
        expect(result1[i].id).toBe(result2[i].id);
        expect(result2[i].id).toBe(result3[i].id);
      }
    });

    it('should return consistent counts for repeated count queries', async () => {
      const filters: BusinessFilters = { verified_only: true };
      
      const [count1, count2, count3] = await Promise.all([
        databaseService.getBusinessCount(filters),
        databaseService.getBusinessCount(filters),
        databaseService.getBusinessCount(filters)
      ]);
      
      expect(count1).toBe(count2);
      expect(count2).toBe(count3);
    });
  });

  // Test complex filtering scenarios
  describe('Complex Filtering', () => {
    it('should handle multiple category filters efficiently', async () => {
      const categories = await databaseService.getCategories();
      
      if (categories.length >= 2) {
        const startTime = performance.now();
        const pagination: Pagination = { page: 1, limit: 20, offset: 0 };
        const filters: BusinessFilters = {
          categories: categories.slice(0, 2).map(c => c.id)
        };
        
        const businesses = await databaseService.getBusinesses(filters, pagination);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(Array.isArray(businesses)).toBe(true);
        expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
        
        console.log(`Multi-category filter query took ${executionTime.toFixed(2)}ms`);
      }
    });

    it('should handle combined filters efficiently', async () => {
      const [categories, amenities, regions] = await Promise.all([
        databaseService.getCategories(),
        databaseService.getAmenities(),
        databaseService.getRegions()
      ]);
      
      if (categories.length > 0 && amenities.length > 0 && regions.length > 0) {
        const startTime = performance.now();
        const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
        const filters: BusinessFilters = {
          categories: [categories[0].id],
          amenities: [amenities[0].id],
          regions: [regions[0].id],
          featured_only: true,
          rating_min: 3.0
        };
        
        const businesses = await databaseService.getBusinesses(filters, pagination);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(Array.isArray(businesses)).toBe(true);
        expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
        
        console.log(`Combined filters query took ${executionTime.toFixed(2)}ms`);
      }
    });
  });

  // Test pagination efficiency
  describe('Pagination Efficiency', () => {
    it('should handle large offset pagination efficiently', async () => {
      const totalCount = await databaseService.getBusinessCount({});
      
      if (totalCount > 100) {
        const startTime = performance.now();
        const pagination: Pagination = { page: 10, limit: 10, offset: 90 };
        
        const businesses = await databaseService.getBusinesses({}, pagination);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(Array.isArray(businesses)).toBe(true);
        expect(executionTime).toBeLessThan(1500); // Should complete within 1.5 seconds
        
        console.log(`Large offset pagination took ${executionTime.toFixed(2)}ms`);
      }
    });

    it('should maintain performance across different page sizes', async () => {
      const pageSizes = [5, 10, 20, 50];
      const results = [];
      
      for (const limit of pageSizes) {
        const startTime = performance.now();
        const pagination: Pagination = { page: 1, limit, offset: 0 };
        
        const businesses = await databaseService.getBusinesses({}, pagination);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        results.push({ limit, executionTime, resultCount: businesses.length });
        
        expect(Array.isArray(businesses)).toBe(true);
        expect(businesses.length).toBeLessThanOrEqual(limit);
        expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      }
      
      console.log('Page size performance:', results);
    });
  });

  // Test concurrent query handling
  describe('Concurrent Query Handling', () => {
    it('should handle multiple concurrent queries efficiently', async () => {
      const startTime = performance.now();
      const pagination: Pagination = { page: 1, limit: 10, offset: 0 };
      
      // Execute multiple queries concurrently
      const promises = [
        databaseService.getBusinesses({}, pagination),
        databaseService.getBusinesses({ featured_only: true }, pagination),
        databaseService.getBusinesses({ verified_only: true }, pagination),
        databaseService.getBusinessCount({}),
        databaseService.getBusinessCount({ featured_only: true }),
        databaseService.getCategories(),
        databaseService.getAmenities(),
        databaseService.getRegions()
      ];
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // All queries should complete successfully
      expect(results).toHaveLength(8);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
      
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`Concurrent queries took ${executionTime.toFixed(2)}ms`);
    });
  });

  // Test memory efficiency
  describe('Memory Efficiency', () => {
    it('should handle large result sets without memory issues', async () => {
      const totalCount = await databaseService.getBusinessCount({});
      
      if (totalCount > 0) {
        const largeLimit = Math.min(totalCount, 100); // Test with up to 100 businesses
        const pagination: Pagination = { page: 1, limit: largeLimit, offset: 0 };
        
        const startTime = performance.now();
        const businesses = await databaseService.getBusinesses({}, pagination);
        const endTime = performance.now();
        
        expect(Array.isArray(businesses)).toBe(true);
        expect(businesses.length).toBeLessThanOrEqual(largeLimit);
        
        // Check that each business has the expected structure
        businesses.forEach(business => {
          expect(business).toHaveProperty('id');
          expect(business).toHaveProperty('name');
          expect(business).toHaveProperty('slug');
          expect(business).toHaveProperty('categories');
          expect(Array.isArray(business.categories)).toBe(true);
        });
        
        const executionTime = endTime - startTime;
        console.log(`Large result set (${businesses.length} items) took ${executionTime.toFixed(2)}ms`);
      }
    });
  });
});