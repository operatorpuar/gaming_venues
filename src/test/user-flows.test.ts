// End-to-end user flow tests
import { describe, it, expect } from 'vitest';
import { databaseService } from '../lib/database';
import { generateBusinessSEO, generateSearchSEO, generateCategorySEO, generateRegionSEO } from '../lib/seo';
import type { BusinessFilters, Pagination } from '../lib/types';

describe('User Flow Integration Tests', () => {
  // Test the complete homepage → search → business detail flow
  describe('Homepage to Business Detail Flow', () => {
    it('should support complete user journey from homepage to business detail', async () => {
      // Step 1: Homepage - Get featured businesses
      const featuredFilters: BusinessFilters = { featured_only: true };
      const homepagePagination: Pagination = { page: 1, limit: 8, offset: 0 };
      
      const [featuredBusinesses, totalBusinesses, totalCategories] = await Promise.all([
        databaseService.getBusinesses(featuredFilters, homepagePagination),
        databaseService.getBusinessCount({}),
        databaseService.getCategories().then(cats => cats.filter(c => c.is_active).length)
      ]);
      
      expect(Array.isArray(featuredBusinesses)).toBe(true);
      expect(typeof totalBusinesses).toBe('number');
      expect(typeof totalCategories).toBe('number');
      
      // All featured businesses should have featured flag
      featuredBusinesses.forEach(business => {
        expect(business.featured).toBe(true);
        expect(business.is_active).toBe(true);
      });
      
      // Step 2: User searches from homepage
      if (featuredBusinesses.length > 0) {
        const searchQuery = featuredBusinesses[0].name.split(' ')[0]; // Use first word of business name
        const searchPagination: Pagination = { page: 1, limit: 12, offset: 0 };
        
        const [searchResults, searchCount] = await Promise.all([
          databaseService.searchBusinesses(searchQuery, {}, searchPagination),
          databaseService.getSearchCount(searchQuery, {})
        ]);
        
        expect(Array.isArray(searchResults)).toBe(true);
        expect(typeof searchCount).toBe('number');
        expect(searchCount).toBeGreaterThanOrEqual(searchResults.length);
        
        // Generate SEO for search results
        const searchSEO = generateSearchSEO(searchQuery, {}, searchCount);
        expect(searchSEO.title).toContain(searchQuery);
        expect(searchSEO.description).toContain(searchQuery);
        
        // Step 3: User clicks on a business from search results
        if (searchResults.length > 0) {
          const selectedBusiness = searchResults[0];
          const businessDetail = await databaseService.getBusinessBySlug(selectedBusiness.slug);
          
          expect(businessDetail).not.toBeNull();
          if (businessDetail) {
            expect(businessDetail.id).toBe(selectedBusiness.id);
            expect(businessDetail.slug).toBe(selectedBusiness.slug);
            expect(Array.isArray(businessDetail.categories)).toBe(true);
            expect(Array.isArray(businessDetail.amenities)).toBe(true);
            expect(Array.isArray(businessDetail.regions)).toBe(true);
            
            // Generate SEO for business detail
            const businessSEO = generateBusinessSEO(businessDetail);
            expect(businessSEO.title).toContain(businessDetail.name);
            expect(businessSEO.canonical).toBe(`/business/${businessDetail.slug}`);
            expect(businessSEO.structuredData).toHaveProperty('@type', 'Casino');
          }
        }
      }
    });
  });

  // Test the category browsing flow
  describe('Category Browsing Flow', () => {
    it('should support complete category browsing journey', async () => {
      // Step 1: Get all categories for category listing page
      const categoriesWithCounts = await databaseService.getCategoriesWithCounts();
      
      expect(Array.isArray(categoriesWithCounts)).toBe(true);
      
      if (categoriesWithCounts.length > 0) {
        // Step 2: User selects a category
        const selectedCategory = categoriesWithCounts[0];
        expect(selectedCategory).toHaveProperty('business_count');
        expect(typeof selectedCategory.business_count).toBe('number');
        
        // Generate SEO for category page
        const categorySEO = generateCategorySEO(selectedCategory, selectedCategory.business_count);
        expect(categorySEO.title).toContain(selectedCategory.name);
        expect(categorySEO.canonical).toBe(`/category/${selectedCategory.slug}`);
        
        // Step 3: Get businesses in this category
        const categoryFilters: BusinessFilters = { categories: [selectedCategory.id] };
        const categoryPagination: Pagination = { page: 1, limit: 12, offset: 0 };
        
        const [categoryBusinesses, categoryCount] = await Promise.all([
          databaseService.getBusinesses(categoryFilters, categoryPagination),
          databaseService.getBusinessCount(categoryFilters)
        ]);
        
        expect(Array.isArray(categoryBusinesses)).toBe(true);
        expect(typeof categoryCount).toBe('number');
        expect(categoryCount).toBe(selectedCategory.business_count);
        
        // Step 4: User selects a business from category
        if (categoryBusinesses.length > 0) {
          const businessInCategory = categoryBusinesses[0];
          const businessDetail = await databaseService.getBusinessBySlug(businessInCategory.slug);
          
          expect(businessDetail).not.toBeNull();
          if (businessDetail) {
            // Verify the business actually belongs to this category
            const businessCategoryIds = businessDetail.categories.map(c => c.id);
            expect(businessCategoryIds).toContain(selectedCategory.id);
          }
        }
      }
    });
  });

  // Test the regional browsing flow
  describe('Regional Browsing Flow', () => {
    it('should support complete regional browsing journey', async () => {
      // Step 1: Get states with counts for state listing
      const statesWithCounts = await databaseService.getStatesWithCounts();
      
      expect(Array.isArray(statesWithCounts)).toBe(true);
      
      if (statesWithCounts.length > 0) {
        // Step 2: User selects a state
        const selectedState = statesWithCounts[0];
        expect(selectedState).toHaveProperty('state');
        expect(selectedState).toHaveProperty('business_count');
        expect(selectedState).toHaveProperty('region_count');
        
        // Step 3: Get regions in this state
        const regionsInState = await databaseService.getRegionsByState(selectedState.state);
        
        expect(Array.isArray(regionsInState)).toBe(true);
        expect(regionsInState.length).toBe(selectedState.region_count);
        
        if (regionsInState.length > 0) {
          // Step 4: User selects a region
          const selectedRegion = regionsInState[0];
          expect(selectedRegion).toHaveProperty('business_count');
          
          // Generate SEO for region page
          const regionSEO = generateRegionSEO(selectedRegion, selectedRegion.business_count);
          expect(regionSEO.title).toContain(selectedRegion.name);
          expect(regionSEO.canonical).toBe(`/region/${selectedRegion.slug}`);
          
          // Step 5: Get businesses in this region
          const regionFilters: BusinessFilters = { regions: [selectedRegion.id] };
          const regionPagination: Pagination = { page: 1, limit: 12, offset: 0 };
          
          const [regionBusinesses, regionCount] = await Promise.all([
            databaseService.getBusinesses(regionFilters, regionPagination),
            databaseService.getBusinessCount(regionFilters)
          ]);
          
          expect(Array.isArray(regionBusinesses)).toBe(true);
          expect(typeof regionCount).toBe('number');
          expect(regionCount).toBe(selectedRegion.business_count);
          
          // Step 6: User selects a business from region
          if (regionBusinesses.length > 0) {
            const businessInRegion = regionBusinesses[0];
            const businessDetail = await databaseService.getBusinessBySlug(businessInRegion.slug);
            
            expect(businessDetail).not.toBeNull();
            if (businessDetail) {
              // Verify the business actually belongs to this region
              const businessRegionIds = businessDetail.regions.map(r => r.id);
              expect(businessRegionIds).toContain(selectedRegion.id);
            }
          }
        }
      }
    });
  });

  // Test the search and filter flow
  describe('Search and Filter Flow', () => {
    it('should support complete search and filter journey', async () => {
      // Step 1: Get filter options for search form
      const [categories, amenities, regions] = await Promise.all([
        databaseService.getCategories(),
        databaseService.getAmenities(),
        databaseService.getRegions()
      ]);
      
      expect(Array.isArray(categories)).toBe(true);
      expect(Array.isArray(amenities)).toBe(true);
      expect(Array.isArray(regions)).toBe(true);
      
      // Step 2: User performs a search with filters
      const searchQuery = 'casino';
      const searchFilters: BusinessFilters = {
        featured_only: true,
        rating_min: 3.0
      };
      
      // Add category filter if available
      if (categories.length > 0) {
        searchFilters.categories = [categories[0].id];
      }
      
      const searchPagination: Pagination = { page: 1, limit: 12, offset: 0 };
      
      const [searchResults, searchCount] = await Promise.all([
        databaseService.searchBusinesses(searchQuery, searchFilters, searchPagination),
        databaseService.getSearchCount(searchQuery, searchFilters)
      ]);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(typeof searchCount).toBe('number');
      expect(searchCount).toBeGreaterThanOrEqual(searchResults.length);
      
      // Verify all results match the filters
      searchResults.forEach(business => {
        expect(business.featured).toBe(true); // featured_only filter
        expect(business.rating).toBeGreaterThanOrEqual(3.0); // rating_min filter
        expect(business.is_active).toBe(true); // Always active
      });
      
      // Step 3: User refines search with additional filters
      if (amenities.length > 0) {
        const refinedFilters: BusinessFilters = {
          ...searchFilters,
          amenities: [amenities[0].id]
        };
        
        const [refinedResults, refinedCount] = await Promise.all([
          databaseService.searchBusinesses(searchQuery, refinedFilters, searchPagination),
          databaseService.getSearchCount(searchQuery, refinedFilters)
        ]);
        
        expect(Array.isArray(refinedResults)).toBe(true);
        expect(typeof refinedCount).toBe('number');
        expect(refinedCount).toBeLessThanOrEqual(searchCount); // Should be more restrictive
      }
      
      // Step 4: User navigates through pagination
      if (searchCount > 12) {
        const page2Pagination: Pagination = { page: 2, limit: 12, offset: 12 };
        const page2Results = await databaseService.searchBusinesses(searchQuery, searchFilters, page2Pagination);
        
        expect(Array.isArray(page2Results)).toBe(true);
        
        // Verify no overlap between pages
        if (searchResults.length > 0 && page2Results.length > 0) {
          const page1Ids = searchResults.map(b => b.id);
          const page2Ids = page2Results.map(b => b.id);
          const intersection = page1Ids.filter(id => page2Ids.includes(id));
          expect(intersection.length).toBe(0);
        }
      }
    });
  });

  // Test the amenity browsing flow
  describe('Amenity Browsing Flow', () => {
    it('should support complete amenity browsing journey', async () => {
      // Step 1: Get amenities with counts for amenity listing page
      const amenitiesWithCounts = await databaseService.getAmenitiesWithCounts();
      
      expect(Array.isArray(amenitiesWithCounts)).toBe(true);
      
      if (amenitiesWithCounts.length > 0) {
        // Step 2: User selects an amenity
        const selectedAmenity = amenitiesWithCounts[0];
        expect(selectedAmenity).toHaveProperty('business_count');
        expect(typeof selectedAmenity.business_count).toBe('number');
        
        // Step 3: Get businesses with this amenity
        const amenityFilters: BusinessFilters = { amenities: [selectedAmenity.id] };
        const amenityPagination: Pagination = { page: 1, limit: 12, offset: 0 };
        
        const [amenityBusinesses, amenityCount] = await Promise.all([
          databaseService.getBusinesses(amenityFilters, amenityPagination),
          databaseService.getBusinessCount(amenityFilters)
        ]);
        
        expect(Array.isArray(amenityBusinesses)).toBe(true);
        expect(typeof amenityCount).toBe('number');
        expect(amenityCount).toBe(selectedAmenity.business_count);
        
        // Step 4: User selects a business with this amenity
        if (amenityBusinesses.length > 0) {
          const businessWithAmenity = amenityBusinesses[0];
          const businessDetail = await databaseService.getBusinessBySlug(businessWithAmenity.slug);
          
          expect(businessDetail).not.toBeNull();
          if (businessDetail) {
            // Verify the business actually has this amenity
            const businessAmenityIds = businessDetail.amenities.map(a => a.id);
            expect(businessAmenityIds).toContain(selectedAmenity.id);
          }
        }
      }
    });
  });

  // Test error handling in user flows
  describe('Error Handling in User Flows', () => {
    it('should handle invalid business slug gracefully', async () => {
      const invalidSlug = 'non-existent-business-slug-12345';
      const businessDetail = await databaseService.getBusinessBySlug(invalidSlug);
      
      expect(businessDetail).toBeNull();
    });

    it('should handle empty search results gracefully', async () => {
      const impossibleQuery = 'xyzabc123impossiblequery456';
      const pagination: Pagination = { page: 1, limit: 12, offset: 0 };
      
      const [searchResults, searchCount] = await Promise.all([
        databaseService.searchBusinesses(impossibleQuery, {}, pagination),
        databaseService.getSearchCount(impossibleQuery, {})
      ]);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
      expect(searchCount).toBe(0);
      
      // SEO should still work for empty results
      const searchSEO = generateSearchSEO(impossibleQuery, {}, searchCount);
      expect(searchSEO.title).toContain(impossibleQuery);
      expect(searchSEO.description).toContain(impossibleQuery);
    });

    it('should handle invalid filter combinations gracefully', async () => {
      const impossibleFilters: BusinessFilters = {
        categories: [99999], // Non-existent category
        amenities: [99999], // Non-existent amenity
        regions: [99999], // Non-existent region
        rating_min: 6.0 // Impossible rating
      };
      
      const pagination: Pagination = { page: 1, limit: 12, offset: 0 };
      
      const [businesses, count] = await Promise.all([
        databaseService.getBusinesses(impossibleFilters, pagination),
        databaseService.getBusinessCount(impossibleFilters)
      ]);
      
      expect(Array.isArray(businesses)).toBe(true);
      expect(businesses.length).toBe(0);
      expect(count).toBe(0);
    });
  });

  // Test data consistency across user flows
  describe('Data Consistency Across Flows', () => {
    it('should maintain consistent business data across different access paths', async () => {
      // Get a business through different paths and verify consistency
      const pagination: Pagination = { page: 1, limit: 1, offset: 0 };
      const businesses = await databaseService.getBusinesses({}, pagination);
      
      if (businesses.length > 0) {
        const business = businesses[0];
        
        // Get the same business through detail query
        const businessDetail = await databaseService.getBusinessBySlug(business.slug);
        
        expect(businessDetail).not.toBeNull();
        if (businessDetail) {
          // Core data should match
          expect(businessDetail.id).toBe(business.id);
          expect(businessDetail.name).toBe(business.name);
          expect(businessDetail.slug).toBe(business.slug);
          expect(businessDetail.rating).toBe(business.rating);
          expect(businessDetail.reviews_count).toBe(business.reviews_count);
          expect(businessDetail.is_active).toBe(business.is_active);
          expect(businessDetail.featured).toBe(business.featured);
          expect(businessDetail.verified).toBe(business.verified);
          
          // If business has categories, test category filtering
          if (businessDetail.categories.length > 0) {
            const categoryId = businessDetail.categories[0].id;
            const categoryFilters: BusinessFilters = { categories: [categoryId] };
            const categoryBusinesses = await databaseService.getBusinesses(categoryFilters, pagination);
            
            const businessInCategory = categoryBusinesses.find(b => b.id === business.id);
            expect(businessInCategory).toBeDefined();
          }
          
          // If business has regions, test region filtering
          if (businessDetail.regions.length > 0) {
            const regionId = businessDetail.regions[0].id;
            const regionFilters: BusinessFilters = { regions: [regionId] };
            const regionBusinesses = await databaseService.getBusinesses(regionFilters, pagination);
            
            const businessInRegion = regionBusinesses.find(b => b.id === business.id);
            expect(businessInRegion).toBeDefined();
          }
        }
      }
    });
  });
});