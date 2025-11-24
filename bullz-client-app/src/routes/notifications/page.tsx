import ChevronLeft from "@/components/icons/chevron-right"
import { Link } from "react-router"

const NotificationPage = () => {
    return (
        <>
            <div className="grid grid-cols-3 items-center px-6 py-2 h-12">
                <Link to={"/profile"} className="size-8 flex items-center">
                    <ChevronLeft />
                </Link>
                <p className="font-offbit text-title-md uppercase font-bold text-center">Notifications</p>
            </div>
            <div className="p-6 h-[calc(100dvh-48px)] grid place-content-center">
                <div className="flex items-center justify-center flex-col gap-4">
                    <div className="size-5 bg-gray-400"></div>
                    <p className="font-offbit text-title-md uppercase font-bold text-gray-300">your notifications <br/> will show up here</p>
                </div>
            </div>
        </>
    )
}


export default NotificationPage