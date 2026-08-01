from confluent_kafka import Producer


class KafkaProducerWrapper:
    def __init__(self, bootstrap_servers: str) -> None:
        self._producer = Producer({"bootstrap.servers": bootstrap_servers})

    def send(self, topic: str, key: str, value: str) -> None:
        self._producer.produce(topic, key=key.encode("utf-8"), value=value.encode("utf-8"))
        remaining = self._producer.flush(10)
        if remaining > 0:
            raise RuntimeError(f"Kafka producer flush timed out with {remaining} messages undelivered")
