# HCW@Home — Patient Frontend

This folder contains the **HCW@Home patient** frontend source code (Angular/Ionic). The app must be **built** and **served** by a web server such as Nginx. Built static files are output to the `dist` folder.

## Prerequisites

- Node.js (v18+ recommended)

## How to build

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

Output will be in the `dist` directory.

## Development

To run locally during development:

```bash
npm start
# or
npm run ionic:serve
```

Then open **http://localhost:4201/**.

## How to deploy

See the deployment guide:

**https://docs.hcw-at-home.com/deploy/**
