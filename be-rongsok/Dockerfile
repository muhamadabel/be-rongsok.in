# ==========================================
# Build Stage
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (required for Prisma Engine client generation)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package management files
COPY be-rongsok/package*.json ./

# Install all dependencies (including devDependencies for client generation)
RUN npm ci

# Copy Prisma files and generate client
COPY be-rongsok/prisma ./prisma/
RUN npx prisma generate

# Copy source code and documentation/assets
COPY be-rongsok/src ./src/
COPY be-rongsok/docs ./docs/

# ==========================================
# Production Runner Stage
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL (required for Prisma runtime client)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy packages and built node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs

# Copy bootstrapper entrypoint
COPY be-rongsok/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Set environments
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Run entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
