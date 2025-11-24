import BottomSheet from "@/components/general/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const withdrawalFormSchema = z.object({
  address: z.string().min(10, "Enter a valid sui address"),
  amount: z.string().min(1, "Required"),
});
type WithdrawalFormDto = z.infer<typeof withdrawalFormSchema>;

const WithdrawalForm = (props: Props) => {
  const form = useForm<WithdrawalFormDto>({
    resolver: zodResolver(withdrawalFormSchema),
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values)
    props.onClose();
  });

  return (
    <BottomSheet isOpen={props.isOpen} onClose={props.onClose}>
      <FormProvider {...form}>
        <form onSubmit={onSubmit}>
          <div className="space-y-[1rem] flex flex-col items-center">
            <p className="font-offbit text-white text-[1.375rem] font-[700] leading-[100%] tracking-[0.04em]">
              WITHDRAW SUI
            </p>
            <p className="font-offbit uppercase text-gray-300 text-[1.0625rem] text-center font-[700] leading-[100%] tracking-[0.04em]">
              TRANSFER YOUR SUI TO AN EXTERNAL WALLET
            </p>
          </div>
          <div className="my-[1.5rem] space-y-[1.5rem]">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div>
                      <span className="text-gray-300 font-offbit font-[700] text-[1.0625rem] leading-[100%] tracking-[0.04em] ">
                        ENTER AMOUNT
                      </span>
                      <Input
                        placeholder="ENTER AMOUNT"
                        className="border-none w-full bg-gray-700 font-offbit font-[700] tracking-[0.04em] text-[1.0625rem] leading-[100%] uppercase"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div>
                      <span className="text-gray-300 font-offbit font-[700] text-[1.0625rem] leading-[100%] tracking-[0.04em] ">
                        RECIPIENT ADDRESS
                      </span>
                      <Input
                        placeholder="ENTER ADDRESS"
                        className="border-none w-full bg-gray-700 font-offbit font-[700] tracking-[0.04em] text-[1.0625rem] leading-[100%] uppercase"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-6">
            <Button type="submit" className="">
              SEND USDC
            </Button>
            <Button type="button" className=" bg-gray-700 border-gray-700">
              CLOSE
            </Button>
          </div>
        </form>
      </FormProvider>
    </BottomSheet>
  );
};

export default WithdrawalForm;
