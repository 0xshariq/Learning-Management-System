"use client";
import { useRouter } from "next/navigation";
import { VideoUpload } from "./video-upload";
import { toast } from "@/hooks/use-toast";

export default function VideoUploadWrapper({ courseId }: { courseId: string }) {
  const router = useRouter();

  // This function will be called after a successful video upload
  const handleSuccess = (videoData: {
    id: string;
    title: string;
    url: string;
    duration: string;
    captionsUrl?: string;
  }) => {
    toast({
      title: "Video uploaded!",
      description: `Video "${videoData.title}" was uploaded successfully.`,
    });
    // Optionally refresh the page or fetch new data
    router.refresh();
  };

  return <VideoUpload courseId={courseId} onSuccess={handleSuccess} />;
}