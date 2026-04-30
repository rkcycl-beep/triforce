import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ActivitiesLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
