const Stat = (props: { value: string; icon: JSX.Element }) => {
  return (
    <div className="bg-gray-800 p-[0.25rem] flex items-center gap-[0.25rem] w-max">
      {props.icon}

      <span className="text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] font-offbit text-gray-200">
        {props.value}
      </span>
    </div>
  );
};

export default Stat;
