FROM nginx:1.30.7-alpine

# needed by the container healthcheck
RUN apk add --no-cache curl

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/nginx.conf
