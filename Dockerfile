FROM node:14

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
COPY static-files ./static-files
COPY index.js ./

RUN npm install

EXPOSE 3000

CMD [ "node", "index.js" ]
