import { createBrowserRouter } from "react-router-dom";
import Home from "./home";
import LoginPage from "./login";
import RootProvider from "@/components/providers/root-provider";
import SessionPage from "./session";
import LiveSessions from "./live";
import LiveSessionPage from "./live/[session_id]/page";
import { SquadPage, CreateSquadPage } from "./squad";
import EditSquadPage from "./squad/edit/[squad_id]/page";
import ProtectedRoute from "@/components/ui/hoc/protected-route";
import TeamInfoPage from "./teams/[team_id]/page";
import RankingPage from "./ranking/page";
import ProfilePage from "./profile/page";
import LeaguesPage from "./leagues";
import LeagueDetail from "./leagues/[league_id]/pages";
import Shares from "./shares";
import ShareDetail from "./shares/[share_id]";
import OnboardPage from "./onboard";
import UnProtectedRoute from "@/components/ui/hoc/unprotected-route";
import PortfolioPage from "./portfolio";
import NotificationPage from "./notifications/page";

export const router = createBrowserRouter([
  {
    Component: RootProvider,
    children: [
      {
        Component: ProtectedRoute,
        children: [
          { index: true, Component: Home },
          {
            path: "shares", children: [
              { index: true, Component: Shares },
              { path: ":id", Component: ShareDetail }
            ]
          },
          { path: "session", Component: SessionPage },
          {
            path: "live", children: [
              { index: true, Component: LiveSessions },
              { path: ":id", Component: LiveSessionPage }
            ]
          },
          {
            path: "squad", children: [
              { index: true, Component: SquadPage },
              { path: "create", Component: CreateSquadPage },
              { path: "edit/:squad_id", Component: EditSquadPage }
            ]
          },
          { path: "teams/:id", Component: TeamInfoPage },
          { path: "portfolio", Component: PortfolioPage },
          { path: "ranking", Component: RankingPage },
          { path: "profile", Component: ProfilePage },
          { path: "notifications", Component: NotificationPage },
          // { path: "components", Component: ComponentsPage },
          {
            path: "leagues", children: [
              { index: true, Component: LeaguesPage },
              { path: ":id", Component: LeagueDetail }
            ]
          },
          { path: "onboard", Component: OnboardPage }
        ]
      },
      {
        Component: UnProtectedRoute,
        children: [
          { path: "login", Component: LoginPage },
        ]
      }
    ],
  },
]);
