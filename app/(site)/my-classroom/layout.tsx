import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Classroom | Zazi iZandi",
};

export default function MyClassroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
