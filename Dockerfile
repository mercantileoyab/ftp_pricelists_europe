FROM node:18

# Install cron
RUN apt-get update && apt-get install -y cron

WORKDIR /app

RUN echo '0 0 * * * /usr/local/bin/node /app/index.js' > /etc/cron.d/npm-cron

RUN chmod 0644 /etc/cron.d/npm-cron

RUN crontab /etc/cron.d/npm-cron

RUN touch /var/log/cron.log

COPY package*.json ./

RUN npm install

COPY . .

CMD cron && tail -f /var/log/cron.log
