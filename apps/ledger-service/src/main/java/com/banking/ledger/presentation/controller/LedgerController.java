package com.banking.ledger.presentation.controller;

import com.banking.ledger.application.dto.BalanceResult;
import com.banking.ledger.application.dto.CreateLedgerAccountCommand;
import com.banking.ledger.application.dto.DepositCommand;
import com.banking.ledger.application.dto.ReverseCommand;
import com.banking.ledger.application.dto.TransactionResult;
import com.banking.ledger.application.dto.TransferCommand;
import com.banking.ledger.application.dto.WithdrawCommand;
import com.banking.ledger.application.usecase.CreateLedgerAccountUseCase;
import com.banking.ledger.application.usecase.DepositFundsUseCase;
import com.banking.ledger.application.usecase.GetBalanceUseCase;
import com.banking.ledger.application.usecase.ReverseTransactionUseCase;
import com.banking.ledger.application.usecase.TransferFundsUseCase;
import com.banking.ledger.application.usecase.WithdrawFundsUseCase;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.vo.Currency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    private final DepositFundsUseCase depositUseCase;
    private final WithdrawFundsUseCase withdrawUseCase;
    private final TransferFundsUseCase transferUseCase;
    private final ReverseTransactionUseCase reverseUseCase;
    private final CreateLedgerAccountUseCase createAccountUseCase;
    private final GetBalanceUseCase getBalanceUseCase;

    public LedgerController(
            DepositFundsUseCase depositUseCase,
            WithdrawFundsUseCase withdrawUseCase,
            TransferFundsUseCase transferUseCase,
            ReverseTransactionUseCase reverseUseCase,
            CreateLedgerAccountUseCase createAccountUseCase,
            GetBalanceUseCase getBalanceUseCase
    ) {
        this.depositUseCase = depositUseCase;
        this.withdrawUseCase = withdrawUseCase;
        this.transferUseCase = transferUseCase;
        this.reverseUseCase = reverseUseCase;
        this.createAccountUseCase = createAccountUseCase;
        this.getBalanceUseCase = getBalanceUseCase;
    }

    @PostMapping("/accounts")
    public ResponseEntity<LedgerAccountResponse> createAccount(
            @Valid @RequestBody CreateLedgerAccountRequest request
    ) {
        LedgerAccount account = createAccountUseCase.execute(new CreateLedgerAccountCommand(
                request.accountId(),
                request.accountNumber(),
                request.accountType(),
                request.currency()
        ));
        return ResponseEntity.status(HttpStatus.CREATED).body(LedgerAccountResponse.from(account));
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResult> deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        TransactionResult result = depositUseCase.execute(new DepositCommand(
                request.accountId(),
                request.amount(),
                request.currency(),
                idempotencyKey,
                request.description()
        ));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResult> withdraw(
            @Valid @RequestBody WithdrawRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        TransactionResult result = withdrawUseCase.execute(new WithdrawCommand(
                request.accountId(),
                request.amount(),
                request.currency(),
                idempotencyKey,
                request.description()
        ));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResult> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        TransactionResult result = transferUseCase.execute(new TransferCommand(
                request.sourceAccountId(),
                request.targetAccountId(),
                request.amount(),
                request.currency(),
                idempotencyKey,
                request.description(),
                request.paymentId()
        ));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reverse")
    public ResponseEntity<TransactionResult> reverse(
            @Valid @RequestBody ReverseRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        TransactionResult result = reverseUseCase.execute(new ReverseCommand(
                request.originalEntryId(),
                idempotencyKey,
                request.reason()
        ));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/accounts/{accountId}/balance")
    public ResponseEntity<BalanceResult> getBalance(@PathVariable String accountId) {
        return ResponseEntity.ok(getBalanceUseCase.byAccountId(accountId));
    }

    @GetMapping("/currencies")
    public ResponseEntity<Map<String, Object>> listCurrencies() {
        return ResponseEntity.ok(Map.of(
                "supported", List.copyOf(Currency.supportedCodes()),
                "note", "Each ledger account is single-currency. Cross-currency transfers are not supported (use FX service)."
        ));
    }

    public record CreateLedgerAccountRequest(
            @NotBlank String accountId,
            @NotBlank String accountNumber,
            @NotBlank String accountType,
            @NotBlank @Size(min = 3, max = 3) String currency
    ) {}

    public record DepositRequest(
            @NotBlank String accountId,
            @NotNull @Positive BigDecimal amount,
            @NotBlank @Size(min = 3, max = 3) String currency,
            String description
    ) {}

    public record WithdrawRequest(
            @NotBlank String accountId,
            @NotNull @Positive BigDecimal amount,
            @NotBlank @Size(min = 3, max = 3) String currency,
            String description
    ) {}

    public record TransferRequest(
            @NotBlank String sourceAccountId,
            @NotBlank String targetAccountId,
            @NotNull @Positive BigDecimal amount,
            @NotBlank @Size(min = 3, max = 3) String currency,
            String description,
            String paymentId
    ) {}

    public record ReverseRequest(
            @NotBlank String originalEntryId,
            String reason
    ) {}

    public record LedgerAccountResponse(
            String id,
            String accountId,
            String accountNumber,
            String accountType,
            String currency,
            BigDecimal balance,
            BigDecimal availableBalance
    ) {
        public static LedgerAccountResponse from(LedgerAccount account) {
            return new LedgerAccountResponse(
                    account.getId().toString(),
                    account.getAccountId(),
                    account.getAccountNumber(),
                    account.getType().name(),
                    account.getCurrency(),
                    account.getBalance().amount(),
                    account.getAvailableBalance().amount()
            );
        }
    }
}
