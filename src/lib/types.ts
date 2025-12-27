// Core database entity types
export interface Business {
  id: number;
  cid: string;
  name: string;
  slug: string;
  rating: number;
  reviews_count: number;
  full_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  image_url: string;
  lat: number;
  lng: number;
  maps_url: string;
  business_type: string;
  description: string;
  is_active: boolean;
  featured: boolean;
  verified: boolean;
  meta_title: string;
  meta_description: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface Amenity {
  id: number;
  name: string;
  slug: string;
  category: string;
  is_active: boolean;
}

export interface Region {
  id: number;
  name: string;
  slug: string;
  state: string;
  country: string;
}

// Extended types with relationships
export interface BusinessWithRelations extends Business {
  categories: Category[];
  amenities: Amenity[];
  regions: Region[];
}

export interface BusinessResult extends Business {
  categories?: Category[];
  amenities?: Amenity[];
  regions?: Region[];
}

export interface BusinessDetail extends Business {
  categories: Category[];
  amenities: Amenity[];
  regions: Region[];
}

// Filter and search types
export interface BusinessFilters {
  categories?: number[];
  amenities?: number[];
  regions?: number[];
  city?: string;
  state?: string;
  rating_min?: number;
  featured_only?: boolean;
  verified_only?: boolean;
}

export interface SearchParams extends BusinessFilters {
  query?: string;
  page?: number;
  limit?: number;
  sort?: 'name' | 'rating' | 'reviews_count' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
  total?: number;
  totalPages?: number;
}

// SEO and metadata types
export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: {
    title: string;
    description: string;
    image?: string;
    url?: string;
  };
  structuredData?: Record<string, any>;
}