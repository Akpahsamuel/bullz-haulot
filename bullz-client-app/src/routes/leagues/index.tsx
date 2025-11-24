import NavWrapper from "@/components/layout/nav-wrapper";
import LeagueItem from "./components/league-item";
import { NavLink } from "react-router";

const LeaguesPage = () => {
  return (
    <NavWrapper>
      <main className="px-[1rem]">
        <p className="text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] font-offbit text-gray-200 mb-[1rem] pt-[1.5rem]">
          LEAGUES
        </p>
        <div className="space-y-[1px] border border-gray-800 bg-gray-800">
          <NavLink to={"43"}>
            <LeagueItem />
          </NavLink>
          <NavLink to={"43"}>
            <LeagueItem />
          </NavLink>
          <NavLink to={"43"}>
            <LeagueItem />
          </NavLink>
        </div>
      </main>
    </NavWrapper>
  );
};

export default LeaguesPage;
