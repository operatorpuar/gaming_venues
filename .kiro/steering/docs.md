---
inclusion: always
---

# Project Documentation and Development Guidelines

## Documentation and Library Reference

- **Always use Context7 for library documentation**: When working with external libraries, frameworks, or APIs, automatically use the Context7 MCP tools to resolve library IDs and fetch current documentation without explicit requests
- **Prioritize official documentation**: Use Context7 to access up-to-date API references, configuration guides, and code examples
- **Auto-resolve dependencies**: When encountering unfamiliar packages or APIs in the codebase, proactively look up their documentation using Context7

## Astro Framework Conventions

- This is an Astro project - follow Astro's component architecture and file conventions
- Use `.astro` files for components that mix HTML, CSS, and JavaScript
- Place reusable components in `src/components/`
- Use `src/layouts/` for page templates and layout components
- Static assets go in `public/` directory
- Global styles belong in `src/styles/`

## Code Style and Architecture

- Follow TypeScript best practices - the project uses TypeScript configuration
- Use semantic HTML and accessible markup patterns
- Maintain separation of concerns between components, layouts, and pages
- Keep components focused and reusable
- Use Astro's built-in optimizations for images and assets

## Database and Configuration

- Database configuration is located in `db/config.ts`
- Seed data setup is in `db/seed.ts`
- Environment variables are managed through `.env` file
- Follow the existing project structure when adding new features