import { JSX, SVGProps } from "react";
import HomeIcon from "../icons/home.icon";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router";
import { useLocation } from "react-router";
import SharesIcon from "../icons/shares.icon";
import SquadIcon from "../icons/squad.icon";
import PortfolioIcon from "../icons/portfolio.icon";
import CrownIcon from "../icons/crown.icon";
// import { usePathname } from "next/navigation";
// import Link from "next/link";

const NavItems = [
  {
    title: "Home",
    href: "/",
    Icon: HomeIcon,
  },
  {
    title: "Shares",
    href: "/shares",
    Icon: SharesIcon,
  },
  {
    title: "Squad",
    href: "/squad",
    Icon: SquadIcon,
  },
  {
    title: "Portfolio",
    href: "/portfolio",
    Icon: PortfolioIcon,
  },
  {
    title: "Ranking",
    href: "/ranking",
    Icon: CrownIcon,
  },
];

interface NavItemProps {
  title: string;
  href: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  isActive: boolean;
}

const NavItem = (props: NavItemProps) => {
  return (
    <NavLink
      to={props.href}
      style={{
        boxShadow: props.isActive
          ? "0px -4px 0px 0px #0000003D inset, 0px 4px 0px 0px #FFFFFF29 inset"
          : "none",
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-[0.5rem] w-full h-full cursor-pointer",
        {
          "text-white bg-gray-800": props.isActive,
          "text-gray-400 background": !props.isActive,
        },
      )}
    >
      <props.Icon className="size-5" />
      <p
        className={cn(
          "text-white text-sm font-[700] tracking-[0.04em] leading-[100%] uppercase",
          {
            "text-white": props.isActive,
            "text-gray-400": !props.isActive,
          },
        )}
      >
        {props.title}
      </p>
    </NavLink>
  );
};

const NavBar = () => {
  let location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="grid grid-cols-5 border-t border-gray-600  h-[4rem] w-full max-w-[26.875rem] fixed bottom-0 bg-background">
      {NavItems.map((item) => (
        <NavItem isActive={pathname == item.href} key={item.title} {...item} />
      ))}
    </div>
  );
};

export default NavBar;
