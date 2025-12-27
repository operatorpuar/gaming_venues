// Basic tests for SEO functionality
import { describe, it, expect } from 'vitest';
import { 
  generateBusinessSEO, 
  generateCategorySEO, 
  generateRegionSEO,
  generateSearchSEO,
  sanitizeForSEO 
} from '../lib/seo';
import type { BusinessDetail, Category, Region } from '../lib/types';

describe('SEO Utilities', () => {
  const mockBusiness: BusinessDetail = {
    id: 1,
    cid: 'test-cid',
    name: 'Test Casino',
    slug: 'test-casino',
    rating: 4.5,
    reviews_count: 100,
    full_address: '123 Main St',
    city: 'Las Vegas',
    state: 'NV',
    zip_code: '89101',
    phone: '555-0123',
    website: 'https://testcasino.com',
    image_url: 'https://example.com/image.jpg',
    lat: 36.1699,
    lng: -115.1398,
    maps_url: 'https://maps.google.com/test',
    business_type: 'Casino',
    description: 'A great casino with excellent gaming options',
    is_active: true,
    featured: true,
    verified: true,
    meta_title: '',
    meta_description: '',
    created_at: new Date(),
    updated_at: new Date(),
    categories: [],
    amenities: [],
    regions: []
  };

  const mockCategory: Category = {
    id: 1,
    name: 'Casinos',
    slug: 'casinos',
    is_active: true
  };

  const mockRegion: Region = {
    id: 1,
    name: 'Las Vegas Strip',
    slug: 'las-vegas-strip',
    state: 'Nevada',
    country: 'US'
  };

  it('should generate business SEO with custom meta fields', () => {
    const businessWithCustomMeta = {
      ...mockBusiness,
      meta_title: 'Custom Title',
      meta_description: 'Custom description'
    };

    const seo = generateBusinessSEO(businessWithCustomMeta);

    expect(seo.title).toBe('Custom Title');
    expect(seo.description).toBe('Custom description');
    expect(seo.canonical).toBe('/business/test-casino');
    expect(seo.structuredData).toBeDefined();
    expect(seo.structuredData!['@type']).toBe('Casino');
  });

  it('should generate fallback business SEO when custom meta is empty', () => {
    const seo = generateBusinessSEO(mockBusiness);

    expect(seo.title).toContain('Test Casino');
    expect(seo.title).toContain('Las Vegas');
    expect(seo.description).toContain('Test Casino');
    expect(seo.description).toContain('Casino');
    expect(seo.canonical).toBe('/business/test-casino');
  });

  it('should generate category SEO', () => {
    const seo = generateCategorySEO(mockCategory, 50);

    expect(seo.title).toContain('Casinos');
    expect(seo.description).toContain('50');
    expect(seo.canonical).toBe('/category/casinos');
    expect(seo.structuredData).toBeDefined();
  });

  it('should generate region SEO', () => {
    const seo = generateRegionSEO(mockRegion, 25);

    expect(seo.title).toContain('Las Vegas Strip');
    expect(seo.description).toContain('25');
    expect(seo.canonical).toBe('/region/las-vegas-strip');
    expect(seo.structuredData).toBeDefined();
  });

  it('should generate search SEO', () => {
    const seo = generateSearchSEO('poker', {}, 10);

    expect(seo.title).toContain('poker');
    expect(seo.description).toContain('poker');
    expect(seo.description).toContain('10');
    expect(seo.canonical).toBe('/businesses');
  });

  it('should sanitize text for SEO', () => {
    const longText = 'This is a very long text that exceeds the maximum length limit and should be truncated properly at word boundaries to ensure good SEO practices and readability for users and search engines alike.';
    
    const sanitized = sanitizeForSEO(longText, 100);
    
    expect(sanitized.length).toBeLessThanOrEqual(100);
    expect(sanitized).toMatch(/\.\.\.$/); // Should end with ellipsis
    expect(sanitized).not.toMatch(/\s\.\.\.$/); // Should not have space before ellipsis
  });

  it('should handle HTML tags in sanitization', () => {
    const htmlText = '<p>This is <strong>bold</strong> text with <a href="#">links</a></p>';
    
    const sanitized = sanitizeForSEO(htmlText);
    
    expect(sanitized).toBe('This is bold text with links');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
  });
});