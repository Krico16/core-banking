package com.banking.ledger.domain.port;

import com.banking.ledger.domain.event.DomainEvent;

public interface EventPublisher {

    void publish(DomainEvent event);
}
