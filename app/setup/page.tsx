import { redirect } from "next/navigation";

export default function SetupHomePage() {
  redirect("/setup/blocks");
}
