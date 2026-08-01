package com.banking.ledger.infrastructure.messaging;

import com.banking.ledger.application.dto.CreateLedgerAccountCommand;
import com.banking.ledger.application.usecase.CreateLedgerAccountUseCase;
import com.banking.ledger.infrastructure.persistence.entity.ProcessedEventJpaEntity;
import com.banking.ledger.infrastructure.persistence.repository.ProcessedEventJpaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountOpenedConsumerTest {

    private ProcessedEventJpaRepository processedEventRepository;
    private CreateLedgerAccountUseCase createLedgerAccountUseCase;
    private AccountOpenedConsumer consumer;

    @BeforeEach
    void setUp() {
        processedEventRepository = mock(ProcessedEventJpaRepository.class);
        createLedgerAccountUseCase = mock(CreateLedgerAccountUseCase.class);
        consumer = new AccountOpenedConsumer(new ObjectMapper(), processedEventRepository, createLedgerAccountUseCase);
    }

    private String accountOpenedPayload(String eventId, String accountId) {
        return """
                {
                  "eventId": "%s",
                  "eventType": "AccountOpened",
                  "data": {
                    "accountId": "%s",
                    "accountNumber": "EUR1234567890",
                    "accountType": "CHECKING",
                    "currency": "EUR"
                  }
                }
                """.formatted(eventId, accountId);
    }

    @Test
    void createsLedgerAccountAndMarksEventProcessed() {
        when(processedEventRepository.existsById("evt-1")).thenReturn(false);

        consumer.onMessage(accountOpenedPayload("evt-1", "acc-1"));

        verify(createLedgerAccountUseCase).execute(
                eq(new CreateLedgerAccountCommand("acc-1", "EUR1234567890", "LIABILITY", "EUR"))
        );
        verify(processedEventRepository).save(any(ProcessedEventJpaEntity.class));
    }

    @Test
    void skipsAlreadyProcessedEvent() {
        when(processedEventRepository.existsById("evt-1")).thenReturn(true);

        consumer.onMessage(accountOpenedPayload("evt-1", "acc-1"));

        verify(createLedgerAccountUseCase, never()).execute(any());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void ignoresEventsOfOtherTypes() {
        String payload = """
                {"eventId": "evt-2", "eventType": "AccountFrozen", "data": {"accountId": "acc-1"}}
                """;

        consumer.onMessage(payload);

        verify(createLedgerAccountUseCase, never()).execute(any());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void skipsWhenRequiredDataFieldsAreMissing() {
        when(processedEventRepository.existsById("evt-3")).thenReturn(false);
        String payload = """
                {"eventId": "evt-3", "eventType": "AccountOpened", "data": {"accountId": "acc-1"}}
                """;

        consumer.onMessage(payload);

        verify(createLedgerAccountUseCase, never()).execute(any());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    void doesNotThrowOnMalformedPayload() {
        consumer.onMessage("not-json");

        verify(createLedgerAccountUseCase, times(0)).execute(any());
    }
}
