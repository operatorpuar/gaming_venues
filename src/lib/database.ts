import { 
  db, 
  eq, 
  like, 
  and, 
  or, 
  count, 
  desc, 
  asc, 
  gte,
  businesses,
  categories,
  amenities,
  regions,
  business_categories,
  business_amenities,
  business_regions
} from 'astro:db';
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
  getCategoriesWithCounts(): Promise<Array<CategoryType & { business_count: number }>>;
  getAmenitiesWithCounts(): Promise<Array<AmenityType & { business_count: number }>>;
  getCategoryBySlug(slug: string): Promise<CategoryType | null>;
  getAmenityBySlug(slug: string): Promise<AmenityType | null>;
  getRegionsWithCounts(): Promise<Array<RegionType & { business_count: number }>>;
  getRegionBySlug(slug: string): Promise<RegionType | null>;
  getStatesWithCounts(): Promise<Array<{ state: string; business_count: number; region_count: number }>>;
  getRegionsByState(state: string): Promise<Array<RegionType & { business_count: number }>>;
}

/**
 * Turso database implementation using Astro DB and Drizzle ORM
 */
export class TursoDatabase implements DatabaseService {
  
  /**
   * Get businesses with filtering and pagination
   */
  async getBusinesses(filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    // Build base conditions
    const conditions = [eq(businesses.is_active, true)];

    // Apply city filter
    if (filters.city) {
      conditions.push(like(businesses.city, `%${filters.city}%`));
    }

    // Apply state filter
    if (filters.state) {
      conditions.push(like(businesses.state, `%${filters.state}%`));
    }

    // Apply rating filter
    if (filters.rating_min) {
      conditions.push(gte(businesses.rating, filters.rating_min));
    }

    // Apply featured filter
    if (filters.featured_only) {
      conditions.push(eq(businesses.featured, true));
    }

    // Apply verified filter
    if (filters.verified_only) {
      conditions.push(eq(businesses.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: business_categories.business_id })
        .from(business_categories)
        .where(or(...filters.categories.map(id => eq(business_categories.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return []; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: business_amenities.business_id })
        .from(business_amenities)
        .where(or(...filters.amenities.map(id => eq(business_amenities.amenity_id, id))));
      
      const amenityBusinessIds = amenityBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => amenityBusinessIds.includes(id));
      } else {
        businessIds = amenityBusinessIds;
      }
      
      if (businessIds.length === 0) return []; // No businesses match amenities
    }

    // Filter by regions if specified
    if (filters.regions && filters.regions.length > 0) {
      const regionBusinesses = await db.select({ business_id: business_regions.business_id })
        .from(business_regions)
        .where(or(...filters.regions.map(id => eq(business_regions.region_id, id))));
      
      const regionBusinessIds = regionBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => regionBusinessIds.includes(id));
      } else {
        businessIds = regionBusinessIds;
      }
      
