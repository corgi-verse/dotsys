// SPDX-License-Identifier: Apache-2.0
// Key module for the specified native Zeke app. Requires API 30+ and AndroidX Biometric.
// Android compilation and hardware behavior: NOT_RUN in this Linux workspace.
package org.corgiverse.zeke.authorize

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricPrompt
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

class PhoneKey(private val alias: String) {
    private val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun create(useStrongBox: Boolean): String {
        check(!store.containsAlias(alias)) { "Existing key must be preserved" }
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
            .setInvalidatedByBiometricEnrollment(true)
            .setIsStrongBoxBacked(useStrongBox)
            .build()
        val generator = KeyPairGenerator.getInstance("EC", "AndroidKeyStore")
        generator.initialize(spec)
        val pair = generator.generateKeyPair()
        val info = KeyFactory.getInstance("EC", "AndroidKeyStore")
            .getKeySpec(pair.private, KeyInfo::class.java)
        @Suppress("DEPRECATION")
        check(info.isInsideSecureHardware) { "Hardware key required; do not enroll this device" }
        val text = Base64.encodeToString(pair.public.encoded, Base64.NO_WRAP)
        return "-----BEGIN PUBLIC KEY-----\n" + text.chunked(64).joinToString("\n") +
            "\n-----END PUBLIC KEY-----\n"
    }

    // Pass this exact CryptoObject to BiometricPrompt.authenticate(promptInfo, object).
    // PromptInfo must require BIOMETRIC_STRONG. Never authorize a separate Signature instance.
    fun prepareSignature(): BiometricPrompt.CryptoObject {
        val entry = store.getEntry(alias, null) as KeyStore.PrivateKeyEntry
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(entry.privateKey)
        return BiometricPrompt.CryptoObject(signer)
    }

    // Call only from onAuthenticationSucceeded and use result.cryptoObject.
    fun signAfterAuthentication(result: BiometricPrompt.AuthenticationResult, reviewedMessage: String): String {
        val signer = checkNotNull(result.cryptoObject?.signature)
        signer.update(reviewedMessage.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(signer.sign(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }
}
