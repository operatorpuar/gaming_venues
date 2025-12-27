# SEO System Documentation

## Overview

The SEO system provides comprehensive search engine optimization for the Gaming Venues Directory. It includes metadata generation, structured data markup, Open Graph tags, and SEO-friendly URL structures.

## Components

### 1. SEOHead Component (`src/components/SEOHead.astro`)

A reusable component that handles all SEO metadata generation:

- Primary meta tags (title, description, canonical)
- Open Graph tags for social media sharing
- Twitter Card tags
- Structured data injection
- Viewport and theme color meta tags

**Usage:**
```astro
<SEOHead 
  title="Page Title"
  description="Page description"
  canonical="/page-url"
  image="/image.jpg"
  type="website"
  structuredData={structuredDataObject}
  noindex={false}
/>
```

### 2. SEO Utilities (`src/lib/seo.ts`)

Core functions for generating SEO metadata:

#### `generateBusinessSEO(business: BusinessDetail): SEOData`
- Uses custom meta_title and meta_description when available
- Generates fallback metadata from business data
- Creates structured data markup for businesses
- Returns complete SEO data object

#### `generateCategorySEO(category: Category, businessCount: number): SEOData`
- Creates SEO metadata for category pages
- Includes business count in descriptions
- Generates structured data for collection pages

#### `generateRegionSEO(region: Region, businessCount: number): SEOData`
- Creates SEO metadata for regional pages
- Includes geographic information
- Generates structured data for location-based pages

#### `generateSearchSEO(query?: string, filters?: any, resultCount?: number): SEOData`
- Creates SEO metadata for search result pages
- Handles both search queries and filtered results
- Includes result counts when available

#### `sanitizeForSEO(text: string, maxLength: number): string`
- Removes HTML tags and extra whitespace
- Truncates text at word boundaries
- Ensures proper length limits for SEO

### 3. Breadcrumbs Component (`src/components/Breadcrumbs.astro`)

Provides navigation breadcrumbs with structured data:

- Generates breadcrumb structured data for SEO
- Provides accessible navigation
- Supports current page highlighting

**Usage:**
```astro
<Breadcrumbs 
  items={[
    { name: 'Home', url: '/' },
    { name: 'Category', url: '/category/casinos' }
  ]}
  current="Current Page"
/>
```

### 4. Sitemap Generation (`src/pages/sitemap.xml.ts`)

Automatically generates XML sitemap:

- Includes all business profile pages
- Includes category and region pages
- Sets appropriate change frequencies and priorities
- Caches for 1 hour

### 5. Robots.txt (`src/pages/robots.txt.ts`)

Generates robots.txt file:

- Allows all crawlers
- References sitemap location
- Sets crawl delay for respectful crawling
- Caches for 24 hours

## Implementation Details

### Custom vs Fallback Metadata

The system prioritizes custom metadata fields:

1. **Custom Fields**: Uses `meta_title` and `meta_description` from database when available
2. **Fallback Generation**: Automatically generates metadata from business data when custom fields are empty

### Structured Data

The system generates appropriate structured data for different page types:

- **Business Pages**: Uses `Casino` schema type with complete business information
- **Category Pages**: Uses `CollectionPage` schema with item lists
- **Region Pages**: Uses `CollectionPage` with geographic information
- **Search Pages**: Uses `SearchResultsPage` schema
- **Breadcrumbs**: Uses `BreadcrumbList` schema

### URL Structure

All URLs follow SEO-friendly patterns:

- Business profiles: `/business/{slug}`
- Categories: `/category/{slug}`
- Regions: `/region/{slug}`
- Search: `/businesses?query={term}`

### Open Graph Support

Complete Open Graph implementation:

- Proper og:type for different page types
- Absolute URLs for images and canonical links
- Site name and description
- Twitter Card support

## Usage Examples

### Business Profile Page

```astro
---
import { generateBusinessSEO } from '../lib/seo';

const business = await getBusinessBySlug(slug);
const seoData = generateBusinessSEO(business);
---

<Layout
  title={seoData.title}
  description={seoData.description}
  canonical={seoData.canonical}
  image={seoData.image}
  type="business.business"
  structuredData={seoData.structuredData}
>
```

### Category Page

```astro
---
import { generateCategorySEO } from '../lib/seo';

const category = await getCategoryBySlug(slug);
const businessCount = await getBusinessCountForCategory(category.id);
const seoData = generateCategorySEO(category, businessCount);
---

<Layout
  title={seoData.title}
  description={seoData.description}
  canonical={seoData.canonical}
  structuredData={seoData.structuredData}
>
```

## Testing

The SEO system includes comprehensive tests in `src/test/seo.test.ts`:

- Tests custom metadata usage
- Tests fallback metadata generation
- Tests text sanitization
- Tests structured data generation
- Tests all SEO utility functions

Run tests with:
```bash
npm test
```

## Best Practices

1. **Always use canonical URLs** to prevent duplicate content issues
2. **Keep titles under 60 characters** for optimal display in search results
3. **Keep descriptions between 150-160 characters** for optimal snippets
4. **Use structured data** to enhance search result appearance
5. **Include Open Graph tags** for better social media sharing
6. **Generate sitemaps automatically** to help search engines discover content
7. **Use breadcrumbs** for better navigation and SEO structure

## Performance Considerations

- SEO metadata generation is done at build time for static pages
- Sitemap is cached for 1 hour to reduce database load
- Robots.txt is cached for 24 hours
- Structured data is minified in production builds

## Future Enhancements

Potential improvements to consider:

1. **JSON-LD structured data** for richer search results
2. **Local business schema** for location-based businesses
3. **Review schema** integration for ratings and reviews
4. **FAQ schema** for common questions
5. **Event schema** for special events or promotions
6. **Automatic meta tag testing** to ensure compliance
7. **SEO performance monitoring** integration