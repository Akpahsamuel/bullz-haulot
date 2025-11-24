import { SVGProps } from "react";

const ClockIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_8450_83000)">
        <path
          d="M14.667 5.99996V4.66663H14.0003V3.33329H13.3337V2.66663H12.667V1.99996H11.3337V1.33329H10.0003V0.666626H6.00033V1.33329H4.66699V1.99996H3.33366V2.66663H2.66699V3.33329H2.00033V4.66663H1.33366V5.99996H0.666992V9.99996H1.33366V11.3333H2.00033V12.6666H2.66699V13.3333H3.33366V14H4.66699V14.6666H6.00033V15.3333H10.0003V14.6666H11.3337V14H12.667V13.3333H13.3337V12.6666H14.0003V11.3333H14.667V9.99996H15.3337V5.99996H14.667ZM8.66699 10.6666V9.99996H8.00033V9.33329H7.33366V3.33329H8.66699V8.66663H9.33366V9.33329H10.0003V9.99996H10.667V10.6666H10.0003V11.3333H9.33366V10.6666H8.66699Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_8450_83000">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ClockIcon;
