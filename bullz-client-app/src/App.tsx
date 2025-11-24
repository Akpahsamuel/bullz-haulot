import { ConnectButton } from "@mysten/dapp-kit";
import { TokenPriceDisplay } from "./components/general/TokenPriceDisplay";

function App() {
  return (
    <>
      <div className="sticky top-0 px-4 py-2 flex justify-between border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold">dApp Starter Template</h1>
        </div>

        <div>
          <ConnectButton />
        </div>
      </div>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-6 mt-5 pt-2 px-4">
          {/* Token Prices Section */}
          <div>
            <TokenPriceDisplay />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
