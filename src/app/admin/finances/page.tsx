import { redirect } from "next/navigation";

export default function AdminFinancesRedirect() {
  redirect("/admin/subscriptions");
}
