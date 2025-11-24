import UserIcon from "@/components/icons/user.icon";
import Bullfy from "@/components/svg/bullfy";
import BullzTextLogo from "@/components/svg/bullz-text.logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useAuth from "@/lib/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

type Formvalue = {
    username: string
}

const OnboardPage = () => {
    const { setUsername } = useAuth()
    const navigate = useNavigate()
    const defaultValues: Formvalue = {
        username: ''
    }

    const schemaValidation = z.object({
        username: z.string({ required_error: "username is required" }).min(3, { message: "username is required" })
    }) satisfies z.ZodType<Formvalue>

    const { handleSubmit, control, formState: { errors }, } = useForm<Formvalue>({
        defaultValues,
        resolver: zodResolver(schemaValidation)
    })

    const onSubmit: SubmitHandler<Formvalue> = async (data) => {
        try {
            await setUsername(data.username)
            // Navigate to home after successful username setup
            navigate("/", { replace: true })
        } catch (error) {
            console.log(error)
        }
    }

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
                    <Dialog open={true}>
                        <DialogContent>
                            <DialogHeader className="mb-2">
                                <DialogTitle className="uppercase text-center">Enter Username</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid gap-5">
                                    <Controller
                                        name="username"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <>
                                                <div className="border border-gray-700 bg-gray-800 px-3 py-2 flex items-center gap-2">
                                                    <UserIcon />
                                                    <Input className="border-0  placeholder:uppercase placeholder:font-bold font-bold uppercase" placeholder="enter username" {...field} />
                                                </div>
                                                {errors.username ? <p className="text-sm font-bold text-red-500">{errors.username.message}</p> : ""}
                                            </>
                                        )}
                                    />
                                    <Button>Submit</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                </div>
            </div >
        </>
    );
}

export default OnboardPage