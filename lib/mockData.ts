import { MockIncident } from './types'

export const mockIncident: MockIncident = {
  title: 'P1 — Transaction API 500s on PO Receive (EU/DHL Express)',
  version: 'v3.7.2',

  logs: `
═══════════════════════════════════════════════════════════════
 transaction-service  |  2026-05-21  |  Jenkins Build #1147
═══════════════════════════════════════════════════════════════

2026-05-21 13:30:04.112 INFO  [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084280/receive | user=alice.wu@buyer.com | account=ACC-00055012 | carrier=UPS | duration=189ms | status=201
2026-05-21 13:30:51.445 INFO  [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.InvoiceController - POST /transaction/invoices | user=priya.nair@altir.co | account=ACC-00055012 | invoiceId=INV-00021890 | duration=214ms | status=201
2026-05-21 13:31:18.002 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.PurchaseOrderController - GET /transaction/purchase-orders?account=ACC-00055012&status=PENDING | user=james.holt@buyer.com | count=14 | duration=98ms | status=200
2026-05-21 13:32:07.881 INFO  [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.ShipmentController - POST /transaction/shipments | user=alice.wu@buyer.com | shipmentId=SHP-00043201 | carrier=FEDEX | duration=177ms | status=201
2026-05-21 13:33:00.330 INFO  [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084291/receive | user=tom.eriksson@supplier.eu | account=ACC-00059100 | carrier=FEDEX | duration=193ms | status=201
2026-05-21 13:33:44.771 INFO  [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.QuoteController - GET /transaction/quotes?rfqId=RFQ-00008812 | user=priya.nair@altir.co | count=3 | duration=67ms | status=200
2026-05-21 13:34:21.554 INFO  [transaction-service] [http-nio-8080-exec-6] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084298/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=UPS | duration=201ms | status=201
2026-05-21 13:35:09.002 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.AllocationController - PUT /transaction/allocations/ALLOC-00011209 | user=alice.wu@buyer.com | duration=145ms | status=200
2026-05-21 13:36:12.441 INFO  [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084302/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=198ms | status=201
2026-05-21 13:37:03.119 INFO  [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.InvoiceController - GET /transaction/invoices?account=ACC-00061002&status=OPEN | user=lena.vogel@supplier.eu | count=6 | duration=81ms | status=200
2026-05-21 13:38:00.004 INFO  [transaction-service] [metrics-reporter] c.a.c.config.MetricsReporter - Heartbeat OK | errorRate=0.2% | p99=241ms | activeConnections=34 | heap=512MB/2048MB
2026-05-21 13:38:44.228 INFO  [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084308/receive | user=tom.eriksson@supplier.eu | account=ACC-00059100 | carrier=DHL_EXPRESS | duration=204ms | status=201
2026-05-21 13:39:17.661 INFO  [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.ShipmentController - PUT /transaction/shipments/SHP-00043189/track | user=james.holt@buyer.com | trackingRef=1Z999AA10123456784 | carrier=UPS | duration=133ms | status=200
2026-05-21 13:40:02.990 INFO  [transaction-service] [http-nio-8080-exec-7] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084311/receive | user=alice.wu@buyer.com | account=ACC-00055012 | carrier=FEDEX | duration=188ms | status=201

── DEPLOYMENT EVENT ─────────────────────────────────────────
2026-05-21 13:41:55.003 INFO  [transaction-service] [main] co.altir.chip1.TransactionServiceApplication - Graceful shutdown initiated — draining 12 in-flight requests
2026-05-21 13:41:57.441 INFO  [transaction-service] [main] co.altir.chip1.TransactionServiceApplication - All in-flight requests complete. Stopping.
2026-05-21 13:42:01.114 INFO  [transaction-service] [main] co.altir.chip1.TransactionServiceApplication - Starting TransactionServiceApplication v3.7.2 (was v3.7.1)
2026-05-21 13:42:01.889 INFO  [transaction-service] [main] co.altir.chip1.config.DataSourceConfig - Connected to postgres://chip1-prod-db.internal:5432/chip1_transactions (pool=20)
2026-05-21 13:42:02.114 INFO  [transaction-service] [main] co.altir.chip1.config.ElasticsearchConfig - Connected to es://chip1-es.internal:9200 — cluster health GREEN
2026-05-21 13:42:02.775 INFO  [transaction-service] [main] co.altir.chip1.config.KeycloakConfig - Keycloak realm chip1-prod loaded — 4 client scopes
2026-05-21 13:42:03.201 INFO  [transaction-service] [main] co.altir.chip1.service.shipping.CarrierConfigLoader - Loading carrier configs from DB... loaded 3 records (UPS, FEDEX, TNT)
2026-05-21 13:42:03.204 WARN  [transaction-service] [main] co.altir.chip1.service.shipping.CarrierConfigLoader - WARNING: No config found for carrier DHL_EXPRESS — carrierConfig will be null for this carrier
2026-05-21 13:42:04.331 INFO  [transaction-service] [main] co.altir.chip1.TransactionServiceApplication - Deployment v3.7.2 complete — Jenkins build #1147 | branch=feature/CHP-5611
2026-05-21 13:42:04.667 INFO  [transaction-service] [main] co.altir.chip1.config.NotifyConfig - Deployment notification sent → Teams #chip1-releases
2026-05-21 13:42:04.889 INFO  [transaction-service] [main] co.altir.chip1.config.CaddyHealthCheck - Health check passed. Caddy reverse proxy updated upstream → port 4014
2026-05-21 13:42:05.001 INFO  [transaction-service] [main] co.altir.chip1.config.CaddyHealthCheck - Traffic restored — 100% routing to v3.7.2
──────────────────────────────────────────────────────────────

2026-05-21 13:43:01.002 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084312/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=UPS | duration=201ms | status=201
2026-05-21 13:43:28.771 INFO  [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.InvoiceController - POST /transaction/invoices | user=alice.wu@buyer.com | account=ACC-00055012 | invoiceId=INV-00021897 | duration=209ms | status=201
2026-05-21 13:44:05.114 INFO  [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084319/receive | user=priya.nair@altir.co | account=ACC-00058821 | carrier=FEDEX | duration=195ms | status=201
2026-05-21 13:44:39.002 INFO  [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.QuoteController - POST /transaction/quotes | user=tom.eriksson@supplier.eu | rfqId=RFQ-00008841 | duration=178ms | status=201
2026-05-21 13:45:12.330 INFO  [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084327/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=FEDEX | duration=188ms | status=201
2026-05-21 13:45:50.009 INFO  [transaction-service] [http-nio-8080-exec-6] c.a.c.controller.transaction.ShipmentController - POST /transaction/shipments | user=lena.vogel@supplier.eu | shipmentId=SHP-00043219 | carrier=UPS | duration=166ms | status=201
2026-05-21 13:46:21.441 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084333/receive | user=alice.wu@buyer.com | account=ACC-00055012 | carrier=UPS | duration=192ms | status=201
2026-05-21 13:46:44.901 INFO  [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084341/receive | user=priya.nair@altir.co | account=ACC-00058821 | carrier=FEDEX | duration=204ms | status=201

── FIRST FAILURE ────────────────────────────────────────────
2026-05-21 13:47:11.003 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084358/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=12ms | status=500
2026-05-21 13:47:11.004 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper - Unhandled exception during PO receive
2026-05-21 13:47:11.004 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:47:11.005 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper -   at co.altir.chip1.service.shipping.ShippingDetailsMapper.toTrackingRecord(ShippingDetailsMapper.java:134)
2026-05-21 13:47:11.006 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper -   at co.altir.chip1.service.transaction.PurchaseOrderReceiveService.processShipment(PurchaseOrderReceiveService.java:87)
2026-05-21 13:47:11.007 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper -   at co.altir.chip1.controller.transaction.PurchaseOrderController.receivePurchaseOrder(PurchaseOrderController.java:219)
2026-05-21 13:47:11.008 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper -   at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
2026-05-21 13:47:11.009 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper -   at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:898)
──────────────────────────────────────────────────────────────

2026-05-21 13:47:14.221 INFO  [transaction-service] [http-nio-8080-exec-6] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084360/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=FEDEX | duration=191ms | status=201
2026-05-21 13:47:19.883 ERROR [transaction-service] [http-nio-8080-exec-7] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084362/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:47:19.884 ERROR [transaction-service] [http-nio-8080-exec-7] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:47:19.885 ERROR [transaction-service] [http-nio-8080-exec-7] c.a.c.service.shipping.ShippingDetailsMapper -   at co.altir.chip1.service.shipping.ShippingDetailsMapper.toTrackingRecord(ShippingDetailsMapper.java:134)
2026-05-21 13:47:26.002 INFO  [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084365/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=UPS | duration=197ms | status=201
2026-05-21 13:47:33.441 ERROR [transaction-service] [http-nio-8080-exec-9] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084368/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:47:33.442 ERROR [transaction-service] [http-nio-8080-exec-9] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:47:44.119 INFO  [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.InvoiceController - GET /transaction/invoices?account=ACC-00059100 | user=tom.eriksson@supplier.eu | count=4 | duration=74ms | status=200
2026-05-21 13:47:55.003 ERROR [transaction-service] [http-nio-8080-exec-8] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084371/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:47:55.004 ERROR [transaction-service] [http-nio-8080-exec-8] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:48:00.001 WARN  [transaction-service] [metrics-reporter] c.a.c.config.MetricsReporter - Heartbeat | errorRate=16.7% | p99=398ms | endpoint=POST /transaction/purchase-orders/*/receive | note: threshold=20%
2026-05-21 13:48:12.221 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084374/receive | user=alice.wu@buyer.com | account=ACC-00055012 | carrier=FEDEX | duration=196ms | status=201
2026-05-21 13:48:29.004 ERROR [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084378/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:48:29.005 ERROR [transaction-service] [http-nio-8080-exec-4] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:48:47.882 INFO  [transaction-service] [http-nio-8080-exec-6] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084381/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=UPS | duration=188ms | status=201
2026-05-21 13:49:01.110 ERROR [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084385/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:49:01.111 ERROR [transaction-service] [http-nio-8080-exec-2] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:49:15.009 INFO  [transaction-service] [http-nio-8080-exec-7] c.a.c.controller.transaction.ShipmentController - GET /transaction/shipments/SHP-00043201 | user=priya.nair@altir.co | duration=62ms | status=200
2026-05-21 13:49:33.441 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084390/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:49:33.442 ERROR [transaction-service] [http-nio-8080-exec-5] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:50:00.002 WARN  [transaction-service] [metrics-reporter] c.a.c.config.MetricsReporter - Heartbeat | errorRate=19.4% | p99=441ms | endpoint=POST /transaction/purchase-orders/*/receive | note: approaching threshold
2026-05-21 13:50:22.667 ERROR [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084395/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:50:22.668 ERROR [transaction-service] [http-nio-8080-exec-3] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:50:44.119 INFO  [transaction-service] [http-nio-8080-exec-9] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084399/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=FEDEX | duration=201ms | status=201
2026-05-21 13:51:08.001 ERROR [transaction-service] [http-nio-8080-exec-4] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084401/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:51:08.002 ERROR [transaction-service] [http-nio-8080-exec-4] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null

── P1 ALERT ─────────────────────────────────────────────────
2026-05-21 13:51:44.890 WARN  [transaction-service] [metrics-reporter] c.a.c.config.MetricsReporter - ERROR RATE EXCEEDED THRESHOLD: 22.4% > 20.0% on POST /transaction/purchase-orders/*/receive
2026-05-21 13:51:44.891 ALERT [transaction-service] [alerting] c.a.c.config.AlertingConfig - P1 incident declared — paging on-call engineer: marcus.wade@altir.co
2026-05-21 13:51:44.892 ALERT [transaction-service] [alerting] c.a.c.config.AlertingConfig - PagerDuty incident created: INC-20260521-0047 | service=transaction-service | trigger=error_rate_threshold
2026-05-21 13:51:44.893 ALERT [transaction-service] [alerting] c.a.c.config.AlertingConfig - Grafana alert fired — see https://grafana.altir.net/d/transaction-service | panel=error_rate_5m
──────────────────────────────────────────────────────────────

2026-05-21 13:52:01.330 ERROR [transaction-service] [http-nio-8080-exec-6] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084406/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:52:01.331 ERROR [transaction-service] [http-nio-8080-exec-6] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:52:19.003 ERROR [transaction-service] [http-nio-8080-exec-8] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084412/receive | user=david.chen@supplier.eu | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:52:44.771 INFO  [transaction-service] [http-nio-8080-exec-1] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084415/receive | user=alice.wu@buyer.com | account=ACC-00055012 | carrier=FEDEX | duration=195ms | status=201
2026-05-21 13:53:05.220 INFO  [transaction-service] [http-nio-8080-exec-7] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084418/receive | user=james.holt@buyer.com | account=ACC-00058821 | carrier=UPS | duration=188ms | status=201
2026-05-21 13:53:31.008 ERROR [transaction-service] [http-nio-8080-exec-2] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084421/receive | user=lena.vogel@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=11ms | status=500
2026-05-21 13:53:31.009 ERROR [transaction-service] [http-nio-8080-exec-2] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:54:00.004 WARN  [transaction-service] [metrics-reporter] c.a.c.config.MetricsReporter - Heartbeat | errorRate=23.1% | p99=489ms | affectedAccounts=[ACC-00061002, ACC-00061008, ACC-00062114] | carrier=DHL_EXPRESS only
2026-05-21 13:54:11.001 ERROR [transaction-service] [http-nio-8080-exec-3] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084425/receive | user=david.chen@supplier.eu | account=ACC-00061002 | carrier=DHL_EXPRESS | duration=10ms | status=500
2026-05-21 13:54:11.002 ERROR [transaction-service] [http-nio-8080-exec-3] c.a.c.service.shipping.ShippingDetailsMapper - java.lang.NullPointerException: Cannot invoke "co.altir.chip1.model.purchasing.CarrierConfig.getRateCode()" because "carrierConfig" is null
2026-05-21 13:54:55.441 INFO  [transaction-service] [http-nio-8080-exec-5] c.a.c.controller.transaction.PurchaseOrderController - POST /transaction/purchase-orders/PO-00084429/receive | user=priya.nair@altir.co | account=ACC-00058821 | carrier=FEDEX | duration=191ms | status=201

═══════════════════════════════════════════════════════════════
 PATTERN SUMMARY (auto-detected by log aggregator)
 Failures: 100% correlated with carrier=DHL_EXPRESS
 Healthy:  carrier=FEDEX ✓  carrier=UPS ✓  carrier=TNT ✓
 Affected: accounts ACC-00061002, ACC-00061008, ACC-00062114
 First failure: 13:47:11 (4 min 6 sec after deployment v3.7.2)
 Total failures so far: 18 | Total requests: 78 | Rate: 23.1%
═══════════════════════════════════════════════════════════════`,

  metrics: [
    { time: '13:30', errorRate: 0.2 },
    { time: '13:32', errorRate: 0.2 },
    { time: '13:34', errorRate: 0.3 },
    { time: '13:36', errorRate: 0.2 },
    { time: '13:38', errorRate: 0.2 },
    { time: '13:40', errorRate: 0.3 },
    { time: '13:42', errorRate: 0.2 },
    { time: '13:44', errorRate: 0.2 },
    { time: '13:46', errorRate: 0.3 },
    { time: '13:47', errorRate: 16.7 },
    { time: '13:48', errorRate: 18.1 },
    { time: '13:49', errorRate: 19.4 },
    { time: '13:50', errorRate: 20.8 },
    { time: '13:51', errorRate: 22.4 },
    { time: '13:52', errorRate: 23.1 },
    { time: '13:53', errorRate: 22.8 },
    { time: '13:54', errorRate: 23.1 },
  ],

  teamsThread: [
    {
      author: 'Jenkins Bot',
      role: 'CI/CD',
      time: '13:42',
      text: '✅ Deployed transaction-service v3.7.2 to production — Jenkins build #1147 | branch: feature/CHP-5611 | Caddy upstream updated → port 4014',
      isAlert: false,
      channel: 'chip1-releases',
    },
    {
      author: 'Sophie Renaud',
      role: 'Supplier Operations',
      time: '13:49',
      text: "Getting reports from EU suppliers that PO receives are failing — specifically accounts ACC-00061002 and ACC-00061008. They're getting generic 500 errors through the portal. This started maybe 10 minutes ago. About 8 complaints so far, all DHL Express shipments.",
      isAlert: false,
      channel: 'Chip1-Integration',
    },
    {
      author: 'Marcus Wade',
      role: 'On-Call Engineer',
      time: '13:52',
      text: 'On it. Error rate at 22.4% on POST /purchase-orders/*/receive — P1 declared. Grafana: grafana.altir.net — spike started 13:47, 5 min after build #1147. NullPointerException in ShippingDetailsMapper. @Priya this is your CHP-5611 deploy?',
      isAlert: true,
      channel: 'Chip1-Integration',
    },
    {
      author: 'Priya Nair',
      role: 'Backend Engineer',
      time: '13:53',
      text: "Yes — CHP-5611 added CarrierConfig lookup to ShippingDetails for rate code resolution. The null check is missing in toTrackingRecord() for carriers not yet in the config table. DHL_EXPRESS rows weren't seeded in prod DB. Can push a hotfix or roll back.",
      isAlert: false,
      channel: 'Chip1-Integration',
    },
    {
      author: 'Marcus Wade',
      role: 'On-Call Engineer',
      time: '13:54',
      text: "Roll back now, fix forward after. Triggering Jenkins #1148 to revert to v3.7.1. Sophie — tell affected suppliers to retry in ~5 min. I'll post recovery confirmation in chip1-releases.",
      isAlert: false,
      channel: 'Chip1-Integration',
    },
  ],

  deployDiff: `diff --git a/src/main/java/co/altir/chip1/service/shipping/ShippingDetailsMapper.java b/src/main/java/co/altir/chip1/service/shipping/ShippingDetailsMapper.java
index b2f3a91..e8c7d43 100644
--- a/src/main/java/co/altir/chip1/service/shipping/ShippingDetailsMapper.java
+++ b/src/main/java/co/altir/chip1/service/shipping/ShippingDetailsMapper.java
@@ -128,12 +128,22 @@ public class ShippingDetailsMapper {
   public TrackingRecord toTrackingRecord(ShippingDetails details) {
     TrackingRecord record = new TrackingRecord();
     record.setTrackingNumber(details.getTrackingNumber());
     record.setCarrier(details.getCarrier());
-    record.setEstimatedDelivery(details.getEstimatedDelivery());
-    record.setWeight(details.getWeight());
-    return record;
+
+    // CHP-5611: resolve carrier rate code from config table for billing
+    CarrierConfig carrierConfig = carrierConfigRepository
+        .findByCarrierCode(details.getCarrier().getCode());
+    record.setRateCode(carrierConfig.getRateCode());
+    record.setCurrencyCode(carrierConfig.getCurrencyCode());
+
+    // TODO: handle missing config rows for carriers not yet onboarded
+    record.setEstimatedDelivery(details.getEstimatedDelivery());
+    record.setWeight(details.getWeight());
+    record.setBoxCount(details.getBoxCount());
+    return record;
   }

diff --git a/src/main/java/co/altir/chip1/model/purchasing/ShippingDetails.java b/src/main/java/co/altir/chip1/model/purchasing/ShippingDetails.java
index c1a4f82..9d3b5e1 100644
--- a/src/main/java/co/altir/chip1/model/purchasing/ShippingDetails.java
+++ b/src/main/java/co/altir/chip1/model/purchasing/ShippingDetails.java
@@ -14,6 +14,9 @@ public class ShippingDetails {
   private String trackingNumber;
   private CarrierEnum carrier;
   private LocalDate estimatedDelivery;
+
+  // CHP-5611: new fields for box-level shipment tracking
+  private Integer boxCount;
   private BigDecimal weight;
   private String warehouseId;
 }

diff --git a/src/main/java/co/altir/chip1/service/shipping/CarrierConfigLoader.java b/src/main/java/co/altir/chip1/service/shipping/CarrierConfigLoader.java
index a991c33..f4d2b01 100644
--- a/src/main/java/co/altir/chip1/service/shipping/CarrierConfigLoader.java
+++ b/src/main/java/co/altir/chip1/service/shipping/CarrierConfigLoader.java
@@ -21,6 +21,8 @@ public class CarrierConfigLoader {
   @PostConstruct
   public void load() {
     List<CarrierConfig> configs = repository.findAll();
+    // CHP-5611: DHL_EXPRESS config row not yet added to prod DB
+    // migration script pending — see JIRA CHP-5619
     log.info("Loaded {} carrier configs: {}", configs.size(),
         configs.stream().map(CarrierConfig::getCode).collect(Collectors.joining(", ")));
   }`,
}
