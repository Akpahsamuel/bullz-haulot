import { SVGProps } from "react";

const QuestionIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M13 18.5H10V21.5H13V18.5Z" fill="white" />
            <path d="M17 5.5V11.5H16V12.5H15V13.5H13V15.5H10V12.5H11V11.5H13V10.5H14V6.5H10V7.5H9V8.5H7V5.5H8V4.5H9V3.5H15V4.5H16V5.5H17Z" fill="white" />
        </svg>

    )
}

export default QuestionIcon