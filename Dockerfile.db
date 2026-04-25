FROM mariadb:10.5
RUN apt-get update && apt-get install -y socat
ENV MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1
EXPOSE 3306
CMD if [ -n "$PORT" ] && [ "$PORT" != "3306" ]; then socat TCP-LISTEN:$PORT,fork TCP:127.0.0.1:3306 & fi; exec mysqld --bind-address=0.0.0.0
