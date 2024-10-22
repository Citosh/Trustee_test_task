FROM node:20.11.1-buster

# Встановіть Google Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    fontconfig \
    fonts-freefont-ttf \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxrandr2 \
    libxi6 \
    libxtst6 \
    libcups2 \
    libxss1 \
    libxshmfence1 \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Встановіть змінну середовища для Puppeteer
ENV CHROME_BIN=/usr/bin/google-chrome

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]