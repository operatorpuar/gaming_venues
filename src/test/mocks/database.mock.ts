// Mock database service for testing
import type { 
  BusinessResult, 
  BusinessDetail, 
  BusinessFilters, 
  Pagination,
  Category,
  Amenity,
  Region
} from '../../lib/types';

// Mock data
const mockBusinesses: BusinessResult[] = [
  {
    id: 1,
    cid: 'test-cid-1',
    name: 'Test Casino Resort',
    slug: 'test-casino-resort',
    rating: 4.5,
    reviews_count: 150,
    full_address: '123 Casino Blvd, Las Vegas, NV 89101',
    city: 'Las Vegas',
    state: 'NV',
    zip_code: '89101',
    phone: '555-0123',
    website: 'https://testcasino.com',
    image_url: 'https://example.com/casino1.jpg',
    lat: 36.1699,
    lng: -115.1398,
    maps_url: 'https://maps.google.com/test1',
    business_type: 'Casino Resort',
    description: 'A premier gaming destination with slots, table games, and entertainment.',
    is_active: true,
    featured: true,
    verified: true,
    meta_title: 'Test Casino Resort - Premier Gaming in Las Vegas',
    meta_description: 'Experience world-class gaming at Test Casino Resort in Las Vegas.',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-12-01'),
    categories: [
      { id: 1, name: 'Casinos', slug: 'casinos', is_active: true },
      { id: 2, name: 'Hotels', slug: 'hotels', is_active: true }
    ]
  },
  {
    id: 2,
    cid: 'test-cid-2',
    name: 'Lucky Gaming Hall',
    slug: 'lucky-gaming-hall',
    rating: 3.8,
    reviews_count: 89,
    full_address: '456 Gaming St, Reno, NV 89502',
    city: 'Reno',
    state: 'NV',
    zip_code: '89502',
    phone: '555-0456',
    website: 'https://luckygaming.com',
    image_url: 'https://example.com/casino2.jpg',
    lat: 39.5296,
    lng: -119.8138,
    maps_url: 'https://maps.google.com/test2',
    business_type: 'Gaming Hall',
    description: 'Local gaming hall with friendly atmosphere and great odds.',
    is_active: true,
    featured: false,
    verified: true,
    meta_title: '',
    meta_description: '',
    created_at: new Date('2023-02-01'),
    updated_at: new Date('2023-11-01'),
    categories: [
      { id: 1, name: 'Casinos', slug: 'casinos', is_active: true }
    ]
  },
  {
    id: 3,
    cid: 'test-cid-3',
    name: 'Sports Betting Central',
    slug: 'sports-betting-central',
    rating: 4.2,
    reviews_count: 67,
    full_address: '789 Sports Ave, Carson City, NV 89701',
    city: 'Carson City',
    state: 'NV',
    zip_code: '89701',
    phone: '555-0789',
    website: 'https://sportsbetting.com',
    image_url: 'https://example.com/sportsbook.jpg',
    lat: 39.1638,
    lng: -119.7674,
    maps_url: 'https://maps.google.com/test3',
    business_type: 'Sportsbook',
    description: 'Premier sports betting facility with live odds and multiple screens.',
    is_active: true,
    featured: true,
    verified: false,
    meta_title: '',
    meta_description: '',
    created_at: new Date('2023-03-01'),
    updated_at: new Date('2023-10-01'),
    categories: [
      { id: 3, name: 'Sports Betting', slug: 'sports-betting', is_active: true }
    ]
  }
];

const mockCategories: Category[] = [
  { id: 1, name: 'Casinos', slug: 'casinos', is_active: true },
  { id: 2, name: 'Hotels', slug: 'hotels', is_active: true },
  { id: 3, name: 'Sports Betting', slug: 'sports-betting', is_active: true },
  { id: 4, name: 'Poker Rooms', slug: 'poker-rooms', is_active: true }
];

const mockAmenities: Amenity[] = [
  { id: 1, name: 'Free WiFi', slug: 'free-wifi', category: 'Technology', is_active: true },
  { id: 2, name: 'Parking', slug: 'parking', category: 'Convenience', is_active: true },
  { id: 3, name: 'Restaurant', slug: 'restaurant', category: 'Dining', is_active: true },
  { id: 4, name: 'ATM', slug: 'atm', category: 'Banking', is_active: true },
  { id: 5, name: 'Live Entertainment', slug: 'live-entertainment', category: 'Entertainment', is_active: true }
];

const mockRegions: Region[] = [
  { id: 1, name: 'Las Vegas Strip', slug: 'las-vegas-strip', state: 'Nevada', country: 'US' },
  { id: 2, name: 'Downtown Las Vegas', slug: 'downtown-las-vegas', state: 'Nevada', country: 'US' },
  { id: 3, name: 'Reno Area', slug: 'reno-area', state: 'Nevada', country: 'US' },
  { id: 4, name: 'Carson City', slug: 'carson-city', state: 'Nevada', country: 'US' }
];

