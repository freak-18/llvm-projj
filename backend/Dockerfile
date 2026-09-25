FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
