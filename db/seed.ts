import { db, Business, Category, Amenity, Region, BusinessCategory, BusinessAmenity, BusinessRegion } from 'astro:db';

// https://astro.build/db/seed
export default async function seed() {
  // Sample categories
  await db.insert(Category).values([
    { id: 1, name: 'Casino', slug: 'casino', is_active: true },
    { id: 2, name: 'Sports Betting', slug: 'sports-betting', is_active: true },
    { id: 3, name: 'Poker Room', slug: 'poker-room', is_active: true },
    { id: 4, name: 'Bingo Hall', slug: 'bingo-hall', is_active: true }
  ]);

  // Sample amenities
  await db.insert(Amenity).values([
    { id: 1, name: 'Parking', slug: 'parking', category: 'Facilities', is_active: true },
    { id: 2, name: 'Restaurant', slug: 'restaurant', category: 'Dining', is_active: true },
    { id: 3, name: 'Bar', slug: 'bar', category: 'Dining', is_active: true },
    { id: 4, name: 'ATM', slug: 'atm', category: 'Services', is_active: true },
    { id: 5, name: 'Live Entertainment', slug: 'live-entertainment', category: 'Entertainment', is_active: true }
  ]);

  // Sample regions
  await db.insert(Region).values([
    { id: 1, name: 'Las Vegas Strip', slug: 'las-vegas-strip', state: 'Nevada', is_active: true },
    { id: 2, name: 'Downtown Las Vegas', slug: 'downtown-las-vegas', state: 'Nevada', is_active: true },
    { id: 3, name: 'Atlantic City', slug: 'atlantic-city', state: 'New Jersey', is_active: true }
  ]);

  // Sample businesses
  await db.insert(Business).values([
    {
      id: 1,
      cid: 'sample-cid-1',
      name: 'Sample Casino Resort',
      slug: 'sample-casino-resort',
      rating: 4.5,
      reviews_count: 1250,
      full_address: '123 Casino Blvd, Las Vegas, NV 89109',
      city: 'Las Vegas',
      state: 'Nevada',
      zip_code: '89109',
      phone: '(702) 555-0123',
      website: 'https://samplecasino.com',
      image_url: 'https://example.com/casino-image.jpg',
      lat: 36.1162,
      lng: -115.1739,
      maps_url: 'https://maps.google.com/sample',
      business_type: 'Casino Resort',
      description: 'A premier gaming destination featuring slots, table games, and luxury amenities.',
      is_active: true,
      featured: true,
      verified: true,
      meta_title: 'Sample Casino Resort - Premier Gaming in Las Vegas',
      meta_description: 'Experience world-class gaming and entertainment at Sample Casino Resort in Las Vegas.',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Sample business-category relationships
  await db.insert(BusinessCategory).values([
    { business_id: 1, category_id: 1 }, // Sample Casino -> Casino
    { business_id: 1, category_id: 2 }  // Sample Casino -> Sports Betting
  ]);

  // Sample business-amenity relationships
  await db.insert(BusinessAmenity).values([
    { business_id: 1, amenity_id: 1 }, // Sample Casino -> Parking
    { business_id: 1, amenity_id: 2 }, // Sample Casino -> Restaurant
    { business_id: 1, amenity_id: 3 }, // Sample Casino -> Bar
    { business_id: 1, amenity_id: 4 }  // Sample Casino -> ATM
  ]);

  // Sample business-region relationships
  await db.insert(BusinessRegion).values([
    { business_id: 1, region_id: 1 } // Sample Casino -> Las Vegas Strip
  ]);
}
