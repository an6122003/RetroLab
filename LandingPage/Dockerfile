# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Portfolio Landing Page — Static Nginx
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM nginx:alpine
ENV PORT=8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 8080
