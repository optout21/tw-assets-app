#!/bin/sh
TAG=trustwallet/assets-management

npm run build

docker build -t $TAG .
#docker build -t $TAG:<version> .

#docker run -p 49170:3000 -d $TAG
#docker push $TAG
#docker push $TAG:<version>

#docker ps
#docker logs <container id>
