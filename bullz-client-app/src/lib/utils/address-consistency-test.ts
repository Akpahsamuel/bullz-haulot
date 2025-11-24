// Address Consistency Test Utility
// This file can be used to test if users get consistent addresses

import { jwtToAddress} from "@mysten/sui/zklogin"

// Helper function to derive salt (same as in use-auth.tsx)
async function deriveSaltFromSub(sub: string): Promise<bigint> {
    const APP_SALT_SECRET = "bullz-app-zklogin-v1"
    const encoder = new TextEncoder()
    const data = encoder.encode(sub + APP_SALT_SECRET)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    
    const bytes = hashArray.slice(0, 16)
    let salt = 0n
    for (let i = 0; i < bytes.length; i++) {
        salt = (salt << 8n) | BigInt(bytes[i])
    }
    return salt
}

/**
 * Test function to verify address consistency
 * Call this in browser console after login to test
 */
export const testAddressConsistency = async (jwtToken: string, userSub: string) => {
    console.log("🧪 Testing Address Consistency...")
    console.log("User Sub:", userSub)
    
    // Test salt consistency
    const salt1 = await deriveSaltFromSub(userSub)
    const salt2 = await deriveSaltFromSub(userSub)
    
    console.log("Salt 1:", salt1.toString())
    console.log("Salt 2:", salt2.toString())
    console.log("✅ Salt consistent:", salt1 === salt2)
    
    // Test address consistency with new format
    const address1 = jwtToAddress(jwtToken, salt1, false)
    const address2 = jwtToAddress(jwtToken, salt2, false)
    
    console.log("Address 1:", address1)
    console.log("Address 2:", address2)
    console.log("✅ Address consistent:", address1 === address2)
    
    // Test legacy vs new format
    const legacyAddress = jwtToAddress(jwtToken, salt1, true)
    const newAddress = jwtToAddress(jwtToken, salt1, false)
    
    console.log("Legacy address:", legacyAddress)
    console.log("New address:", newAddress)
    console.log("✅ Using new format:", newAddress)
    
    return {
        salt: salt1.toString(),
        address: address1,
        consistent: salt1 === salt2 && address1 === address2
    }
}

/**
 * Quick test function for browser console
 * Usage: testQuick("your-jwt-token", "your-sub-id")
 */
export const testQuick = async (jwt: string, sub: string) => {
    const result = await testAddressConsistency(jwt, sub)
    if (result.consistent) {
        console.log("🎉 SUCCESS: Address consistency test passed!")
    } else {
        console.log("❌ FAILED: Address consistency test failed!")
    }
    return result
}
