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