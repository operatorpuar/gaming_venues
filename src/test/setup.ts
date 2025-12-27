// Test setup file for mocking
import { vi } from 'vitest';
import { mockDatabaseService } from './mocks/database.mock';

// Mock the database service
vi.mock('../lib/database', () => ({
  databaseService: mockDatabaseService,
  TursoDatabase: vi.fn()
}));

// Mock Astro DB imports
vi.mock('astro:db', () => ({
  db: {},
  eq: vi.fn(),
  like: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  gte: vi.fn(),
  businesses: {},
  categories: {},
  amenities: {},
  regions: {},
  business_categories: {},
  business_amenities: {},
  business_regions: {}
}));