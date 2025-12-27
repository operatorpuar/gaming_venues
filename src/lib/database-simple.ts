import { db, eq, like, and, or, count, desc, asc, gte, Business, Category, Amenity, Region, BusinessCategory, BusinessAmenity, BusinessRegion } from 'astro:db';
import type { 
  BusinessResult, 
  BusinessDetail, 
  BusinessFilters, 
  Pagination,
  Category as CategoryType,
  Amenity as AmenityType,
  Region as RegionType
} from './types';

/**
 * Database service interface defining core operations
 */
export interface DatabaseService {
  getBusinesses(filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]>;
  getBusinessBySlug(slug: string): Promise<BusinessDetail | null>;
  getCategories(): Promise<CategoryType[]>;
  getAmenities(): Promise<AmenityType[]>;
  getRegions(): Promise<RegionType[]>;
  searchBusinesses(query: string, filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]>;
  getBusinessCount(filters?: BusinessFilters): Promise<number>;
  getSearchCount(query: string, filters?: BusinessFilters): Promise<number>;
}

/**
 * Simple database implementation using Astro DB
 */
export class SimpleDatabase implements DatabaseService {
  
  /**
   * Get businesses with filtering and pagination
   */
  async getBusinesses(filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    // Build base conditions
    const conditions = [eq(Business.is_active, true)];

    // Apply simple filters
    if (filters.city) {
      conditions.push(like(Business.city, `%${filters.city}%`));
    }

    if (filters.state) {
      conditions.push(like(Business.state, `%${filters.state}%`));
    }

    if (filters.rating_min) {
      conditions.push(gte(Business.rating, filters.rating_min));
    }

    if (filters.featured_only) {
      conditions.push(eq(Business.featured, true));
    }

    if (filters.verified_only) {
      conditions.push(eq(Business.verified, true));
    }

    // Get all businesses that match basic filters
    let businesses = await db.select()
      .from(Business)
      .where(and(...conditions))
      .orderBy(desc(Business.featured), desc(Business.rating));

    // Apply complex filters using JavaScript filtering
    if (filters.categories && filters.categories.length > 0) {
      const businessesWithCategories = await this.getBusinessesWithCategories(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessCategories = businessesWithCategories.get(business.id) || [];
        return filters.categories!.some(catId => businessCategories.includes(catId));
      });
    }

