import { Sheet, SheetContent } from "../ui/sheet";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet = (props: Props) => {
  return (
    <>
      <Sheet open={props.isOpen} onOpenChange={props.onClose}>
        <SheetContent
          side="bottom"
          className="border-none  px-[2rem] py-[2rem] bg-gray-800 max-w-[27.375rem] mx-auto overflow-y-scroll"
          style={{ boxShadow: "0px 8px 0px 0px #FFFFFF29 inset" }}
        >
          {props.children}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomSheet;
