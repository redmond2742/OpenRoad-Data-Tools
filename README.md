# OpenRoad Data Tools - Map Point Collector

Drop pins anywhere on a map, record what matters about each one, and export the whole set as a single
CSV. OpenRoad Data Tools runs entirely in your browser — your points are stored locally and nothing is
sent to a server.

**Repository:** https://github.com/redmond2742/OpenRoad-Data-Tools

---

## 🤔 What is this for?

You need a list of *places*. Where the sign is. Where the stop bar sits. Where you counted traffic,
spotted the pothole, parked the trailer, or aimed the camera. Each one needs a location, usually the
direction traffic approaches it from, sometimes a note, and sometimes a measurement. Then somebody
downstream needs that list as a plain CSV they can open in Excel or feed into their own system.

Today that job falls between two bad options:

- **A spreadsheet**, where you type coordinates by hand and never quite trust them, and where nobody
  can see whether point 12 is actually at the intersection you meant.
- **Full GIS software**, which does this and ten thousand other things, and which you have to install,
  license, and learn first.

OpenRoad Data Tools is the middle ground: a map you click on, a table you fill in, and a CSV you
download. Open the page, click where the thing is, type what it is, hit Export. That's the whole tool.

### Good fits

- **Field inventory** — signs, poles, cabinets, hydrants, sensors, damage reports
- **Traffic data collection** — count locations, stop bars, detection points, approach measurements
- **Site notes** — anywhere you'd otherwise photograph a map and scribble on it
- **Handing coordinates to someone else** — the CSV is the deliverable, and it opens anywhere

### Deliberately not

It is not a GIS, a database, or a drawing tool. There are no lines, polygons, layers, or accounts —
one flat list of points and one CSV. If you need more than that, export the CSV and take it somewhere
that does.

### Why direction is a first-class field

Most point tools give you a pin and a label. For roadway work that isn't enough: a stop bar 200 ft
back on the *northbound* approach is a different thing from one on the southbound. So every point can
carry a direction — `NB`/`SB`/`EB`/`WB` or an exact bearing — and the pin itself points along it, so
you can check at a glance that you tagged the right approach.

---

## ⚡ Quick start

