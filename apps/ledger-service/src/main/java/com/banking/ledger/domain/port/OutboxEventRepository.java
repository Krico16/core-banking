package com.banking.ledger.domain.port;

public interface OutboxEventRepository {

    void save(OutboxEvent event);
}
