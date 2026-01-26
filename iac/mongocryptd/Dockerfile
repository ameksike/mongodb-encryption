# ./mongocryptd/Dockerfile

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
 && rm -rf /var/lib/apt/lists/*

# Import MongoDB 8.0 public key (used for 8.2)
RUN curl -fsSL https://pgp.mongodb.com/server-8.0.asc \
    | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

# Add MongoDB Enterprise 8.2 repo for Ubuntu 22.04 (jammy)
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.com/apt/ubuntu jammy/mongodb-enterprise/8.2 multiverse" \
    > /etc/apt/sources.list.d/mongodb-enterprise-8.2.list

# Install mongocryptd
RUN apt-get update && apt-get install -y \
    mongodb-enterprise-cryptd \
 && rm -rf /var/lib/apt/lists/*

EXPOSE 27020

# No --bind_ip; just listen on the default interface/port
CMD ["mongocryptd", "--port=27020"]