package com.platform.ugc.controller.finance;

import com.platform.ugc.dto.common.ApiEnvelope;
import com.platform.ugc.dto.finance.FinancialLedgerResponseDTO;
import com.platform.ugc.service.finance.FinancialLedgerQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * {@code GET /api/v1/users/{userId}/ledger} — the wallet's "История начислений" tab.
 * <p>
 * New controller rather than a method added to the real (unseen) {@code UserController}, per the
 * ТЗ's own "UserController / FinancialLedgerController" wording (it names this as an acceptable
 * alternative) and this delivery's standing rule against editing unread controller classes. If
 * {@code UserController} already has a handler mapped to this exact path (e.g. from Module 5 work
 * done elsewhere), delete this class instead of keeping both — Spring refuses to start with two
 * handlers on the same path+method.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class FinancialLedgerController {

    private final FinancialLedgerQueryService ledgerQueryService;

    @GetMapping("/{userId}/ledger")
    public ResponseEntity<ApiEnvelope<List<FinancialLedgerResponseDTO>>> getLedger(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiEnvelope.ok(ledgerQueryService.getLedgerForUser(userId)));
    }
}
