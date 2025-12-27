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
      conditions.push(like(Business.city, `%${filters.city}%`));
    }

    // Apply state filter
    if (filters.state) {
      conditions.push(like(Business.state, `%${filters.state}%`));
    }

    // Apply rating filter
    if (filters.rating_min) {
      conditions.push(gte(Business.rating, filters.rating_min));
    }

    // Apply featured filter
    if (filters.featured_only) {
      conditions.push(eq(Business.featured, true));
    }

    // Apply verified filter
    if (filters.verified_only) {
      conditions.push(eq(Business.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: BusinessCategory.business_id })
        .from(BusinessCategory)
        .where(or(...filters.categories.map(id => eq(BusinessCategory.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return []; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: BusinessAmenity.business_id })
        .from(BusinessAmenity)
        .where(or(...filters.amenities.map(id => eq(BusinessAmenity.amenity_id, id))));
      
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
      const regionBusinesses = await db.select({ business_id: BusinessRegion.business_id })
        .from(BusinessRegion)
        .where(or(...filters.regions.map(id => eq(BusinessRegion.region_id, id))));
      
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
        conditions.push(eq(Business.id, businessIds[0]));
      } else {
        const businessConditions = businessIds.map(id => eq(Business.id, id));
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
    const businesses = await db.select()
      .from(Business)
      .where(and(...conditions))
      .orderBy(desc(Business.featured), desc(Business.rating))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of businesses) {
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
    console.log('Database: Searching for business with slug:', slug);
    
    // Get the business
    const businessResult = await db.select()
      .from(Business)
      .where(and(eq(Business.slug, slug), eq(Business.is_active, true)))
      .limit(1);
    
    console.log('Database: Found businesses:', businessResult.length);
    
    if (!businessResult.length) {
      console.log('Database: No business found with slug:', slug);
      return null;
    }
    
    const business = businessResult[0];
    console.log('Database: Found business:', business.name);
    
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

    // Apply city filter
    if (filters.city) {
      searchConditions.push(like(Business.city, `%${filters.city}%`));
    }

    // Apply state filter
    if (filters.state) {
      searchConditions.push(like(Business.state, `%${filters.state}%`));
    }

    // Apply featured filter
    if (filters.featured_only) {
      searchConditions.push(eq(Business.featured, true));
    }

    // Apply verified filter
    if (filters.verified_only) {
      searchConditions.push(eq(Business.verified, true));
    }

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: BusinessCategory.business_id })
        .from(BusinessCategory)
        .where(or(...filters.categories.map(id => eq(BusinessCategory.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return []; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: BusinessAmenity.business_id })
        .from(BusinessAmenity)
        .where(or(...filters.amenities.map(id => eq(BusinessAmenity.amenity_id, id))));
      
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
      const regionBusinesses = await db.select({ business_id: BusinessRegion.business_id })
        .from(BusinessRegion)
        .where(or(...filters.regions.map(id => eq(BusinessRegion.region_id, id))));
      
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
        searchConditions.push(eq(Business.id, businessIds[0]));
      } else {
        const businessConditions = businessIds.map(id => eq(Business.id, id));
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
    const businesses = await db.select()
      .from(Business)
      .where(and(...searchConditions))
      .orderBy(desc(Business.featured), desc(Business.rating))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of businesses) {
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

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters?.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: BusinessCategory.business_id })
        .from(BusinessCategory)
        .where(or(...filters.categories.map(id => eq(BusinessCategory.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return 0; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters?.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: BusinessAmenity.business_id })
        .from(BusinessAmenity)
        .where(or(...filters.amenities.map(id => eq(BusinessAmenity.amenity_id, id))));
      
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
      const regionBusinesses = await db.select({ business_id: BusinessRegion.business_id })
        .from(BusinessRegion)
        .where(or(...filters.regions.map(id => eq(BusinessRegion.region_id, id))));
      
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
        conditions.push(eq(Business.id, businessIds[0]));
      } else if (businessIds.length > 1) {
        const businessConditions = businessIds.map(id => eq(Business.id, id));
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
      .from(Business)
      .where(and(...conditions));

    return result[0]?.count || 0;
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

    // For complex filtering with categories, amenities, and regions, we need to use subqueries
    let businessIds: number[] | undefined;

    // Filter by categories if specified
    if (filters?.categories && filters.categories.length > 0) {
      const categoryBusinesses = await db.select({ business_id: BusinessCategory.business_id })
        .from(BusinessCategory)
        .where(or(...filters.categories.map(id => eq(BusinessCategory.category_id, id))));
      
      businessIds = categoryBusinesses.map(b => b.business_id);
      if (businessIds.length === 0) return 0; // No businesses match categories
    }

    // Filter by amenities if specified
    if (filters?.amenities && filters.amenities.length > 0) {
      const amenityBusinesses = await db.select({ business_id: BusinessAmenity.business_id })
        .from(BusinessAmenity)
        .where(or(...filters.amenities.map(id => eq(BusinessAmenity.amenity_id, id))));
      
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
      const regionBusinesses = await db.select({ business_id: BusinessRegion.business_id })
        .from(BusinessRegion)
        .where(or(...filters.regions.map(id => eq(BusinessRegion.region_id, id))));
      
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
        conditions.push(eq(Business.id, businessIds[0]));
      } else if (businessIds.length > 1) {
        const businessConditions = businessIds.map(id => eq(Business.id, id));
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
      .from(Business)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }
}

// Export a singleton instance
export const databaseService = new TursoDatabase();