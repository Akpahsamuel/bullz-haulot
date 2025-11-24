import React, { createContext, useContext } from "react"
import { SuiClient } from "@mysten/sui/client"
import { decodeJwt, generateNonce, generateRandomness, jwtToAddress } from "@mysten/sui/zklogin"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app-store"
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit"
// TODO: Re-enable when implementing username/SuiNS features
// import { createUserSubnameTransaction, validateUsername } from "../services/suins.service"

export type Provider = "google" | "apple" | "x"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI


async function deriveSaltFromSub(sub: string): Promise<bigint> {
    const APP_SALT_SECRET = import.meta.env.VITE_APP_SALT_SECRET
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

export type User = {
    sub_id: string
    username?: string
    salt: string
    wallet_address: string
}

type AuthContextType = {
    authenticated: boolean
    completed_auth: boolean
    user: User | null
    signin: (provider: Provider) => Promise<string>
    signout: () => Promise<void>
    callback: (token: string) => Promise<void>
    setUsername: (username: string) => Promise<void>
    authenticateWithWallet: (walletAddress: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, setUser } = useAuthStore()
    const { setAddress, address } = useAppStore()
    const currentAccount = useCurrentAccount()
    const { mutate: disconnectWallet } = useDisconnectWallet()
    
  
    const authenticated = Boolean(!!user || !!currentAccount || !!address)
    const completed_auth = Boolean(!!user?.username)

   
    const signin = async (provider: Provider): Promise<string> => {
       
        // const FULL_NODE = "https://fullnode.devnet.sui.io"
        const FULL_NODE = "https://fullnode.testnet.sui.io"
        const suiClient = new SuiClient({ url: FULL_NODE })
        const { epoch } = await suiClient.getLatestSuiSystemState();
        const maxEpoch = Number(epoch) + 2
        const ephemeralKeyPair = new Ed25519Keypair()
        const randomness = generateRandomness()

        const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness)

        window.sessionStorage.setItem('zklogin_ephemeral_key', ephemeralKeyPair.getSecretKey())
        window.sessionStorage.setItem('zklogin_randomness', randomness)
        window.sessionStorage.setItem('zklogin_max_epoch', maxEpoch.toString())

        switch (provider) {
            case "google":
                return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=id_token&redirect_uri=${REDIRECT_URI}&scope=openid&nonce=${nonce}&prompt=select_account`
            case "apple":
                return `https://appleid.apple.com/auth/authorize?client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URL&scope=email&response_mode=form_post&response_type=code%20id_token&nonce=${nonce}`
            case "x":
                return ""
            default:
                return ""
        }
    }

    const callback = async (token: string) => {
        const { sub } = decodeJwt(token)

        // Derive deterministic salt from user's sub ID
        // Same user = same salt = same address (every time)
        const salt = await deriveSaltFromSub(sub)

    
        const address = jwtToAddress(token, salt, false)

        if (address === "") { throw Error("unable to create address") }

        // Set user in auth store
        setUser({
            sub_id: sub,
            salt: String(salt),
            wallet_address: address
        })

        // Also set address in app store (for profile page and other components)
        setAddress(address)

        sessionStorage.setItem('zklogin_jwt', token)

        return
    }

    const setUsername = async (_username: string): Promise<void> => {
        // TODO: Implement username and SuiNS integration later
        // if (!user) {
        //     throw new Error("User must be logged in to set username")
        // }

        // // Validate username format
        // const validation = validateUsername(username)
        // if (!validation.valid) {
        //     throw new Error(validation.error)
        // }

        // // Update user with username
        // setUser({
        //     ...user,
        //     username: username.toLowerCase()
        // })

        // // TODO: Create SuiNS leaf subname on-chain (requires backend)
        // // For MVP, we're just storing username locally
        // // Later: Send to backend to create username.bullz.sui on Sui blockchain
        // console.log(`Username "${username}" set for address ${user.wallet_address}`)
        // console.log(`Will create: ${username.toLowerCase()}.bullz.sui (when backend is ready)`)
        
        // Username feature disabled for now
    }

    const authenticateWithWallet = (walletAddress: string) => {
        // Set the wallet address in app store for wallet-based authentication
        setAddress(walletAddress)
    }

    return (
        <AuthContext.Provider value={{
            authenticated,
            user,
            completed_auth,
            signin,
            signout: async () => { 
                // Signout called
                
             
                setUser(null)
                setAddress(null)
                
               
                sessionStorage.removeItem('zklogin_ephemeral_key')
                sessionStorage.removeItem('zklogin_randomness')
                sessionStorage.removeItem('zklogin_max_epoch')
                sessionStorage.removeItem('zklogin_jwt')
                
              
                if (currentAccount) {
                    // Disconnecting wallet
                    disconnectWallet()
                }
                
                // Signout completed
            },
            callback,
            setUsername,
            authenticateWithWallet,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === null) {
        throw new Error("useAuth must be used under an AuthContext")
    }

    return context
}

export default useAuth