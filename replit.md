# OpenRoad Data Tools

## Overview
OpenRoad Data Tools is a web application for collecting map points. Users drop pins anywhere on a map and record an ID, coordinates, an approach direction, an optional description and an optional distance. The whole set exports as a single CSV file (`points.csv`), on its own or inside a ZIP, and imports back the same way. Everything runs client-side with no server dependency, so field data can be gathered, shared as a CSV and re-loaded anywhere.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application follows a client-side architecture optimized for browser-based operation, prioritizing local persistence over server-side interaction.

### Core Technologies:
- **Frontend**: React-based single-page application built with Vite.
- **Storage**: Browser localStorage with a custom service layer and React hooks, enabling complete client-side data persistence.
- **Data Persistence**: Client-side JSON serialization with automatic type conversion.
- **Build System**: Vite for frontend bundling.
- **Framework**: React 18 with TypeScript.
- **Navigation**: State-based navigation using Zustand store (no URL routing) for perfect static site hosting compatibility.
- **State Management**: Zustand for global state management.
- **UI Components**: Radix UI primitives with shadcn/ui styling.
- **Styling**: Tailwind CSS with CSS variables for theming.
- **Forms**: React Hook Form with Zod validation.
- **Data Validation**: Zod schemas for runtime type checking and serialization.
- **File Processing**: Client-side ZIP generation using browser APIs.

### Design Principles & Features:
- **UI/UX Decisions**: Professional government-friendly design utilizing a navy blue primary color scheme, neutral grays, and compact layouts for efficiency. Features like clickable table rows, optimized spacing, and smaller font sizes enhance usability and data density. Fully responsive design ensures optimal viewing and functionality across all device sizes from mobile phones to desktop displays.
- **Technical Implementations**:
    - **Client-Side Operation**: Complete conversion from server-based APIs to localStorage, making the application fully functional offline without server or database requirements.
    - **State-Based Navigation**: The app uses Zustand state management for navigation instead of URL routing, keeping the URL constant at the root path. This architecture enables perfect static site hosting without requiring server-side routing or rewrite rules. All navigation (Points, Settings, Import, Export) happens through state changes, making the app a true single-page application.
    - **Import/Export System**: Single-file CSV export (`points.csv`) and validation-based import with replace/merge modes. Import matches column names leniently and accepts headerless files, so ordinary spreadsheets load as readily as files this tool produced.
    - **Points View**: A resizable split of interactive map and sortable, searchable table. Clicking the map drops a point; markers are draggable; each point opens a form for direction, description and distance.
    - **Visual Phase Editor**: Interactive map-based tool for configuring phases, including click-to-draw directions, rapid multi-phase creation, and automatic bearing calculation.
    - **Direction Visualization**: Each point with a direction is drawn as a pin pointing along that heading, at a fixed pixel size so headings stay readable at every zoom.
    - **User Workflow Enhancements**: Features like "Duplicate to Left Turn" for phases, automatic phase number mapping, and interactive location editing on maps streamline configuration.
    - **Schema Standardization**: Data models are aligned with exact TXT export requirements for consistent data exchange.
    - **SEO & Social Sharing**: Comprehensive meta tags including Open Graph and Twitter Card support for professional social media previews with custom map imagery, optimized for search engine visibility.
- **System Design Choices**:
    - **Monorepo Structure**: Frontend, backend (development only), and shared code are co-located for simplified development and type sharing.
    - **Type Safety**: End-to-end TypeScript with shared schemas ensures data consistency and reduces errors.
    - **Component Architecture**: Modular UI components utilizing shadcn/ui for consistency and reusability.
    - **Validation Strategy**: Zod schemas are shared between client and (formerly) server for consistent validation logic.

## External Dependencies

### Frontend Dependencies:
- **UI Framework**: React, Radix UI primitives
- **Styling**: Tailwind CSS, `class-variance-authority`
- **Forms & Validation**: React Hook Form, Zod, `@hookform/resolvers`
- **State Management**: Zustand (includes navigation state)
- **Date Handling**: `date-fns`