      if (businessIds.length === 0) return []; // No businesses match regions
    }

    // Add business ID filter if we have specific IDs to filter by
    if (businessIds && businessIds.length > 0) {
      if (businessIds.length === 1) {
        conditions.push(eq(businesses.id, businessIds[0]));
      } else {
        const businessConditions = businessIds.map(id => eq(businesses.id, id));
        if (businessConditions.length === 1) {
          conditions.push(businessConditions[0]);
        } else if (businessConditions.length > 1) {
          // Use a different approach to avoid TypeScript spread operator issues
          let condition = businessConditions[0];
          if (condition) {
            for (let i = 1; i < businessConditions.length; i++) {
              const nextCondition = businessConditions[i];
              if (nextCondition) {
                condition = or(condition, nextCondition);
              }
            }
            conditions.push(condition);
          }
        }
      }
    } else if (businessIds && businessIds.length === 0) {
      return [];
    }

    // Get businesses with the applied filters
    const businessList = await db.select()
      .from(businesses)
      .where(and(...conditions))
      .orderBy(desc(businesses.featured), desc(businesses.rating))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of businessList) {
      const businessCategories = await db.select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        is_active: categories.is_active
      })
      .from(categories)
      .innerJoin(business_categories, eq(categories.id, business_categories.category_id))
      .where(and(
        eq(business_categories.business_id, business.id),
        eq(categories.is_active, true)
      ));

      businessResults.push({
        ...business,
        categories: businessCategories
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
      .from(businesses)
      .where(and(eq(businesses.slug, slug), eq(businesses.is_active, true)))
      .limit(1);
    
    if (!businessResult.length) {
      return null;
    }
    
    const business = businessResult[0];
    
    // Get categories for this business
    const businessCategories = await db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      is_active: categories.is_active
    })
    .from(categories)
    .innerJoin(business_categories, eq(categories.id, business_categories.category_id))
    .where(and(
      eq(business_categories.business_id, business.id),
      eq(categories.is_active, true)
    ));
    
    // Get amenities for this business
    const businessAmenities = await db.select({
      id: amenities.id,
      name: amenities.name,
      slug: amenities.slug,
      category: amenities.category,
      is_active: amenities.is_active
    })
    .from(amenities)
    .innerJoin(business_amenities, eq(amenities.id, business_amenities.amenity_id))
    .where(and(
      eq(business_amenities.business_id, business.id),
      eq(amenities.is_active, true)
    ));
    
    // Get regions for this business
    const businessRegions = await db.select({
      id: regions.id,
      name: regions.name,
      slug: regions.slug,
      state: regions.state,
      country: regions.country
    })
    .from(regions)
    .innerJoin(business_regions, eq(regions.id, business_regions.region_id))
    .where(eq(business_regions.business_id, business.id));
    
    return {
      ...business,
      categories: businessCategories,
      amenities: businessAmenities,
      regions: businessRegions
    };
  }

  /**
   * Get all active categories
   */
  async getCategories(): Promise<CategoryType[]> {
    return await db.select()
      .from(categories)
      .where(eq(categories.is_active, true))
      .orderBy(asc(categories.name));
  }

  /**
   * Get all active amenities
   */
  async getAmenities(): Promise<AmenityType[]> {
    return await db.select()
      .from(amenities)
      .where(eq(amenities.is_active, true))
      .orderBy(asc(amenities.category), asc(amenities.name));
  }

  /**
   * Get all active regions
   */
  async getRegions(): Promise<RegionType[]> {
    return await db.select()
      .from(regions)
      .orderBy(asc(regions.state), asc(regions.name));
  }

  /**
   * Search businesses across multiple fields
   */
  async searchBusinesses(query: string, filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    const searchTerm = `%${query}%`;
    
    // Build base search conditions
    const searchConditions = [
      eq(businesses.is_active, true),
      or(
        like(businesses.name, searchTerm),
        like(businesses.description, searchTerm),
        like(businesses.full_address, searchTerm),
        like(businesses.city, searchTerm),
        like(businesses.business_type, searchTerm)
      )
    ];

    // Apply city filter
    if (filters.city) {
      searchConditions.push(like(businesses.city, `%${filters.city}%`));
    }

    // Apply state filter
    if (filters.state) {
      searchConditions.push(like(businesses.state, `%${filters.state}%`));
    }

    // Apply featured filter
    if (filters.featured_only) {
      searchConditions.push(eq(businesses.featured, true));
    }

    // Apply verified filter
    if (filters.verified_only) {
      searchConditions.push(eq(businesses.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: business_categories.business_id })
        .from(business_categories)
        .where(or(...filters.categories.map(id => eq(business_categories.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return []; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: business_amenities.business_id })
        .from(business_amenities)
        .where(or(...filters.amenities.map(id => eq(business_amenities.amenity_id, id))));
      
      const amenityBusinessIds = amenityBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => amenityBusinessIds.includes(id));
      } else {
        businessIds = amenityBusinessIds;
      }
      
      if (businessIds.length === 0) return []; // No businesses match amenities
    }

    // Filter by regions if specified
    if (filters.regions && filters.regions.length > 0) {
      const regionBusinesses = await db.select({ business_id: business_regions.business_id })
        .from(business_regions)
        .where(or(...filters.regions.map(id => eq(business_regions.region_id, id))));
      
      const regionBusinessIds = regionBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => regionBusinessIds.includes(id));
      } else {
        businessIds = regionBusinessIds;
      }
      
      if (businessIds.length === 0) return []; // No businesses match regions
    }

    // Add business ID filter if we have specific IDs to filter by
    if (businessIds && businessIds.length > 0) {
      if (businessIds.length === 1) {
        searchConditions.push(eq(businesses.id, businessIds[0]));
      } else {
        const businessConditions = businessIds.map(id => eq(businesses.id, id));
        // Use a different approach to avoid TypeScript spread operator issues
        let condition = businessConditions[0];
        if (condition) {
          for (let i = 1; i < businessConditions.length; i++) {
            const nextCondition = businessConditions[i];
            if (nextCondition) {
              condition = or(condition, nextCondition);
            }
          }
          searchConditions.push(condition);
        }
      }
    } else if (businessIds && businessIds.length === 0) {
      return [];
    }

    // Get businesses with the applied search and filters
    const businessList = await db.select()
      .from(businesses)
      .where(and(...searchConditions))
      .orderBy(desc(businesses.featured), desc(businesses.rating))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of businessList) {
      const businessCategories = await db.select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        is_active: categories.is_active
      })
      .from(categories)
      .innerJoin(business_categories, eq(categories.id, business_categories.category_id))
      .where(and(
        eq(business_categories.business_id, business.id),
        eq(categories.is_active, true)
      ));

      businessResults.push({
        ...business,
        categories: businessCategories
      });
    }
    
    return businessResults;
  }

  /**
   * Get total count of businesses matching filters
   */
  async getBusinessCount(filters?: BusinessFilters): Promise<number> {
    const conditions = [eq(businesses.is_active, true)];

    // Apply simple filters
    if (filters?.city) {
      conditions.push(like(businesses.city, `%${filters.city}%`));
    }

    if (filters?.state) {
      conditions.push(like(businesses.state, `%${filters.state}%`));
    }

    if (filters?.featured_only) {
      conditions.push(eq(businesses.featured, true));
    }

    if (filters?.verified_only) {
      conditions.push(eq(businesses.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters?.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: business_categories.business_id })
        .from(business_categories)
        .where(or(...filters.categories.map(id => eq(business_categories.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return 0; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters?.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: business_amenities.business_id })
        .from(business_amenities)
        .where(or(...filters.amenities.map(id => eq(business_amenities.amenity_id, id))));
      
      const amenityBusinessIds = amenityBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => amenityBusinessIds.includes(id));
      } else {
        businessIds = amenityBusinessIds;
      }
      
      if (businessIds.length === 0) return 0; // No businesses match amenities
    }

    // Filter by regions if specified
    if (filters?.regions && filters.regions.length > 0) {
      const regionBusinesses = await db.select({ business_id: business_regions.business_id })
        .from(business_regions)
        .where(or(...filters.regions.map(id => eq(business_regions.region_id, id))));
      
      const regionBusinessIds = regionBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => regionBusinessIds.includes(id));
      } else {
        businessIds = regionBusinessIds;
      }
      
      if (businessIds.length === 0) return 0; // No businesses match regions
    }

    // Add business ID filter if we have specific IDs to filter by
    if (businessIds) {
      if (businessIds.length === 0) return 0;
      if (businessIds.length === 1) {
        conditions.push(eq(businesses.id, businessIds[0]));
      } else if (businessIds.length > 1) {
        const businessConditions = businessIds.map(id => eq(businesses.id, id));
        // Use a different approach to avoid TypeScript spread operator issues
        let condition = businessConditions[0];
        if (condition) {
          for (let i = 1; i < businessConditions.length; i++) {
            const nextCondition = businessConditions[i];
            if (nextCondition) {
              condition = or(condition, nextCondition);
            }
          }
          conditions.push(condition);
        }
      }
    }

    const result = await db.select({ count: count() })
      .from(businesses)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get total count of businesses matching search query and filters
   */
  async getSearchCount(query: string, filters?: BusinessFilters): Promise<number> {
    const searchTerm = `%${query}%`;
    
    const conditions = [
      eq(businesses.is_active, true),
      or(
        like(businesses.name, searchTerm),
        like(businesses.description, searchTerm),
        like(businesses.full_address, searchTerm),
        like(businesses.city, searchTerm),
        like(businesses.business_type, searchTerm)
      )
    ];

    // Apply simple filters
    if (filters?.city) {
      conditions.push(like(businesses.city, `%${filters.city}%`));
    }

    if (filters?.state) {
      conditions.push(like(businesses.state, `%${filters.state}%`));
    }

    if (filters?.featured_only) {
      conditions.push(eq(businesses.featured, true));
    }

    if (filters?.verified_only) {
      conditions.push(eq(businesses.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters?.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: business_categories.business_id })
        .from(business_categories)
        .where(or(...filters.categories.map(id => eq(business_categories.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return 0; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters?.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: business_amenities.business_id })
        .from(business_amenities)
        .where(or(...filters.amenities.map(id => eq(business_amenities.amenity_id, id))));
      
      const amenityBusinessIds = amenityBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => amenityBusinessIds.includes(id));
      } else {
        businessIds = amenityBusinessIds;
      }
      
      if (businessIds.length === 0) return 0; // No businesses match amenities
    }

    // Filter by regions if specified
    if (filters?.regions && filters.regions.length > 0) {
      const regionBusinesses = await db.select({ business_id: business_regions.business_id })
        .from(business_regions)
        .where(or(...filters.regions.map(id => eq(business_regions.region_id, id))));
      
      const regionBusinessIds = regionBusinesses.map(b => b.business_id);
      
      if (businessIds) {
        // Intersect with existing business IDs
        businessIds = businessIds.filter(id => regionBusinessIds.includes(id));
      } else {
        businessIds = regionBusinessIds;
      }
      
      if (businessIds.length === 0) return 0; // No businesses match regions
    }

    // Add business ID filter if we have specific IDs to filter by
    if (businessIds) {
      if (businessIds.length === 0) return 0;
      if (businessIds.length === 1) {
        conditions.push(eq(businesses.id, businessIds[0]));
      } else if (businessIds.length > 1) {
        const businessConditions = businessIds.map(id => eq(businesses.id, id));
        // Use a different approach to avoid TypeScript spread operator issues
        let condition = businessConditions[0];
        if (condition) {
          for (let i = 1; i < businessConditions.length; i++) {
            const nextCondition = businessConditions[i];
            if (nextCondition) {
              condition = or(condition, nextCondition);
            }
          }
          conditions.push(condition);
        }
      }
    }

    const result = await db.select({ count: count() })
      .from(businesses)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Get categories with business counts
   */
  async getCategoriesWithCounts(): Promise<Array<CategoryType & { business_count: number }>> {
    const categoriesWithCounts = await db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      is_active: categories.is_active,
      business_count: count(business_categories.business_id)
    })
    .from(categories)
    .leftJoin(business_categories, eq(categories.id, business_categories.category_id))
    .leftJoin(businesses, and(
      eq(business_categories.business_id, businesses.id),
      eq(businesses.is_active, true)
    ))
    .where(eq(categories.is_active, true))
    .groupBy(categories.id, categories.name, categories.slug, categories.is_active)
    .orderBy(asc(categories.name));

    return categoriesWithCounts;
  }

  /**
   * Get amenities with business counts, grouped by category
   */
  async getAmenitiesWithCounts(): Promise<Array<AmenityType & { business_count: number }>> {
    const amenitiesWithCounts = await db.select({
      id: amenities.id,
      name: amenities.name,
      slug: amenities.slug,
      category: amenities.category,
      is_active: amenities.is_active,
      business_count: count(business_amenities.business_id)
    })
    .from(amenities)
    .leftJoin(business_amenities, eq(amenities.id, business_amenities.amenity_id))
    .leftJoin(businesses, and(
      eq(business_amenities.business_id, businesses.id),
      eq(businesses.is_active, true)
    ))
    .where(eq(amenities.is_active, true))
    .groupBy(amenities.id, amenities.name, amenities.slug, amenities.category, amenities.is_active)
    .orderBy(asc(amenities.category), asc(amenities.name));

    return amenitiesWithCounts;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryType | null> {
    const result = await db.select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.is_active, true)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get amenity by slug
   */
  async getAmenityBySlug(slug: string): Promise<AmenityType | null> {
    const result = await db.select()
      .from(amenities)
      .where(and(eq(amenities.slug, slug), eq(amenities.is_active, true)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get regions with business counts, organized by state
   */
  async getRegionsWithCounts(): Promise<Array<RegionType & { business_count: number }>> {
    const regionsWithCounts = await db.select({
      id: regions.id,
      name: regions.name,
      slug: regions.slug,
      state: regions.state,
      country: regions.country,
      business_count: count(business_regions.business_id)
    })
    .from(regions)
    .leftJoin(business_regions, eq(regions.id, business_regions.region_id))
    .leftJoin(businesses, and(
      eq(business_regions.business_id, businesses.id),
      eq(businesses.is_active, true)
    ))
    .groupBy(regions.id, regions.name, regions.slug, regions.state, regions.country)
    .orderBy(asc(regions.state), asc(regions.name));

    return regionsWithCounts;
  }

  /**
   * Get region by slug
   */
  async getRegionBySlug(slug: string): Promise<RegionType | null> {
    const result = await db.select()
      .from(regions)
      .where(eq(regions.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get states with business counts for hierarchical navigation
   */
  async getStatesWithCounts(): Promise<Array<{ state: string; business_count: number; region_count: number }>> {
    // Get business counts by state
    const businessCounts = await db.select({
      state: businesses.state,
      business_count: count(businesses.id)
    })
    .from(businesses)
    .where(eq(businesses.is_active, true))
    .groupBy(businesses.state)
    .orderBy(asc(businesses.state));

    // Get region counts by state
    const regionCounts = await db.select({
      state: regions.state,
      region_count: count(regions.id)
    })
    .from(regions)
    .groupBy(regions.state)
    .orderBy(asc(regions.state));

    // Combine the data
    const stateMap = new Map<string, { business_count: number; region_count: number }>();
    
    businessCounts.forEach(item => {
      stateMap.set(item.state, { business_count: item.business_count, region_count: 0 });
    });

    regionCounts.forEach(item => {
      const existing = stateMap.get(item.state);
      if (existing) {
        existing.region_count = item.region_count;
      } else {
        stateMap.set(item.state, { business_count: 0, region_count: item.region_count });
      }
    });

    return Array.from(stateMap.entries()).map(([state, counts]) => ({
      state,
      ...counts
    })).sort((a, b) => a.state.localeCompare(b.state));
  }

  /**
   * Get regions for a specific state with business counts
   */
  async getRegionsByState(state: string): Promise<Array<RegionType & { business_count: number }>> {
    const regionsWithCounts = await db.select({
      id: regions.id,
      name: regions.name,
      slug: regions.slug,
      state: regions.state,
      country: regions.country,
      business_count: count(business_regions.business_id)
    })
    .from(regions)
    .leftJoin(business_regions, eq(regions.id, business_regions.region_id))
    .leftJoin(businesses, and(
      eq(business_regions.business_id, businesses.id),
      eq(businesses.is_active, true)
    ))
    .where(eq(regions.state, state))
    .groupBy(regions.id, regions.name, regions.slug, regions.state, regions.country)
    .orderBy(asc(regions.name));

    return regionsWithCounts;
  }
}

// Export a singleton instance
export const databaseService = new TursoDatabase();