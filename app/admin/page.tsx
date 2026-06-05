import { notFound } from "next/navigation";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <AdminClient />;
}
