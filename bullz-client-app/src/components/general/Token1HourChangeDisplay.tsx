import { useToken1HourChange } from "@/common-api-services/token-price.ts/pyth-hermes";
import { formatPercentageChange } from "@/common-api-services/token-price.ts/utils";

interface Token1HourChangeDisplayProps {
  symbol: string;
}

export const Token1HourChangeDisplay: React.FC<Token1HourChangeDisplayProps> = ({ symbol }) => {
  const { data: changeData, isLoading, error } = useToken1HourChange(symbol);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (error || !changeData) {
    return <div className="text-sm text-gray-500">N/A</div>;
  }

  const formatted = formatPercentageChange(changeData.percentageChange);

  return (
    <div className={`text-sm font-medium ${formatted.colorClass}`}>
      1h: {formatted.value}
    </div>
  );
};