    if (filters.amenities && filters.amenities.length > 0) {
      const businessesWithAmenities = await this.getBusinessesWithAmenities(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessAmenities = businessesWithAmenities.get(business.id) || [];
        return filters.amenities!.some(amenityId => businessAmenities.includes(amenityId));
      });
    }

    if (filters.regions && filters.regions.length > 0) {
      const businessesWithRegions = await this.getBusinessesWithRegions(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessRegions = businessesWithRegions.get(business.id) || [];
        return filters.regions!.some(regionId => businessRegions.includes(regionId));
      });
    }

    // Apply pagination
    const startIndex = pagination.offset;
    const endIndex = startIndex + pagination.limit;
    const paginatedBusinesses = businesses.slice(startIndex, endIndex);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of paginatedBusinesses) {
      const categories = await db.select({
        id: Category.id,
        name: Category.name,
        slug: Category.slug,
        is_active: Category.is_active
      })
      .from(Category)
      .innerJoin(BusinessCategory, eq(Category.id, BusinessCategory.category_id))
      .where(and(
        eq(BusinessCategory.business_id, business.id),
        eq(Category.is_active, true)
      ));

      businessResults.push({
        ...business,
        categories
      });
    }
    
    return businessResults;
  }

  /**
   * Get detailed business information by slug
   */
  async getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
    // Get the business
    const businessResult = await db.select()
      .from(Business)
      .where(and(eq(Business.slug, slug), eq(Business.is_active, true)))
      .limit(1);
    
    if (!businessResult.length) {
      return null;
    }
    
    const business = businessResult[0];
    
    // Get categories for this business
    const categories = await db.select({
      id: Category.id,
      name: Category.name,
      slug: Category.slug,
      is_active: Category.is_active
    })
    .from(Category)
    .innerJoin(BusinessCategory, eq(Category.id, BusinessCategory.category_id))
    .where(and(
      eq(BusinessCategory.business_id, business.id),
      eq(Category.is_active, true)
    ));
    
    // Get amenities for this business
    const amenities = await db.select({
      id: Amenity.id,
      name: Amenity.name,
      slug: Amenity.slug,
      category: Amenity.category,
      is_active: Amenity.is_active
    })
    .from(Amenity)
    .innerJoin(BusinessAmenity, eq(Amenity.id, BusinessAmenity.amenity_id))
    .where(and(
      eq(BusinessAmenity.business_id, business.id),
      eq(Amenity.is_active, true)
    ));
    
    // Get regions for this business
    const regions = await db.select({
      id: Region.id,
      name: Region.name,
      slug: Region.slug,
      state: Region.state,
      is_active: Region.is_active
    })
    .from(Region)
    .innerJoin(BusinessRegion, eq(Region.id, BusinessRegion.region_id))
    .where(and(
      eq(BusinessRegion.business_id, business.id),
      eq(Region.is_active, true)
    ));
    
    return {
      ...business,
      categories,
      amenities,
      regions
    };
  }

  /**
   * Get all active categories
   */
  async getCategories(): Promise<CategoryType[]> {
    return await db.select()
      .from(Category)
      .where(eq(Category.is_active, true))
      .orderBy(asc(Category.name));
  }

  /**
   * Get all active amenities
   */
  async getAmenities(): Promise<AmenityType[]> {
    return await db.select()
      .from(Amenity)
      .where(eq(Amenity.is_active, true))
      .orderBy(asc(Amenity.category), asc(Amenity.name));
  }

  /**
   * Get all active regions
   */
  async getRegions(): Promise<RegionType[]> {
    return await db.select()
      .from(Region)
      .where(eq(Region.is_active, true))
      .orderBy(asc(Region.state), asc(Region.name));
  }

  /**
   * Search businesses across multiple fields
   */
  async searchBusinesses(query: string, filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    const searchTerm = `%${query}%`;
    
    // Build base search conditions
    const searchConditions = [
      eq(Business.is_active, true),
      or(
        like(Business.name, searchTerm),
        like(Business.description, searchTerm),
        like(Business.full_address, searchTerm),
        like(Business.city, searchTerm),
        like(Business.business_type, searchTerm)
      )
    ];

    // Apply simple filters
    if (filters.city) {
      searchConditions.push(like(Business.city, `%${filters.city}%`));
    }

    if (filters.state) {
      searchConditions.push(like(Business.state, `%${filters.state}%`));
    }

    if (filters.featured_only) {
      searchConditions.push(eq(Business.featured, true));
    }

    if (filters.verified_only) {
      searchConditions.push(eq(Business.verified, true));
    }

    // Get all businesses that match search and basic filters
    let businesses = await db.select()
      .from(Business)
      .where(and(...searchConditions))
      .orderBy(desc(Business.featured), desc(Business.rating));

    // Apply complex filters using JavaScript filtering
    if (filters.categories && filters.categories.length > 0) {
      const businessesWithCategories = await this.getBusinessesWithCategories(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessCategories = businessesWithCategories.get(business.id) || [];
        return filters.categories!.some(catId => businessCategories.includes(catId));
      });
    }

    if (filters.amenities && filters.amenities.length > 0) {
      const businessesWithAmenities = await this.getBusinessesWithAmenities(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessAmenities = businessesWithAmenities.get(business.id) || [];
        return filters.amenities!.some(amenityId => businessAmenities.includes(amenityId));
      });
    }

    if (filters.regions && filters.regions.length > 0) {
      const businessesWithRegions = await this.getBusinessesWithRegions(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessRegions = businessesWithRegions.get(business.id) || [];
        return filters.regions!.some(regionId => businessRegions.includes(regionId));
      });
    }

    // Apply pagination
    const startIndex = pagination.offset;
    const endIndex = startIndex + pagination.limit;
    const paginatedBusinesses = businesses.slice(startIndex, endIndex);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of paginatedBusinesses) {
      const categories = await db.select({
        id: Category.id,
        name: Category.name,
        slug: Category.slug,
        is_active: Category.is_active
      })
      .from(Category)
      .innerJoin(BusinessCategory, eq(Category.id, BusinessCategory.category_id))
      .where(and(
        eq(BusinessCategory.business_id, business.id),
        eq(Category.is_active, true)
      ));

      businessResults.push({
        ...business,
        categories
      });
    }
    
    return businessResults;
  }

  /**
   * Get total count of businesses matching filters
   */
  async getBusinessCount(filters?: BusinessFilters): Promise<number> {
    const conditions = [eq(Business.is_active, true)];

    // Apply simple filters
    if (filters?.city) {
      conditions.push(like(Business.city, `%${filters.city}%`));
    }

    if (filters?.state) {
      conditions.push(like(Business.state, `%${filters.state}%`));
    }

    if (filters?.featured_only) {
      conditions.push(eq(Business.featured, true));
    }

    if (filters?.verified_only) {
      conditions.push(eq(Business.verified, true));
    }

    // Get all businesses that match basic filters
    let businesses = await db.select({ id: Business.id })
      .from(Business)
      .where(and(...conditions));

    // Apply complex filters using JavaScript filtering
    if (filters?.categories && filters.categories.length > 0) {
      const businessesWithCategories = await this.getBusinessesWithCategories(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessCategories = businessesWithCategories.get(business.id) || [];
        return filters.categories!.some(catId => businessCategories.includes(catId));
      });
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      const businessesWithAmenities = await this.getBusinessesWithAmenities(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessAmenities = businessesWithAmenities.get(business.id) || [];
        return filters.amenities!.some(amenityId => businessAmenities.includes(amenityId));
      });
    }

    if (filters?.regions && filters.regions.length > 0) {
      const businessesWithRegions = await this.getBusinessesWithRegions(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessRegions = businessesWithRegions.get(business.id) || [];
        return filters.regions!.some(regionId => businessRegions.includes(regionId));
      });
    }

    return businesses.length;
  }

  /**
   * Get total count of businesses matching search query and filters
   */
  async getSearchCount(query: string, filters?: BusinessFilters): Promise<number> {
    const searchTerm = `%${query}%`;
    
    const conditions = [
      eq(Business.is_active, true),
      or(
        like(Business.name, searchTerm),
        like(Business.description, searchTerm),
        like(Business.full_address, searchTerm),
        like(Business.city, searchTerm),
        like(Business.business_type, searchTerm)
      )
    ];

    // Apply simple filters
    if (filters?.city) {
      conditions.push(like(Business.city, `%${filters.city}%`));
    }

    if (filters?.state) {
      conditions.push(like(Business.state, `%${filters.state}%`));
    }

    if (filters?.featured_only) {
      conditions.push(eq(Business.featured, true));
    }

    if (filters?.verified_only) {
      conditions.push(eq(Business.verified, true));
    }

    // Get all businesses that match search and basic filters
    let businesses = await db.select({ id: Business.id })
      .from(Business)
      .where(and(...conditions));

    // Apply complex filters using JavaScript filtering
    if (filters?.categories && filters.categories.length > 0) {
      const businessesWithCategories = await this.getBusinessesWithCategories(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessCategories = businessesWithCategories.get(business.id) || [];
        return filters.categories!.some(catId => businessCategories.includes(catId));
      });
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      const businessesWithAmenities = await this.getBusinessesWithAmenities(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessAmenities = businessesWithAmenities.get(business.id) || [];
        return filters.amenities!.some(amenityId => businessAmenities.includes(amenityId));
      });
    }

    if (filters?.regions && filters.regions.length > 0) {
      const businessesWithRegions = await this.getBusinessesWithRegions(businesses.map(b => b.id));
      businesses = businesses.filter(business => {
        const businessRegions = businessesWithRegions.get(business.id) || [];
        return filters.regions!.some(regionId => businessRegions.includes(regionId));
      });
    }

    return businesses.length;
  }

  /**
   * Helper method to get categories for businesses
   */
  private async getBusinessesWithCategories(businessIds: number[]): Promise<Map<number, number[]>> {
    if (businessIds.length === 0) return new Map();
    
    const businessCategories = await db.select({
      business_id: BusinessCategory.business_id,
      category_id: BusinessCategory.category_id
    })
    .from(BusinessCategory)
    .where(or(...businessIds.map(id => eq(BusinessCategory.business_id, id))));

    const map = new Map<number, number[]>();
    for (const bc of businessCategories) {
      if (!map.has(bc.business_id)) {
        map.set(bc.business_id, []);
      }
      map.get(bc.business_id)!.push(bc.category_id);
    }
    
    return map;
  }

  /**
   * Helper method to get amenities for businesses
   */
  private async getBusinessesWithAmenities(businessIds: number[]): Promise<Map<number, number[]>> {
    if (businessIds.length === 0) return new Map();
    
    const businessAmenities = await db.select({
      business_id: BusinessAmenity.business_id,
      amenity_id: BusinessAmenity.amenity_id
    })
    .from(BusinessAmenity)
    .where(or(...businessIds.map(id => eq(BusinessAmenity.business_id, id))));

    const map = new Map<number, number[]>();
    for (const ba of businessAmenities) {
      if (!map.has(ba.business_id)) {
        map.set(ba.business_id, []);
      }
      map.get(ba.business_id)!.push(ba.amenity_id);
    }
    
    return map;
  }

  /**
   * Helper method to get regions for businesses
   */
  private async getBusinessesWithRegions(businessIds: number[]): Promise<Map<number, number[]>> {
    if (businessIds.length === 0) return new Map();
    
    const businessRegions = await db.select({
      business_id: BusinessRegion.business_id,
      region_id: BusinessRegion.region_id
    })
    .from(BusinessRegion)
    .where(or(...businessIds.map(id => eq(BusinessRegion.business_id, id))));

    const map = new Map<number, number[]>();
    for (const br of businessRegions) {
      if (!map.has(br.business_id)) {
        map.set(br.business_id, []);
      }
      map.get(br.business_id)!.push(br.region_id);
    }
    
    return map;
  }
}

// Export a singleton instance
export const databaseService = new SimpleDatabase();