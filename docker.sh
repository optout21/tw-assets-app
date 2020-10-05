#!/bin/sh
TAG=trustwallet/assets-management

npm run build

docker build -t $TAG .

#docker run -p 49170:3000 -d $TAG

#docker ps
#docker logs <container id>