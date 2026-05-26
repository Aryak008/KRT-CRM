# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY . .
RUN npm run build


# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Copy standalone server
COPY --from=builder /app/.next/standalone ./

# Copy static assets (Tailwind, CSS, etc.)
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder (images, icons, etc.)
COPY --from=builder /app/public ./public

# Start the Next.js server
CMD ["node", "server.js"]
