import Bullfy from "@/components/svg/bullfy";
import BullzTextLogo from "@/components/svg/bullz-text.logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useAuth from "@/lib/hooks/use-auth";
import React, { useEffect } from "react";
import GoogleSocialIcon from "@/components/icons/google-social.icon";
import AppleSocialIcon from "@/components/icons/apple-social.icon";
import XSocialIcon from "@/components/icons/x-social.icon";
import { useSearchParams, useNavigate } from "react-router";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";

export default function LoginPage() {
  const { callback} = useAuth()
  const [open, setOpen] = React.useState(false)

  const [searchParams] = useSearchParams()
  const [openCallback] = React.useState(searchParams.get("callback") === "true" ? true : false)


  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("id_token");
    if (!token) return;
    callback(token)

  }, [openCallback])
  return (
    <>
      <div className="h-screen flex flex-col justify-center items-center ">
        <div className="flex flex-col max-w-[19.25rem] ">
          <div className="flex-1 flex flex-col items-center justify-center w-full text-center">
            <Bullfy width={"6.75rem"} height={"6.75rem"} />

            <div className="text-4xl font-offbit text-white mb-10 tracking-wider mt-[1.5rem]">
              <BullzTextLogo />
            </div>

            <p className="text-gray-300 font-[700] text-[1.375rem] whitespace-nowrap uppercase  leading-[100%] tracking-[0.04em] text-center ">
              Login to start trading
              <br />
              CRYPTO LIKE A FANTASY
              <br /> MANAGER
            </p>
          </div>

          <div className="w-full space-y-4 mt-[2.5rem]">
            <Button
              onClick={() => setOpen(true)}
              className="w-full uppercase"
              style={{ textShadow: "1px 1px 2px #661600, 0px 1px 1px #661600" }}
            >
              Login
            </Button>

            {/* <Button
              // onClick={handleSuiWalletConnect}
              variant={"secondary"}
              className="w-full"
              style={{
                textShadow: "1px 1px 2px #1A1A1AB2, 0px 1px 1px #1A1A1AB2",
              }}
            >
              CONNECT SUI WALLET
            </Button> */}
          </div>
        </div>
      </div>

      {/* <ConnectDrawer
        isOpen={connectDrawerIsOpen}
        onClose={closeConnectDrawer}
      /> */}

      {/* <NotificationModal
        isOpen={connectDrawerIsOpen}
        onClose={closeConnectDrawer}
        status={"info"}
        buttonLabel={"login"}
        title={"hello"}
        onButtonClick={()=>{}}
        description={"description"}
      /> */}
      <SelectProviderDialog open={open} setState={setOpen} />
    </>
  );
}

type Provider = {
  name: string
  icon: JSX.Element | null
  auth_action: "google" | "x" | "apple" | "wallet"
  disabled: boolean
}
const SelectProviderDialog = ({ open, setState }: { open: boolean, setState: React.Dispatch<React.SetStateAction<boolean>> }) => {
  const { signin, authenticateWithWallet } = useAuth()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const navigate = useNavigate()
  const currentAccount = useCurrentAccount()


  useEffect(() => {
    if (currentAccount && open) {
    
      authenticateWithWallet(currentAccount.address)
      setState(false)
      navigate("/")
    }
  }, [currentAccount, open, authenticateWithWallet, setState, navigate])

  const Providers: Array<Provider> = [
    {
      name: "Connect Wallet",
      icon: null,
      auth_action: "wallet",
      disabled: false
    },
    {
      name: "google",
      icon: <GoogleSocialIcon />,
      auth_action: "google",
      disabled: false
    },
    {
      name: "apple",
      icon: <AppleSocialIcon />,
      auth_action: "apple",
      disabled: true
    },
    {
      name: "(twitter)",
      icon: <XSocialIcon />,
      auth_action: "apple",
      disabled: true
    }
  ]
  return (
    <Dialog open={open} onOpenChange={(o) => setState(o)}>
      <DialogContent>
        <DialogHeader className="mb-2">
          <DialogTitle className="uppercase text-gray-300">Select account you want to login with</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {Providers.map((el, idx) => (
            <Button key={idx} className="bg-gray-700 border-gray-700 flex items-center justify-center gap-1" onClick={async () => {
              if (el.auth_action === "wallet") {
               
                if (wallets.length > 0) {
                  try {
                    await connect({ wallet: wallets[0] })
                   
                  } catch (error) {
                    console.error("Wallet connection failed:", error)
                  }
                }
              } else {
               
                const url = await signin(el.auth_action)
                window.open(url, "_top")
              }
            }} disabled={el.disabled}>
              {el.icon && <div className="grid place-content-center size-4">{el.icon}</div>}
              <span className="h-5">{el.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
