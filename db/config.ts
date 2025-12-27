import { defineDb, defineTable, column } from 'astro:db';

// Business table - main entity for gambling establishments
const Business = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    cid: column.text(),
    name: column.text(),
    slug: column.text(),
    rating: column.number(),
    reviews_count: column.number({ default: 0 }),
    full_address: column.text(),
    city: column.text(),
    state: column.text(),
    zip_code: column.text(),
    phone: column.text(),
    website: column.text(),
    image_url: column.text(),
    lat: column.number(),
    lng: column.number(),
    maps_url: column.text(),
    business_type: column.text(),
    description: column.text(),
    is_active: column.boolean({ default: true }),
    featured: column.boolean({ default: false }),
    verified: column.boolean({ default: false }),
    meta_title: column.text(),
    meta_description: column.text(),
    created_at: column.date({ default: new Date() }),
    updated_at: column.date({ default: new Date() })
  }
});

// Category table - business categories (e.g., Casino, Sports Betting)
const Category = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text(),
    is_active: column.boolean({ default: true })
  }
});

// Amenity table - services/features offered by businesses
const Amenity = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text(),
    category: column.text({ default: 'other' }), // Group amenities by category for display
    is_active: column.boolean({ default: true })
  }
});

// Region table - geographic regions for business organization
const Region = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text(),
    state: column.text(),
    country: column.text({ default: 'Australia' }) // Added country field to match real schema
  }
});

// Junction table for business-category many-to-many relationship
const BusinessCategory = defineTable({
  columns: {
    business_id: column.number({ references: () => Business.columns.id }),
    category_id: column.number({ references: () => Category.columns.id })
  }
});

// Junction table for business-amenity many-to-many relationship
const BusinessAmenity = defineTable({
  columns: {
    business_id: column.number({ references: () => Business.columns.id }),
    amenity_id: column.number({ references: () => Amenity.columns.id })
  }
});

// Junction table for business-region many-to-many relationship
const BusinessRegion = defineTable({
  columns: {
    business_id: column.number({ references: () => Business.columns.id }),
    region_id: column.number({ references: () => Region.columns.id })
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    businesses: Business,        // Map to real table name
    categories: Category,        // Map to real table name
    amenities: Amenity,         // Map to real table name
    regions: Region,            // Map to real table name
    business_categories: BusinessCategory,  // Map to real table name
    business_amenities: BusinessAmenity,    // Map to real table name
    business_regions: BusinessRegion       // Map to real table name
  }
});
