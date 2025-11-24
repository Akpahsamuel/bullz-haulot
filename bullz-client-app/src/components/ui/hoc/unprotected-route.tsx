import useAuth from "@/lib/hooks/use-auth"
import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"

const UnProtectedRoute = () => {
    const navigate = useNavigate()
    const { authenticated } = useAuth()


    useEffect(() => {
        if (authenticated) {
            navigate("/", { replace: true })
            return
        }
    }, [authenticated])

    return <Outlet />
}

export default UnProtectedRoute