FROM node:16

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8000

CMD ["npm","start"]