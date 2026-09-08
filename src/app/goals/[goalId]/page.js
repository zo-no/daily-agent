import "../../_components/management-header.css";
import "../goals.css";
import "../goal-detail.css";
import { GoalDetailPage } from "../goal-detail-page";

export const metadata = { title: "Goal review" };

export default async function Page({ params }) {
  const { goalId } = await params;
  return <GoalDetailPage goalId={decodeURIComponent(goalId)} />;
}
