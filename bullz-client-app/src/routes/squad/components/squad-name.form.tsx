"use client";

import USDCIcon from "@/components/icons/usdc.icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";

interface SquadNameFormProps {
  onClose: () => void;
  isOpen: boolean;
  isLoading: boolean;
  formId?: string;
  submitButtonText?: string;
}

const SquadNameForm = (props: SquadNameFormProps) => {
  const form = useFormContext();
  return (
    <Dialog open={props.isOpen}>
      <DialogContent
        style={{
          boxShadow:
            "0px 3.82px 2.55px 0px #00000040, 0px -8px 0px 0px #0000003D inset, 0px 8px 0px 0px #FFFFFF3D inset",
        }}
        className="max-w-[17.5rem] bg-gray-800 rounded-none border-none w-[23.875rem] p-0 py-[2rem] px-[1.5rem] "
      >
        <div className="gap-[1rem] flex flex-col items-center">
          <div className="text-center space-y-[1rem]">
            <h2 className=" text-[1.0625rem] font-[700] tracking-[0.04em] leading-[100%] uppercase">create squad</h2>
            <div className="flex items-center gap-1 justify-center">
              <USDCIcon width={32} height={32} /> <p className=" text-[27px] font-[700] tracking-[0.04em] leading-[100%] uppercase">1</p>
            </div>
            <p className="text-gray-300 uppercase text-[1.0625rem] tracking-[0.04em] font-[700] text-center leading-[100%]">
              CREATING A squad WILL COST YOU 1 SUI.
            </p>
          </div>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Input
                    placeholder="enter name"
                    className="border-none w-full bg-gray-700 font-offbit font-[700] tracking-[0.04em] text-[1.0625rem] leading-[100%] uppercase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            form={props.formId || "create-squad-form"}
            className="h-[3rem] w-full px-[1.5rem] mb-0"
          >
            {props.isLoading ? "Loading..." : (props.submitButtonText || "Create squad")}
          </Button>
          <Button
            variant={"secondary"}
            disabled={props.isLoading}
            onClick={props.onClose}
            className="h-[3rem] w-full px-[1.5rem]"
          >
            CANCEL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SquadNameForm;
