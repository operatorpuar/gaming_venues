import { createClient } from '@libsql/client';
import type { 
  BusinessResult, 
  BusinessDetail, 
  BusinessFilters, 
  Pagination,
  Category as CategoryType,
  Amenity as AmenityType,
  Region as RegionType
} from './types';

// Create database client
const client = createClient({
  url: import.meta.env.ASTRO_DB_REMOTE_URL || process.env.ASTRO_DB_REMOTE_URL,
  authToken: import.meta.env.ASTRO_DB_APP_TOKEN || process.env.ASTRO_DB_APP_TOKEN,
});

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
 * Real database implementation using direct SQL queries
 */
export class RealDatabase implements DatabaseService {
  
  /**
   * Get businesses with filtering and pagination
   */
  async getBusinesses(filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    let whereConditions = ['b.is_active = 1'];
    let params: any[] = [];
    let paramIndex = 1;

    // Apply simple filters
    if (filters.city) {
      whereConditions.push(`b.city LIKE ?${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters.state) {
      whereConditions.push(`b.state LIKE ?${paramIndex}`);
      params.push(`%${filters.state}%`);
      paramIndex++;
    }

    if (filters.rating_min) {
      whereConditions.push(`b.rating >= ?${paramIndex}`);
      params.push(filters.rating_min);
      paramIndex++;
    }

    if (filters.featured_only) {
      whereConditions.push('b.featured = 1');
    }

    if (filters.verified_only) {
      whereConditions.push('b.verified = 1');
    }

    // Build the main query
    let query = `
      SELECT DISTINCT b.*
      FROM businesses b
    `;

    // Add joins for complex filters
    if (filters.categories && filters.categories.length > 0) {
      query += ` INNER JOIN business_categories bc ON b.id = bc.business_id`;
      const categoryPlaceholders = filters.categories.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`bc.category_id IN (${categoryPlaceholders})`);
      params.push(...filters.categories);
    }

    if (filters.amenities && filters.amenities.length > 0) {
      query += ` INNER JOIN business_amenities ba ON b.id = ba.business_id`;
      const amenityPlaceholders = filters.amenities.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`ba.amenity_id IN (${amenityPlaceholders})`);
      params.push(...filters.amenities);
    }

    if (filters.regions && filters.regions.length > 0) {
      query += ` INNER JOIN business_regions br ON b.id = br.business_id`;
      const regionPlaceholders = filters.regions.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`br.region_id IN (${regionPlaceholders})`);
      params.push(...filters.regions);
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT
    query += ` ORDER BY b.featured DESC, b.rating DESC LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}`;
    params.push(pagination.limit, pagination.offset);

    const result = await client.execute({ sql: query, args: params });
    
    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of result.rows) {
      const categoriesResult = await client.execute({
        sql: `
          SELECT c.id, c.name, c.slug, c.is_active
          FROM categories c
          INNER JOIN business_categories bc ON c.id = bc.category_id
          WHERE bc.business_id = ? AND c.is_active = 1
        `,
        args: [business.id]
      });

      businessResults.push({
        ...business,
        categories: categoriesResult.rows
      } as BusinessResult);
    }
    
    return businessResults;
  }

  /**
   * Get detailed business information by slug
   */
  async getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
    const result = await client.execute({
      sql: 'SELECT * FROM businesses WHERE slug = ? AND is_active = 1',
      args: [slug]
    });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const business = result.rows[0];
    
    // Get categories
    const categoriesResult = await client.execute({
      sql: `
        SELECT c.id, c.name, c.slug, c.is_active
        FROM categories c
        INNER JOIN business_categories bc ON c.id = bc.category_id
        WHERE bc.business_id = ? AND c.is_active = 1
      `,
      args: [business.id]
    });
    
    // Get amenities
    const amenitiesResult = await client.execute({
      sql: `
        SELECT a.id, a.name, a.slug, a.category, a.is_active
        FROM amenities a
        INNER JOIN business_amenities ba ON a.id = ba.amenity_id
        WHERE ba.business_id = ? AND a.is_active = 1
      `,
      args: [business.id]
    });
    
    // Get regions
    const regionsResult = await client.execute({
      sql: `
        SELECT r.id, r.name, r.slug, r.state
        FROM regions r
        INNER JOIN business_regions br ON r.id = br.region_id
        WHERE br.business_id = ?
      `,
      args: [business.id]
    });
    
    return {
      ...business,
      categories: categoriesResult.rows,
      amenities: amenitiesResult.rows,
      regions: regionsResult.rows
    } as BusinessDetail;
  }

  /**
   * Get all active categories
   */
  async getCategories(): Promise<CategoryType[]> {
    const result = await client.execute({
      sql: 'SELECT * FROM categories WHERE is_active = 1 ORDER BY name',
      args: []
    });
    
    return result.rows as CategoryType[];
  }

  /**
   * Get all active amenities
   */
  async getAmenities(): Promise<AmenityType[]> {
    const result = await client.execute({
      sql: 'SELECT * FROM amenities WHERE is_active = 1 ORDER BY category, name',
      args: []
    });
    
    return result.rows as AmenityType[];
  }

  /**
   * Get all regions
   */
  async getRegions(): Promise<RegionType[]> {
    const result = await client.execute({
      sql: 'SELECT * FROM regions ORDER BY state, name',
      args: []
    });
    
    return result.rows as RegionType[];
  }

  /**
   * Search businesses across multiple fields
   */
  async searchBusinesses(query: string, filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    const searchTerm = `%${query}%`;
    let whereConditions = [
      'b.is_active = 1',
      '(b.name LIKE ?1 OR b.description LIKE ?1 OR b.full_address LIKE ?1 OR b.city LIKE ?1 OR b.business_type LIKE ?1)'
    ];
    let params: any[] = [searchTerm];
    let paramIndex = 2;

    // Apply additional filters
    if (filters.city) {
      whereConditions.push(`b.city LIKE ?${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters.state) {
      whereConditions.push(`b.state LIKE ?${paramIndex}`);
      params.push(`%${filters.state}%`);
      paramIndex++;
    }

    if (filters.featured_only) {
      whereConditions.push('b.featured = 1');
    }

    if (filters.verified_only) {
      whereConditions.push('b.verified = 1');
    }

    // Build the main query
    let sqlQuery = `
      SELECT DISTINCT b.*
      FROM businesses b
    `;

    // Add joins for complex filters
    if (filters.categories && filters.categories.length > 0) {
      sqlQuery += ` INNER JOIN business_categories bc ON b.id = bc.business_id`;
      const categoryPlaceholders = filters.categories.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`bc.category_id IN (${categoryPlaceholders})`);
      params.push(...filters.categories);
    }

    if (filters.amenities && filters.amenities.length > 0) {
      sqlQuery += ` INNER JOIN business_amenities ba ON b.id = ba.business_id`;
      const amenityPlaceholders = filters.amenities.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`ba.amenity_id IN (${amenityPlaceholders})`);
      params.push(...filters.amenities);
    }

