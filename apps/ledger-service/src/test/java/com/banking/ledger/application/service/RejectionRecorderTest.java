package com.banking.ledger.application.service;

import com.banking.ledger.domain.port.OutboxEvent;
import com.banking.ledger.domain.port.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RejectionRecorderTest {

    @Test
    void recordRejection_savesLedgerTransactionRejectedToOutbox() {
        OutboxEventRepository outboxRepository = mock(OutboxEventRepository.class);
        EventEnvelopeFactory envelopeFactory = new EventEnvelopeFactory(new ObjectMapper());
        RejectionRecorder recorder = new RejectionRecorder(outboxRepository, envelopeFactory);

        recorder.recordRejection("acc-1", "idem-1", "Insufficient funds");

        verify(outboxRepository).save(any(OutboxEvent.class));
    }
}
