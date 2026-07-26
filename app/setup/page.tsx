import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import SetupNav from "@/components/SetupNav";

export default function SetupHomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <ReturnToDashboardButton />
      <div className="hero-card space-y-5 p-6 md:p-8">
        <div>
          <div className="small-header text-black/50">Optional guide</div>
          <h1 className="section-title mt-2">Set up a new class or school year</h1>
          <p className="max-w-2xl text-sm leading-6 text-black/65">
            Use these steps when you are building a class from scratch. For everyday changes—such as adding one new
            student—open that screen directly from Command Center.
          </p>
        </div>
        <SetupNav />
      </div>
    </div>
  );
}
