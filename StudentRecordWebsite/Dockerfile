
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    g++ \
    make \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN g++ -std=c++17 -O2 -pthread server.cpp -o server

ENV PORT=10000

EXPOSE 10000

CMD ["./server"]
