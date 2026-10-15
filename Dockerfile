# ============ 构建阶段：Node 打包 ============
FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖，利用 Docker 层缓存
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 拷贝源码并构建
COPY . .
RUN npm run build

# ============ 运行阶段：nginx 静态托管 ============
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# 自定义 nginx 配置：单页应用回退到 index.html
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  gzip on;\n\
  gzip_types text/plain text/css application/javascript application/json;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
