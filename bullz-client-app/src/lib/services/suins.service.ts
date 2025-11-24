import { Transaction } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"
import { SuinsClient, SuinsTransaction } from "@mysten/suins"

const BULLZ_PARENT_NFT_ID = import.meta.env.VITE_BULLZ_SUINS_NFT_ID || "0xc9de312eb7cefcc8c50d2387e838b7ff1474f5e8f5c7516ed57d6c9faea75476"
const PARENT_DOMAIN = "bullz.sui"

// SuiNS package IDs for testnet (for manual operations if needed)
const SUINS_PACKAGE_ID = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0"
const SUINS_REGISTRY_ID = "0xe64cd9db9f829c6cc405d9790bd71567ae07259855f4fba6f02c84f52298c106"

// Initialize SuiNS client for testnet
const suiClient = new SuiClient({ url: "https://fullnode.testnet.sui.io" })
const suinsClient = new SuinsClient({
    client: suiClient as any,
    network: "testnet" as any
})

interface CreateSubnameParams {
    username: string
    targetAddress: string
    parentNftId?: string
}

/**
 * Creates a leaf subname transaction for a user under bullz.sui
 * Example: "john" creates "john.bullz.sui" → points to user's zkLogin address
 */
export function createUserSubnameTransaction({
    username,
    targetAddress,
    parentNftId = BULLZ_PARENT_NFT_ID
}: CreateSubnameParams): Transaction {
    if (!parentNftId) {
        throw new Error(
            "Parent NFT ID not configured. Please set VITE_BULLZ_SUINS_NFT_ID in .env"
        )
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9-]+$/
    if (!usernameRegex.test(username)) {
        throw new Error(
            "Username must contain only lowercase letters, numbers, and hyphens"
        )
    }

    if (username.length < 3 || username.length > 20) {
        throw new Error("Username must be between 3 and 20 characters")
    }

    // Create a transaction block
    const transaction = new Transaction()
    
    // Pass in the transaction block & the app's global SuinsClient
    const suinsTransaction = new SuinsTransaction(suinsClient, transaction as any)
    
    // Build the transaction to create a leaf subname
    // A leaf subname has a target address and no NFT of its own
    // The name should be the FULL domain name (e.g., "john.bullz.sui")
    const fullDomainName = `${username}.${PARENT_DOMAIN}`
    
    suinsTransaction.createLeafSubName({
        // The NFT of the parent (bullz.sui)
        parentNft: parentNftId,
        // The leaf subname to be created - FULL domain name (e.g., "john.bullz.sui")
        name: fullDomainName,
        // The target address of the leaf subname (user's zkLogin address)
        targetAddress
    })

    return transaction
}

/**
 * Removes a leaf subname transaction
 */
export function removeUserSubnameTransaction(
    username: string,
    parentNftId: string = BULLZ_PARENT_NFT_ID
): Transaction {
    if (!parentNftId) {
        throw new Error("Parent NFT ID not configured")
    }

    const transaction = new Transaction()
    
    transaction.moveCall({
        target: `${SUINS_PACKAGE_ID}::subnames::remove_leaf`,
        arguments: [
            transaction.object(SUINS_REGISTRY_ID),
            transaction.object(parentNftId),
            transaction.pure.string(username),
        ],
    })

    return transaction
}

/**
 * Validates if a username is valid format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username) {
        return { valid: false, error: "Username is required" }
    }

    if (username.length < 3) {
        return { valid: false, error: "Username must be at least 3 characters" }
    }

    if (username.length > 20) {
        return { valid: false, error: "Username must be at most 20 characters" }
    }

    const usernameRegex = /^[a-z0-9-]+$/
    if (!usernameRegex.test(username)) {
        return { 
            valid: false, 
            error: "Username can only contain lowercase letters, numbers, and hyphens" 
        }
    }

    if (username.startsWith('-') || username.endsWith('-')) {
        return { valid: false, error: "Username cannot start or end with a hyphen" }
    }

    return { valid: true }
}

/**
 * Gets the full SuiNS name for a username
 */
export function getFullSuinsName(username: string): string {
    return `${username}.${PARENT_DOMAIN}`
}

