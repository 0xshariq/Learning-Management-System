"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StudyMaterial {
  _id: string;
  title: string;
  description: string;
  url: string;
}

export function StudyMaterialSection({
  courseId,
  isTeacher,
}: {
  courseId: string;
  isTeacher: boolean;
}) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch study materials for the course
    fetch(`/api/courses/${courseId}/study-material/list`)
      .then((res) => res.json())
      .then((data) => setMaterials(data.materials || []));
  }, [courseId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/courses/${courseId}/study-material/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      // Refresh materials
      fetch(`/api/courses/${courseId}/study-material/list`)
        .then((res) => res.json())
        .then((data) => setMaterials(data.materials || []));
    } else {
      setError("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Study Material</h3>
      {isTeacher && (
        <div className="mb-4">
          <Label className="block mb-2 font-medium">Upload Study Material</Label>
          <Input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block"
          />
          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
      {materials.length > 0 ? (
        <div className="space-y-3">
          {materials.map((material) => (
            <div
              key={material._id}
              className="border rounded-lg p-4 flex items-center justify-between bg-muted/10"
            >
              <div>
                <h4 className="font-medium">{material.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {material.description}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                </a>
                <a href={material.url} download>
                  <Button variant="secondary" size="sm">
                    Download
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">
          No study materials yet.
        </div>
      )}
    </div>
  );
}