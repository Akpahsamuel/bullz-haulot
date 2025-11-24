import { useEffect } from "react";
import { Outlet,  useNavigate } from "react-router";
import useAuth from "@/lib/hooks/use-auth";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
// }

const ProtectedRoute = () => {
  const navigate = useNavigate()
  const { authenticated } = useAuth()
  // TODO: Re-enable username check when implementing onboarding
  // const { authenticated, completed_auth } = useAuth()

  // ProtectedRoute - authenticated check

  useEffect(() => {
    // ProtectedRoute useEffect - authenticated check
    if (!authenticated) {
      // Redirecting to login
      navigate("/login", { replace: true })
      return
    }
    // TODO: Re-enable when implementing username/onboarding
    // else if (authenticated && !completed_auth) {
    //   navigate("/onboard", { replace: true })
    //   return
    // }
  }, [authenticated, navigate])


  // const currentAccount = useCurrentAccount();
  // const { address } = useAppStore();
  // const navigate = useNavigate();

  // useEffect(() => {
  //   // If no wallet is connected and no address in store, redirect to login
  //   if (!currentAccount && !address) {
  //     navigate("/login", { replace: true });
  //   }
  // }, [currentAccount, address, navigate]);

  // // Show loading or return children if wallet is connected
  // if (!currentAccount && !address) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <p className="text-white">Checking wallet connection...</p>
  //     </div>
  //   );
  // }

  // Show loading state while authentication is being determined
  if (authenticated === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-white">Checking authentication...</p>
      </div>
    )
  }

  return <Outlet /> 
};

export default ProtectedRoute; 