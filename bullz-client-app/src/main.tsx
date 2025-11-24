import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import "./fonts.css";
import "./globals.css";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { networkConfig } from "./networkConfig.ts";

import { RouterProvider } from "react-router-dom";
import { router } from "./routes/index.tsx";
import { AuthProvider } from "./lib/hooks/use-auth.tsx";

const queryClient = new QueryClient();

const getDefaultNetwork = (): "testnet" | "mainnet" => {
  const envNetwork = import.meta.env.VITE_NETWORK;
  // if (envNetwork && ["devnet", "testnet", "mainnet"].includes(envNetwork)) {
  if (envNetwork && ["testnet", "mainnet"].includes(envNetwork)) {
    return envNetwork as "testnet" | "mainnet";
  }

  if (import.meta.env.DEV) {
    return "testnet";
  } else if (import.meta.env.PROD) {
    const hostname = window.location.hostname;

    if (hostname.includes("testnet") || hostname.includes("test")) {
      return "testnet";
   
    // } else if (hostname.includes("devnet") || hostname.includes("dev")) {
    //   return "devnet";
    } else {
      return "mainnet";
    }
  }

  return "testnet";
};

const defaultNetwork = getDefaultNetwork();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
        <WalletProvider slushWallet={{ name: "bullz" }} autoConnect>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
