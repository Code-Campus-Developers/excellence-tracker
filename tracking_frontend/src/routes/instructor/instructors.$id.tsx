import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Mail,
  MessageSquare,
  Megaphone,
  Phone,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/PerfBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authStore";

interface CourseAssignment {
  id: string;
  track: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface AssignedStudent {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  track: string;
  avatarColor: string;
  user: { profilePicture: string | null; isActive: boolean } | null;
  _count: { evaluations: number; attendance: number; selfReports: number };
}

interface InstructorDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  track: string | null;
  profilePicture: string | null;
  isActive: boolean;
  createdAt: string;
  trackAssignments: CourseAssignment[];
  assignedCourses: string[];
  students: AssignedStudent[];
  evaluationsCompleted: number;
  _count: { sentMessages: number; receivedMessages: number; broadcasts: number };
}

export const Route = createFileRoute("/instructor/instructors/$id")({
  head: () => ({ meta: [{ title: "Instructor Details | CodeCampus Excellence Tracker" }] }),
  loader: ({ params }) => ({ id: params.id }),
  component: InstructorDetail,
});

function isCurrentAssignment(assignment: CourseAssignment) {
  const now = Date.now();
  return new Date(assignment.startDate).getTime() <= now
    && (!assignment.endDate || new Date(assignment.endDate).getTime() >= now);
}

function StatCard({ label, value, icon: Icon }: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Icon className="h-5 w-5 text-brand" />
        </div>
      </CardContent>
    </Card>
  );
}

function InstructorDetail() {
  const { id } = Route.useLoaderData();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [instructor, setInstructor] = useState<InstructorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<InstructorDetails>(`/api/instructors/${id}`)
      .then(setInstructor)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load instructor"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell>
      {isAdmin ? (
        <Link to="/admin/manage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to User Management
        </Link>
      ) : (
        <Link to="/instructor/instructors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to instructors
        </Link>
      )}

      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">Loading instructor details...</CardContent></Card>}
      {!loading && error && <Card><CardContent className="p-12 text-center text-destructive">{error}</CardContent></Card>}
      {!loading && !error && !instructor && <Card><CardContent className="p-12 text-center text-muted-foreground">Instructor not found.</CardContent></Card>}

      {instructor && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar name={instructor.name} color="#059669" size={64} photo={instructor.profilePicture} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{instructor.name}</h1>
                  <Badge className={instructor.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                    {instructor.isActive ? "Active" : "Restricted"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Instructor / Evaluator</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Added {new Date(instructor.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Courses" value={instructor.assignedCourses.length} icon={BookOpen} />
            <StatCard label="Students" value={instructor.students.length} icon={Users} />
            <StatCard label="Evaluations" value={instructor.evaluationsCompleted} icon={ClipboardCheck} />
            <StatCard label="Broadcasts" value={instructor._count.broadcasts} icon={Megaphone} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact & Account</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="break-all">{instructor.email}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div><p className="text-xs text-muted-foreground">Phone</p><p>{instructor.phone || "Not provided"}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Messages</p>
                    <p>{instructor._count.sentMessages} sent · {instructor._count.receivedMessages} received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Course Assignments</CardTitle></CardHeader>
              <CardContent className="p-0">
                {instructor.trackAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-6">
                    {instructor.track ? `${instructor.track} is set as the instructor's course.` : "No course assignments yet."}
                  </p>
                ) : (
                  <div className="divide-y">
                    {instructor.trackAssignments.map((assignment) => (
                      <div key={assignment.id} className="px-6 py-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{assignment.track}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(assignment.startDate).toLocaleDateString()} – {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : "Ongoing"}
                          </p>
                          {assignment.notes && <p className="text-xs text-muted-foreground mt-1">{assignment.notes}</p>}
                        </div>
                        <Badge variant="outline" className={isCurrentAssignment(assignment) ? "text-green-700 border-green-200 bg-green-50" : "text-muted-foreground"}>
                          {isCurrentAssignment(assignment) ? "Current" : "Past"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Students ({instructor.students.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {instructor.students.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8 px-6">No students are assigned through this instructor's courses.</p>
              )}
              {instructor.students.map((student) => (
                <Link
                  key={student.id}
                  to="/instructor/students/$id"
                  params={{ id: student.id }}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar name={student.name} color={student.avatarColor} size={40} photo={student.user?.profilePicture} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email} · {student.track}</p>
                    {student.studentCode && <p className="text-[10px] font-mono text-brand">{student.studentCode}</p>}
                  </div>
                  <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
                    <span>{student._count.evaluations} evaluations</span>
                    <span>{student._count.attendance} attendance days</span>
                    <span>{student._count.selfReports} reports</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
