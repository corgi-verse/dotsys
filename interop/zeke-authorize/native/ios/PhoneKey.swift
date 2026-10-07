// SPDX-License-Identifier: Apache-2.0
// Key module for the specified Zeke iOS app, not a complete installable app.
// Hardware compilation and biometric behavior: NOT_RUN in this Linux workspace.
import Foundation
import CryptoKit
import LocalAuthentication
import Security

enum PhoneKeyError: Error { case unavailable, keychain(OSStatus), accessControl }

struct PhoneKey {
    private let service = "org.corgiverse.zeke.authorize"
    private let account: String
    init(deviceID: String) { self.account = deviceID }

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service, kSecAttrAccount as String: account]
    }

    func create() throws -> String {
        guard SecureEnclave.isAvailable else { throw PhoneKeyError.unavailable }
        var error: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.privateKeyUsage, .userPresence], &error
        ) else { throw PhoneKeyError.accessControl }
        let key = try SecureEnclave.P256.Signing.PrivateKey(accessControl: access)
        var item = query
        // This blob is an opaque Secure Enclave representation, not an exported private scalar.
        item[kSecValueData as String] = key.dataRepresentation
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else { throw PhoneKeyError.keychain(status) }
        return key.publicKey.pemRepresentation // SPKI PEM for native enrollment.
    }

    func signReviewedMessage(_ message: String) throws -> String {
        // The app must independently validate and render the action binding before calling this.
        var item = query
        item[kSecReturnData as String] = true
        item[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(item as CFDictionary, &result)
        guard status == errSecSuccess, let blob = result as? Data else {
            throw PhoneKeyError.keychain(status)
        }
        let context = LAContext()
        context.localizedReason = "Approve the exact Zeke action you reviewed"
        context.touchIDAuthenticationAllowableReuseDuration = 0
        defer { context.invalidate() }
        let key = try SecureEnclave.P256.Signing.PrivateKey(
            dataRepresentation: blob, authenticationContext: context
        )
        // CryptoKit hashes the exact UTF-8 message with SHA-256 and returns ECDSA DER.
        let signature = try key.signature(for: Data(message.utf8)).derRepresentation
        return signature.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