    if (filters.regions && filters.regions.length > 0) {
      sqlQuery += ` INNER JOIN business_regions br ON b.id = br.business_id`;
      const regionPlaceholders = filters.regions.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`br.region_id IN (${regionPlaceholders})`);
      params.push(...filters.regions);
    }

    // Add WHERE clause
    sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;

    // Add ORDER BY and LIMIT
    sqlQuery += ` ORDER BY b.featured DESC, b.rating DESC LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}`;
    params.push(pagination.limit, pagination.offset);

    const result = await client.execute({ sql: sqlQuery, args: params });
    
    // Get categories for each business
    const businessResults: BusinessResult[] = [];
    for (const business of result.rows) {
      const categoriesResult = await client.execute({
        sql: `
          SELECT c.id, c.name, c.slug, c.is_active
          FROM categories c
          INNER JOIN business_categories bc ON c.id = bc.category_id
          WHERE bc.business_id = ? AND c.is_active = 1
        `,
        args: [business.id]
      });

      businessResults.push({
        ...business,
        categories: categoriesResult.rows
      } as BusinessResult);
    }
    
    return businessResults;
  }

  /**
   * Get total count of businesses matching filters
   */
  async getBusinessCount(filters?: BusinessFilters): Promise<number> {
    let whereConditions = ['b.is_active = 1'];
    let params: any[] = [];
    let paramIndex = 1;

    // Apply simple filters
    if (filters?.city) {
      whereConditions.push(`b.city LIKE ?${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters?.state) {
      whereConditions.push(`b.state LIKE ?${paramIndex}`);
      params.push(`%${filters.state}%`);
      paramIndex++;
    }

    if (filters?.featured_only) {
      whereConditions.push('b.featured = 1');
    }

    if (filters?.verified_only) {
      whereConditions.push('b.verified = 1');
    }

    // Build the main query
    let query = `
      SELECT COUNT(DISTINCT b.id) as count
      FROM businesses b
    `;

    // Add joins for complex filters
    if (filters?.categories && filters.categories.length > 0) {
      query += ` INNER JOIN business_categories bc ON b.id = bc.business_id`;
      const categoryPlaceholders = filters.categories.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`bc.category_id IN (${categoryPlaceholders})`);
      params.push(...filters.categories);
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      query += ` INNER JOIN business_amenities ba ON b.id = ba.business_id`;
      const amenityPlaceholders = filters.amenities.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`ba.amenity_id IN (${amenityPlaceholders})`);
      params.push(...filters.amenities);
    }

    if (filters?.regions && filters.regions.length > 0) {
      query += ` INNER JOIN business_regions br ON b.id = br.business_id`;
      const regionPlaceholders = filters.regions.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`br.region_id IN (${regionPlaceholders})`);
      params.push(...filters.regions);
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await client.execute({ sql: query, args: params });
    return Number(result.rows[0]?.count || 0);
  }

  /**
   * Get total count of businesses matching search query and filters
   */
  async getSearchCount(query: string, filters?: BusinessFilters): Promise<number> {
    const searchTerm = `%${query}%`;
    let whereConditions = [
      'b.is_active = 1',
      '(b.name LIKE ?1 OR b.description LIKE ?1 OR b.full_address LIKE ?1 OR b.city LIKE ?1 OR b.business_type LIKE ?1)'
    ];
    let params: any[] = [searchTerm];
    let paramIndex = 2;

    // Apply additional filters
    if (filters?.city) {
      whereConditions.push(`b.city LIKE ?${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters?.state) {
      whereConditions.push(`b.state LIKE ?${paramIndex}`);
      params.push(`%${filters.state}%`);
      paramIndex++;
    }

    if (filters?.featured_only) {
      whereConditions.push('b.featured = 1');
    }

    if (filters?.verified_only) {
      whereConditions.push('b.verified = 1');
    }

    // Build the main query
    let sqlQuery = `
      SELECT COUNT(DISTINCT b.id) as count
      FROM businesses b
    `;

    // Add joins for complex filters
    if (filters?.categories && filters.categories.length > 0) {
      sqlQuery += ` INNER JOIN business_categories bc ON b.id = bc.business_id`;
      const categoryPlaceholders = filters.categories.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`bc.category_id IN (${categoryPlaceholders})`);
      params.push(...filters.categories);
    }

    if (filters?.amenities && filters.amenities.length > 0) {
      sqlQuery += ` INNER JOIN business_amenities ba ON b.id = ba.business_id`;
      const amenityPlaceholders = filters.amenities.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`ba.amenity_id IN (${amenityPlaceholders})`);
      params.push(...filters.amenities);
    }

    if (filters?.regions && filters.regions.length > 0) {
      sqlQuery += ` INNER JOIN business_regions br ON b.id = br.business_id`;
      const regionPlaceholders = filters.regions.map(() => `?${paramIndex++}`).join(',');
      whereConditions.push(`br.region_id IN (${regionPlaceholders})`);
      params.push(...filters.regions);
    }

    // Add WHERE clause
    sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;

    const result = await client.execute({ sql: sqlQuery, args: params });
    return Number(result.rows[0]?.count || 0);
  }
}

// Export a singleton instance
export const databaseService = new RealDatabase();