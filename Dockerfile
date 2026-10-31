FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY server/prisma server/prisma
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SITE_URL=http://localhost:3001
ARG VITE_APPLICATIONS_ENABLED=false
ARG VITE_ANALYTICS_SCRIPT_URL=
ARG VITE_ANALYTICS_WEBSITE_ID=
ENV VITE_SITE_URL=$VITE_SITE_URL VITE_APPLICATIONS_ENABLED=$VITE_APPLICATIONS_ENABLED VITE_ANALYTICS_SCRIPT_URL=$VITE_ANALYTICS_SCRIPT_URL VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
RUN npm run build
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