export class MockDatabaseService {
  async getBusinesses(filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    let filteredBusinesses = [...mockBusinesses];
    
    // Apply filters
    if (filters.featured_only) {
      filteredBusinesses = filteredBusinesses.filter(b => b.featured);
    }
    
    if (filters.verified_only) {
      filteredBusinesses = filteredBusinesses.filter(b => b.verified);
    }
    
    if (filters.rating_min) {
      filteredBusinesses = filteredBusinesses.filter(b => b.rating >= filters.rating_min!);
    }
    
    if (filters.city) {
      filteredBusinesses = filteredBusinesses.filter(b => 
        b.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }
    
    if (filters.state) {
      filteredBusinesses = filteredBusinesses.filter(b => 
        b.state.toLowerCase().includes(filters.state!.toLowerCase())
      );
    }
    
    if (filters.categories && filters.categories.length > 0) {
      filteredBusinesses = filteredBusinesses.filter(b => 
        b.categories?.some(c => filters.categories!.includes(c.id))
      );
    }
    
    // Apply pagination
    const start = pagination.offset;
    const end = start + pagination.limit;
    
    return filteredBusinesses.slice(start, end);
  }

  async getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
    const business = mockBusinesses.find(b => b.slug === slug);
    if (!business) return null;
    
    return {
      ...business,
      categories: business.categories || [],
      amenities: mockAmenities.slice(0, 3), // Mock some amenities
      regions: [mockRegions[0]] // Mock a region
    };
  }

  async getCategories(): Promise<Category[]> {
    return mockCategories.filter(c => c.is_active);
  }

  async getAmenities(): Promise<Amenity[]> {
    return mockAmenities.filter(a => a.is_active);
  }

  async getRegions(): Promise<Region[]> {
    return mockRegions;
  }

  async searchBusinesses(query: string, filters: BusinessFilters, pagination: Pagination): Promise<BusinessResult[]> {
    const searchTerm = query.toLowerCase();
    let searchResults = mockBusinesses.filter(b => 
      b.name.toLowerCase().includes(searchTerm) ||
      b.description.toLowerCase().includes(searchTerm) ||
      b.full_address.toLowerCase().includes(searchTerm) ||
      b.business_type.toLowerCase().includes(searchTerm)
    );
    
    // Apply additional filters
    if (filters.featured_only) {
      searchResults = searchResults.filter(b => b.featured);
    }
    
    if (filters.verified_only) {
      searchResults = searchResults.filter(b => b.verified);
    }
    
    if (filters.rating_min) {
      searchResults = searchResults.filter(b => b.rating >= filters.rating_min!);
    }
    
    // Apply pagination
    const start = pagination.offset;
    const end = start + pagination.limit;
    
    return searchResults.slice(start, end);
  }

  async getBusinessCount(filters?: BusinessFilters): Promise<number> {
    let filteredBusinesses = [...mockBusinesses];
    
    if (filters?.featured_only) {
      filteredBusinesses = filteredBusinesses.filter(b => b.featured);
    }
    
    if (filters?.verified_only) {
      filteredBusinesses = filteredBusinesses.filter(b => b.verified);
    }
    
    if (filters?.rating_min) {
      filteredBusinesses = filteredBusinesses.filter(b => b.rating >= filters.rating_min!);
    }
    
    if (filters?.categories && filters.categories.length > 0) {
      filteredBusinesses = filteredBusinesses.filter(b => 
        b.categories?.some(c => filters.categories!.includes(c.id))
      );
    }
    
    if (filters?.amenities && filters.amenities.length > 0) {
      // For mock purposes, assume all businesses have all amenities
      // In real implementation, this would filter by actual amenity relationships
    }
    
    if (filters?.regions && filters.regions.length > 0) {
      // For mock purposes, assume all businesses are in all regions
      // In real implementation, this would filter by actual region relationships
    }
    
    return filteredBusinesses.length;
  }

  async getSearchCount(query: string, filters?: BusinessFilters): Promise<number> {
    const searchTerm = query.toLowerCase();
    let searchResults = mockBusinesses.filter(b => 
      b.name.toLowerCase().includes(searchTerm) ||
      b.description.toLowerCase().includes(searchTerm) ||
      b.full_address.toLowerCase().includes(searchTerm) ||
      b.business_type.toLowerCase().includes(searchTerm)
    );
    
    if (filters?.featured_only) {
      searchResults = searchResults.filter(b => b.featured);
    }
    
    if (filters?.verified_only) {
      searchResults = searchResults.filter(b => b.verified);
    }
    
    return searchResults.length;
  }

  async getCategoriesWithCounts(): Promise<Array<Category & { business_count: number }>> {
    return mockCategories.map(category => ({
      ...category,
      business_count: mockBusinesses.filter(b => 
        b.categories?.some(c => c.id === category.id)
      ).length
    }));
  }

  async getAmenitiesWithCounts(): Promise<Array<Amenity & { business_count: number }>> {
    return mockAmenities.map(amenity => ({
      ...amenity,
      business_count: mockBusinesses.length // All businesses have all amenities for mock
    }));
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return mockCategories.find(c => c.slug === slug) || null;
  }

  async getAmenityBySlug(slug: string): Promise<Amenity | null> {
    return mockAmenities.find(a => a.slug === slug) || null;
  }

  async getRegionsWithCounts(): Promise<Array<Region & { business_count: number }>> {
    return mockRegions.map(region => ({
      ...region,
      business_count: mockBusinesses.length // All businesses are in all regions for mock
    }));
  }

  async getRegionBySlug(slug: string): Promise<Region | null> {
    return mockRegions.find(r => r.slug === slug) || null;
  }

  async getStatesWithCounts(): Promise<Array<{ state: string; business_count: number; region_count: number }>> {
    const states = [...new Set(mockRegions.map(r => r.state))];
    return states.map(state => ({
      state,
      business_count: mockBusinesses.filter(b => b.state === state.split(' ')[0]).length,
      region_count: mockRegions.filter(r => r.state === state).length
    }));
  }

  async getRegionsByState(state: string): Promise<Array<Region & { business_count: number }>> {
    return mockRegions
      .filter(r => r.state.toLowerCase().includes(state.toLowerCase()))
      .map(region => ({
        ...region,
        business_count: mockBusinesses.length // All businesses are in all regions for mock
      }));
  }
}

export const mockDatabaseService = new MockDatabaseService();