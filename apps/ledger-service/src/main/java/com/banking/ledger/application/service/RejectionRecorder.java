package com.banking.ledger.application.service;

import com.banking.ledger.domain.port.OutboxEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registra un {@code LedgerTransactionRejected} en su propia transacción (REQUIRES_NEW),
 * independiente de la transacción del use-case que falló — si esta se revierte (rollback),
 * el registro del rechazo debe sobrevivir para que consumidores async (payment-service)
 * se enteren del fallo.
 */
@Component
public class RejectionRecorder {

    private final OutboxEventRepository outboxRepository;
    private final EventEnvelopeFactory envelopeFactory;

    public RejectionRecorder(OutboxEventRepository outboxRepository, EventEnvelopeFactory envelopeFactory) {
        this.outboxRepository = outboxRepository;
        this.envelopeFactory = envelopeFactory;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejection(String accountId, String idempotencyKey, String reason) {
        outboxRepository.save(envelopeFactory.transactionRejected(accountId, idempotencyKey, reason));
    }
}
