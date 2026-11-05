import type { Metadata } from "next";
import { ProfileLab } from "../../components/profile/profile-lab";
import "../../styles/profile-lab.css";
export const metadata: Metadata = {
  title: "头像与个人资料 · 隔离原型 · 今夕公会",
  robots: "noindex, nofollow",
};
export default function ProfileLabPage() {
  return (
    <div className="jinxi-site">
      <ProfileLab />
    </div>
  );
}