You need [Node.js](https://nodejs.org) 18 or newer. Then:

```bash
git clone https://github.com/redmond2742/OpenRoad-Data-Tools.git
cd OpenRoad-Data-Tools
npm install
npm run dev
```

Open **http://localhost:5001** and click on the map. That's it — no database to set up, no API keys,
no account to create.

### The commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server on port 5001, with hot reload |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run start` | Serve the production build |
| `npm run check` | Type-check the whole project with TypeScript |

### Where your data lives

Points are saved in your browser's `localStorage` under the key `openroad_points`. That means:

- **It persists** across page reloads and between sessions, on that browser.
- **It's private** — nothing is uploaded, so there's nothing to leak and no server to run.
- **It's per-browser** — your points won't follow you to another machine, another browser, or a
  private window.

So treat **Export** as your save button. Download the CSV whenever you have work worth keeping, and
use **Import** to load it back on any machine.

---

## 📍 Features

### Core Functionality
- **Click to drop pins**: Click anywhere on the map to create a point, then click a second time where
  traffic comes from to set its direction; drag a pin to move it
- **Approach direction**: Record a general heading (NB, SB, EB, WB) or an exact compass bearing; the
  pin itself points along it
- **Optional details**: A free-text description and a distance in feet, both optional
- **Point IDs**: Simple sequential numbering, or unique 10-character IDs so datasets from different
  people can be merged without collisions
- **CSV export**: Download `points.csv` on its own or inside a ZIP, or copy it straight to the clipboard
- **CSV import with column mapping**: Upload, drag-and-drop or paste. Files exported here import
  unchanged; any other spreadsheet works too — say what each column means, ignore the ones you don't
  need, or combine several into one field

### Advanced Capabilities
- **Interactive mapping**: Leaflet with OpenStreetMap tiles, plus optional Mapbox satellite imagery
- **Lenient import**: Column names are matched loosely (`lat`, `lon`, `Distance (ft)`, `ID#` …),
  headerless files are read in canonical column order, and directions are understood as words
  (`Northbound`, `west`, `SE`) as well as codes and bearings
- **Replace or merge**: Overwrite everything, or append and skip duplicate IDs
- **Local storage**: Complete browser-based data persistence (no server required)
- **Responsive design**: Works on desktop and mobile

## 📄 The CSV Format

Every point is one row:

```
id,latitude,longitude,direction,description,distance_ft
1,37.7749,-122.4194,NB,Stop bar,150
2,37.7762,-122.418,135,Camera pole,0
3,37.7751,-122.4166,,,0
```

| Column | Required | Notes |
|---|---|---|
| `id` | assigned for you | Counts up `1, 2, 3…`, or a unique 10-character ID when that option is on |
| `latitude` | yes | Decimal degrees, −90 to 90 |
| `longitude` | yes | Decimal degrees, −180 to 180 |
| `direction` | no | `NB`, `SB`, `EB`, `WB`, or a bearing `0`–`360` |
| `description` | no | Any text |
| `distance_ft` | no | Defaults to `0` |

`direction` is the heading of **travel**: a northbound point (`NB`, or `0`) is approached from the
south, and its pin points north.

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui components for modern styling
- **Zustand** for lightweight state management
- **Leaflet** for interactive mapping capabilities

### Data Management
- **Browser localStorage** for client-side data persistence
- **Custom localStorage hooks** for React integration
- **Zod / Drizzle schemas** for type-safe data structures
- **CSV generation** with spreadsheet formula-injection protection

### Development Tools
- **TypeScript** for static type checking
- **ESBuild** for fast compilation
- **PostCSS** with Autoprefixer for CSS processing

## 📋 Installation

See [Quick start](#-quick-start) above for the short version. In full:

### Prerequisites

- **Node.js** (version 18.0 or higher)
- **npm** (comes with Node.js) or **yarn**
- **Git** for version control

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 8.0.0 or higher
git --version   # Should show git version info
```

### 1. Clone the Repository
```bash
git clone https://github.com/redmond2742/OpenRoad-Data-Tools.git
cd OpenRoad-Data-Tools
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5001`.

### 4. Build for Production
```bash
npm run build
```

This creates an optimized production build in the `dist` folder — `dist/public` holds the static site,
which is all you need to deploy.

### Optional: satellite imagery

Set `VITE_MAPBOX_TOKEN` in a `.env` file at the project root to add a Mapbox satellite base layer
alongside OpenStreetMap. Without it the map uses OpenStreetMap tiles only, and everything else works
the same.

## 🌐 Server Deployment

OpenRoad Data Tools is a client-side application that runs entirely in the browser. It can be deployed
to any web server that can serve static files.

### Option 1: Static Web Server (Nginx)

#### Prerequisites
- Ubuntu/Debian or similar Linux distribution
- Root or sudo access
- Domain name (optional)

#### Step 1: Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### Step 2: Build the Application
```bash
npm run build
```

#### Step 3: Copy Build Files to Web Server
```bash
# Create application directory
sudo mkdir -p /var/www/openroad-data-tools

# Copy build files
sudo cp -r dist/* /var/www/openroad-data-tools/

# Set correct permissions
sudo chown -R www-data:www-data /var/www/openroad-data-tools
sudo chmod -R 755 /var/www/openroad-data-tools
```

#### Step 4: Configure Nginx
Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/openroad-data-tools
```

Add the following configuration:
```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name your-domain.com;  # Replace with your domain or server IP
    
    root /var/www/openroad-data-tools;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Step 5: Enable the Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/openroad-data-tools /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 6: Configure Firewall (if applicable)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Your application is now accessible at `http://your-domain.com` or `http://your-server-ip`

### Option 2: Apache Server

#### Step 1: Install Apache
```bash
sudo apt update
sudo apt install apache2
```

#### Step 2: Build and Deploy
```bash
npm run build
sudo mkdir -p /var/www/openroad-data-tools
sudo cp -r dist/* /var/www/openroad-data-tools/
sudo chown -R www-data:www-data /var/www/openroad-data-tools
```

#### Step 3: Configure Apache
```bash
sudo nano /etc/apache2/sites-available/openroad-data-tools.conf
```

Add configuration:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/openroad-data-tools
    
    <Directory /var/www/openroad-data-tools>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
</VirtualHost>
```

#### Step 4: Enable and Restart
```bash
sudo a2enmod rewrite
sudo a2ensite openroad-data-tools.conf
sudo systemctl restart apache2
```

### Option 3: Docker Deployment

#### Create Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Create nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### Build and Run
```bash
# Build Docker image
docker build -t openroad-data-tools .

# Run container
docker run -d -p 80:80 --name openroad-data-tools openroad-data-tools

# Or use docker-compose
docker-compose up -d
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  openroad-data-tools:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

### Option 4: Cloud Platforms

#### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy automatically on git push

#### Vercel
1. Import project from GitHub
2. Vercel auto-detects Vite configuration
3. Deploy with zero configuration

#### AWS S3 + CloudFront
1. Build: `npm run build`
2. Create S3 bucket and enable static website hosting
3. Upload `dist` folder contents to S3
4. Configure CloudFront distribution for HTTPS and caching
5. Update DNS to point to CloudFront

### SSL/HTTPS Configuration

#### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## 📁 Project Structure

```
OpenRoad-Data-Tools/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/         # Base UI components (shadcn/ui) + map tile layers
│   │   │   └── openroad/   # Domain components (map, table, modal, import, export)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Application pages
│   │   └── App.tsx         # Main application component
│   └── index.html          # HTML entry point
├── server/                 # Express server (serves Vite in dev, static files in prod)
├── packages/               # npm packages
│   └── openroad/           # openroad package — the shared data layer
│       ├── localStorage.ts      # Point CRUD, ID assignment, CSV import/export
│       ├── localStorageHooks.ts # React hooks over the storage layer
│       ├── store/               # Zustand state
│       ├── utils.ts             # Direction helpers, map projection
│       └── schema/schema.ts     # The Point entity
├── components.json         # shadcn/ui configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🎯 Usage Guide

### Getting Started
1. **Drop a pin**: Click anywhere on the map. A point appears in the table below with the next ID.
2. **Fill in the details**: Click the row (or the pin's Edit button) to set direction, description and
   distance. All three are optional.
3. **Adjust the position**: Drag any pin to move it; the coordinates update as you go.
4. **Export**: Download `points.csv`, or copy its contents straight from the preview.

### Key Workflows

#### Adding Points

Adding a point on the map takes two clicks:

1. **Click where the point is.** The pin drops immediately and gets the next ID.
2. **Click where traffic comes from.** The bearing from that second click back to the pin becomes the
   point's direction, and the pin turns to point along it.

While you're choosing the second point, a dashed line follows your cursor to the pin so you can see
the heading you're about to record. If the point doesn't need a direction, press **Esc** or hit
**Skip** in the banner — the point stays exactly where you put it, just without a direction.

- **Click to add**: On by default. Toggle it off from the button on the map when you want to pan and
  zoom without dropping pins.
- **Add Point button**: Opens a form where you can type coordinates directly.
- **Drag to reposition**: Every pin is draggable.

#### Setting a Direction
- **On the map**: the second click of the two-click flow above, which records an exact bearing.
- **In the form**: choose **None**, one of the four general headings (**NB/SB/EB/WB**), or type an
  exact bearing in **Degrees**.
- The pin grows a nose pointing along the heading. It's drawn at a fixed pixel size, so it stays
  readable at every zoom level and a dense cluster of points doesn't turn into a thicket of lines.

#### Point IDs
- By default IDs count up: `1, 2, 3…`
- Turn on **Use unique IDs** in Settings to get random 10-character IDs instead, so two people mapping
  different sites never produce the same ID.
- Numbers are never reused: delete point 3 and the next point you add is 4.

#### Import and Export
- **Export** downloads `points.csv`, either on its own or inside a ZIP.
- **Import** accepts `.csv`, `.txt` and `.zip`, by upload, drag-and-drop or paste.
- **Overwrite** replaces everything; **Append** keeps what you have and skips duplicate IDs.
- Bad rows are reported individually with their row number, and nothing is imported until you confirm.

#### Importing a spreadsheet that isn't ours

Any CSV works, whatever its columns are called. On import you get a **Columns** panel listing every
column in the file with its first value, and what it will be imported as:

| Column in file | First value | Import as |
|---|---|---|
| Route | SR-17 | ID |
| Milepost | 12.4 | ID |
| Asset Type | Sign | Description |
| Y | 37.7749 | Latitude * |
| X | -122.4194 | Longitude * |
| Heading | Northbound | Direction |
| Inspector | J. Rivera | Ignore |
| Setback | 150 | Distance (ft) |

Recognisable names (`Y`/`X`, `Heading`, `Setback`, …) are matched for you; everything else starts as
**Ignore**. From there you can:

- **Recategorise** — point any column at any field.
- **Ignore** — leave columns out entirely. Only latitude and longitude are required.
- **Combine** — send two or more columns to **ID** or **Description** and they're joined into one
  value. Each of those fields has its own joining string, so `Route` + `Milepost` can become
  `SR-17 MP12.4` while `Asset Type` + `Condition` becomes `Sign — Faded`.

A live preview shows the first few rows exactly as they'll be imported, and **First row is a header**
lets you correct the guess for files that start straight into data.

Direction values are understood generously: `NB`, `N`, `North`, `Northbound` and `0` all mean the
same thing, and the intercardinals (`NE`, `SW`, …) resolve to their bearing.

## 🔧 Development

The commands are listed under [Quick start](#the-commands). A few notes for working on the code:

- **`packages/openroad` is aliased to its source** in both `vite.config.ts` and `tsconfig.json`, so
  `npm run dev`, `npm run build` and `npm run check` all read the same files and edits to the package
  hot-reload like any other source file. `packages/openroad/dist` is built only for publishing.
- **`npm run check` is the real safety net.** The whole client is type-checked, so it catches a broken
  import or a stale type anywhere in the project.
- **The Express server has no API routes.** It serves Vite in development and static files in
  production; all behaviour lives in the browser.

### Environment Configuration

No environment variables are required. The only optional one is `VITE_MAPBOX_TOKEN`, which adds a
satellite base layer alongside OpenStreetMap.

## 📊 Data Format

### Export Structure
A single file, `points.csv`, with the columns described in
[The CSV Format](#-the-csv-format) above.

### Data Persistence
Points live in browser `localStorage` under `openroad_points`, with settings under
`openroad_settings` and the ID counter under `openroad_id_counter`. Data persists across browser
sessions and survives application updates, but it never leaves that browser — export a CSV whenever
you want a durable or portable copy.

## 🔒 Security Considerations

### Production Deployment Best Practices
1. **Always use HTTPS** in production environments
2. **Set proper security headers** in your web server configuration:
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   ```
3. **Regular updates**: Keep dependencies updated with `npm audit`
4. **Backup strategy**: Since data is stored in browser localStorage, educate users to regularly export their data

## 🆘 Support & Troubleshooting

### Common Issues

**Application Not Loading**
- Check web server logs: `sudo tail -f /var/log/nginx/error.log`
- Verify file permissions are correct
- Ensure JavaScript files are served with correct MIME type

**Map Not Loading**
- Verify internet connection for OpenStreetMap tiles
- Check if server allows outbound HTTPS connections
- Ensure CSP headers allow map tile domains

**Export Not Working**
- Modern browsers required for ZIP file generation
- Check browser console for JavaScript errors
- Verify sufficient browser storage available

**Imported IDs Look Wrong**
- IDs that begin with `=`, `+`, `-` or `@` are quoted on export to stop spreadsheets treating them as
  formulas. Generated unique IDs avoid those characters entirely.

### Server Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Apache logs
sudo tail -f /var/log/apache2/access.log
sudo tail -f /var/log/apache2/error.log
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Version History

### Current Version
- Simplified from a traffic-signal configuration tool to a general map-point collector
- One `Point` entity replacing the agency / signal / approach / phase / detector / timing model
- Single `points.csv` export replacing the six-file GTSS package
- Click-to-drop pins with draggable markers and on-map direction arrows
- Sequential or unique point IDs, with numbers never reused after a delete
- Lenient CSV import: alternate column names, headerless files, replace or merge

---

**OpenRoad Data Tools** - Drop a pin, record what matters, export a CSV.
