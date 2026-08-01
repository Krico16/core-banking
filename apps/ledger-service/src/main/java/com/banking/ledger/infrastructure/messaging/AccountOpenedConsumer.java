package com.banking.ledger.infrastructure.messaging;

import com.banking.ledger.application.dto.CreateLedgerAccountCommand;
import com.banking.ledger.application.usecase.CreateLedgerAccountUseCase;
import com.banking.ledger.infrastructure.persistence.entity.ProcessedEventJpaEntity;
import com.banking.ledger.infrastructure.persistence.repository.ProcessedEventJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consume {@code AccountOpened} y crea automáticamente la cuenta contable (LIABILITY)
 * correspondiente, reemplazando el paso manual {@code POST /api/ledger/accounts} cuando
 * la cuenta viene de account-service.
 *
 * Idempotente (regla nº4 AGENTS.md): {@code processed_events} descarta duplicados por
 * eventId, y {@link CreateLedgerAccountUseCase} ya es idempotente por accountId, así que
 * un reprocesamiento accidental (p.ej. crash antes de registrar el evento como procesado)
 * es inofensivo.
 */
@Component
public class AccountOpenedConsumer {

    private static final Logger log = LoggerFactory.getLogger(AccountOpenedConsumer.class);
    private static final String CONSUMER_NAME = "ledger-service-account";

    private final ObjectMapper objectMapper;
    private final ProcessedEventJpaRepository processedEventRepository;
    private final CreateLedgerAccountUseCase createLedgerAccountUseCase;

    public AccountOpenedConsumer(
            ObjectMapper objectMapper,
            ProcessedEventJpaRepository processedEventRepository,
            CreateLedgerAccountUseCase createLedgerAccountUseCase
    ) {
        this.objectMapper = objectMapper;
        this.processedEventRepository = processedEventRepository;
        this.createLedgerAccountUseCase = createLedgerAccountUseCase;
    }

    @KafkaListener(topics = "${ledger.topics.account-events}", groupId = "${spring.kafka.consumer.group-id}")
    public void onMessage(String payload) {
        try {
            JsonNode envelope = objectMapper.readTree(payload);
            String eventId = textOrNull(envelope, "eventId");
            String eventType = textOrNull(envelope, "eventType");

            if (eventId == null) {
                log.warn("AccountOpened envelope without eventId, skipping");
                return;
            }
            if (!"AccountOpened".equals(eventType)) {
                return;
            }
            if (processedEventRepository.existsById(eventId)) {
                log.debug("Event {} already processed, skipping", eventId);
                return;
            }

            JsonNode data = envelope.get("data");
            if (data == null) {
                log.warn("AccountOpened event {} without data, skipping", eventId);
                return;
            }

            String accountId = textOrNull(data, "accountId");
            String accountNumber = textOrNull(data, "accountNumber");
            String currency = textOrNull(data, "currency");

            if (accountId == null || accountNumber == null || currency == null) {
                log.warn("AccountOpened event {} missing required fields, skipping", eventId);
                return;
            }

            createLedgerAccountUseCase.execute(
                    new CreateLedgerAccountCommand(accountId, accountNumber, "LIABILITY", currency)
            );

            processedEventRepository.save(new ProcessedEventJpaEntity(eventId, CONSUMER_NAME));
            log.info("Ledger account ensured for account {} (event {})", accountId, eventId);
        } catch (Exception e) {
            log.error("Error processing AccountOpened event", e);
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value == null || value.isNull()) ? null : value.asText();
    }
}
