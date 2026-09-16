import Capacitor
import StoreKit

@objc(PlusStorePlugin)
public class PlusStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PlusStorePlugin"
    public let jsName = "PlusStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    private let productId = "com.laststoryteller.plus.monthly"

    @objc func getProduct(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product \(self.productId) is not available in App Store Connect.")
                    return
                }
                call.resolve([
                    "id": product.id,
                    "displayName": product.displayName,
                    "displayPrice": product.displayPrice,
                    "description": product.description,
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        let accountToken = call.getString("appAccountToken")
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not available.")
                    return
                }
                var options: Set<Product.PurchaseOption> = []
                if let accountToken, let uuid = UUID(uuidString: accountToken) {
                    options.insert(.appAccountToken(uuid))
                }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    let transaction = try self.checkVerified(verification)
                    let jws = verification.jwsRepresentation
                    await transaction.finish()
                    call.resolve([
                        "signedTransaction": jws,
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                    ])
                case .userCancelled:
                    call.reject("cancelled")
                case .pending:
                    call.reject("pending")
                @unknown default:
                    call.reject("unknown_purchase_result")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                for await entitlement in Transaction.currentEntitlements {
                    guard case .verified(let transaction) = entitlement else { continue }
                    if transaction.productID == self.productId {
                        call.resolve([
                            "signedTransaction": entitlement.jwsRepresentation,
                            "originalTransactionId": String(transaction.originalID),
                            "productId": transaction.productID,
                        ])
                        return
                    }
                }
                call.reject("no_entitlement")
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }
}
