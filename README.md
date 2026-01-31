Openssl
- Hex 96
    ```
    openssl rand -hex 96 > hex96_key.txt
    ```
- RSA 2048 bits:
    ```
    openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
    openssl rsa -pubout -in private_key.pem -out public_key.pem
    ```
- AES 32
    ```
    openssl rand -base64 32 > aes_key.txt
    ```
- SHA256
    ```
    echo -n "TextoSeguroParaClave" | openssl dgst -sha256
    ```
- Master Key
    ```
    openssl rand -out master-key.bin 96
    ```

[Client Encryption](https://www.mongodb.com/docs/manual/reference/method/ClientEncryption.encrypt/)
[Mongo Docker](https://hub.docker.com/_/mongo)
[Download enterprise](https://www.mongodb.com/try/download/enterprise)
[Docker and MongoDB](https://www.mongodb.com/resources/products/compatibilities/docker)
[Queryable Encryption quick-start](https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/)
[Queryable Encryption Dependencies](https://www.mongodb.com/docs/manual/core/queryable-encryption/install/?language-no-dependencies=nodejs&operating-system=windows)