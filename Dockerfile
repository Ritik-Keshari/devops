# Step 1: Build React App
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve using NGINX
FROM nginx:stable
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80

# Optional: Handle React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf
