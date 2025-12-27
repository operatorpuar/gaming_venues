// SEO utility functions for generating metadata and structured data
import type { Business, BusinessDetail, Category, Region } from './types';

export interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  structuredData?: Record<string, any>;
}

/**
 * Generate SEO metadata for business profiles
 */
export function generateBusinessSEO(business: BusinessDetail): SEOData {
  // Use custom meta fields if available, otherwise generate from business data
  const title = business.meta_title || `${business.name} - Gaming Venue in ${business.city}, ${business.state}`;
  
  const description = business.meta_description || generateBusinessDescription(business);
  
  const image = business.image_url || '/placeholder-business.svg';
  
  const canonical = `/business/${business.slug}`;
  
  const structuredData = generateBusinessStructuredData(business);
  
  return {
    title,
    description,
    canonical,
    image,
    structuredData
  };
}

/**
 * Generate fallback description from business data
 */
function generateBusinessDescription(business: BusinessDetail): string {
  const parts = [
    business.name,
    business.business_type && `${business.business_type}`,
    `in ${business.city}, ${business.state}`,
    business.rating > 0 && `Rated ${business.rating.toFixed(1)} stars`,
    business.reviews_count > 0 && `${business.reviews_count.toLocaleString()} reviews`
  ].filter(Boolean);
  
  let description = parts.join(' - ');
  
  // Add business description if available and space allows
  if (business.description && description.length < 120) {
    const remainingSpace = 160 - description.length - 3; // 3 for " - "
    const truncatedDesc = business.description.length > remainingSpace 
      ? business.description.substring(0, remainingSpace - 3) + '...'
      : business.description;
    description += ` - ${truncatedDesc}`;
  }
  
  return description.substring(0, 160);
}

/**
 * Generate structured data for business listings
 */
export function generateBusinessStructuredData(business: BusinessDetail): Record<string, any> {
  const structuredData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Casino",
    "name": business.name,
    "description": business.description,
    "url": business.website,
    "telephone": business.phone,
    "image": business.image_url || '/placeholder-business.svg',
    "address": {
      "@type": "PostalAddress",
      "streetAddress": business.full_address,
      "addressLocality": business.city,
      "addressRegion": business.state,
      "postalCode": business.zip_code,
      "addressCountry": "US"
    }
  };
  
  // Add rating if available
  if (business.rating > 0 && business.reviews_count > 0) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": business.rating,
      "reviewCount": business.reviews_count,
      "bestRating": 5,
      "worstRating": 1
    };
  }
  
  // Add geo coordinates if available
  if (business.lat && business.lng) {
    structuredData.geo = {
      "@type": "GeoCoordinates",
      "latitude": business.lat,
      "longitude": business.lng
    };
  }
  
  // Add opening hours if we had that data (placeholder for future)
  // structuredData.openingHours = business.opening_hours;
  
  return structuredData;
}

/**
 * Generate SEO metadata for category pages
 */
export function generateCategorySEO(category: Category, businessCount: number): SEOData {
  const title = `${category.name} Gaming Venues - Directory`;
  const description = `Discover ${businessCount} ${category.name.toLowerCase()} gaming venues and gambling establishments. Find the best ${category.name.toLowerCase()} locations near you.`;
  const canonical = `/category/${category.slug}`;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": description,
    "url": canonical,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": businessCount,
      "itemListElement": [] // Would be populated with actual businesses
    }
  };
  
  return {
    title,
    description,
    canonical,
    structuredData
  };
}

/**
 * Generate SEO metadata for region pages
 */
export function generateRegionSEO(region: Region, businessCount: number): SEOData {
  const title = `Gaming Venues in ${region.name}, ${region.state} - Directory`;
  const description = `Find ${businessCount} gaming venues and gambling establishments in ${region.name}, ${region.state}. Discover casinos, gaming halls, and entertainment venues in your area.`;
  const canonical = `/region/${region.slug}`;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": description,
    "url": canonical,
    "about": {
      "@type": "Place",
      "name": region.name,
      "containedInPlace": {
        "@type": "State",
        "name": region.state
      }
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": businessCount,
      "itemListElement": [] // Would be populated with actual businesses
    }
  };
  
  return {
    title,
    description,
    canonical,
    structuredData
  };
}

/**
 * Generate SEO metadata for amenity pages
 */
export function generateAmenitySEO(amenity: { name: string; slug: string; category: string }, businessCount: number): SEOData {
  const title = `Gaming Venues with ${amenity.name} - Directory`;
  const description = `Find ${businessCount} gaming venues and gambling establishments offering ${amenity.name.toLowerCase()}. Discover venues with ${amenity.name.toLowerCase()} amenities and services.`;
  const canonical = `/amenity/${amenity.slug}`;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": description,
    "url": canonical,
    "about": {
      "@type": "Thing",
      "name": amenity.name,
      "category": amenity.category
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": businessCount,
      "itemListElement": [] // Would be populated with actual businesses
    }
  };
  
  return {
    title,
    description,
    canonical,
    structuredData
  };
}

/**
 * Generate SEO metadata for search results pages
 */
export function generateSearchSEO(query?: string, filters?: any, resultCount?: number): SEOData {
  let title = 'Gaming Venues Directory';
  let description = 'Discover the best gambling establishments and gaming venues';
  
  if (query) {
    title = `"${query}" Gaming Venues - Search Results`;
    description = `Search results for "${query}" gaming venues. ${resultCount ? `Found ${resultCount} matching venues.` : 'Find gambling establishments and gaming venues.'}`;
  } else if (filters && Object.keys(filters).length > 0) {
    title = 'Filtered Gaming Venues - Directory';
    description = `Browse filtered gaming venues and gambling establishments. ${resultCount ? `${resultCount} venues match your criteria.` : 'Find venues that match your preferences.'}`;
  }
  
  const canonical = '/businesses';
  
  const structuredData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    "name": title,
    "description": description,
    "url": canonical
  };
  
  if (resultCount !== undefined) {
    structuredData.mainEntity = {
      "@type": "ItemList",
      "numberOfItems": resultCount
    };
  }
  
  return {
    title,
    description,
    canonical,
    structuredData
  };
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

/**
 * Sanitize and truncate text for SEO purposes
 */
export function sanitizeForSEO(text: string, maxLength: number = 160): string {
  if (!text) return '';
  
  // Remove HTML tags and extra whitespace
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength - 3); // Reserve 3 chars for '...'
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > maxLength * 0.8 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}